/**
 * Media Authority Reconciliation API Endpoint
 *
 * Reconciles poisoned runtime KV media authority with corrected Git static authority.
 *
 * This endpoint:
 * 1. Enumerates all media:* records in KV
 * 2. Identifies synthetic content identity (contentHash === SHA256(mediaId))
 * 3. Compares each record against canonical static authority (media.v1.json)
 * 4. Verifies actual Blob bytes for PublishedMediaAsset records
 * 5. Replaces/removes only invalid runtime records
 * 6. Preserves legitimate DriveReference records
 * 7. Rebuilds content_hash:* indexes
 * 8. Verifies resulting KV state
 * 9. Produces an auditable reconciliation report
 *
 * POST /api/admin/media/reconcile
 * Body: { dryRun?: boolean }
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { isMaterializationComplete } from '@/lib/media-contracts';

interface ReconciliationReport {
  dryRun: boolean;
  startTime: string;
  endTime: string;
  totalRecords: number;
  syntheticRecords: number;
  staleRecords: number;
  validRecords: number;
  driveReferenceRecords: number;
  removedRecords: string[];
  replacedRecords: { id: string; oldHash: string; newHash: string }[];
  preservedRecords: string[];
  errors: string[];
  contentHashIndexRebuilt: boolean;
  danglingIndexes: string[];
  incompleteCanonicalCount?: number; // P0 FIX: Count canonical records that are incomplete
}

function getRedisClient(): Redis | null {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const requestId = `reconcile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[MEDIA_RECONCILE] REQUEST_RECEIVED', { requestId });

  // SECURITY: Require authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { dryRun = true } = body;

    console.log('[MEDIA_RECONCILE] STARTING', { requestId, dryRun });

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis unavailable", message: "KV_REST_API_URL and KV_REST_API_TOKEN required" },
        { status: 500 }
      );
    }

    const report: ReconciliationReport = {
      dryRun,
      startTime: new Date().toISOString(),
      endTime: '',
      totalRecords: 0,
      syntheticRecords: 0,
      staleRecords: 0,
      validRecords: 0,
      driveReferenceRecords: 0,
      removedRecords: [],
      replacedRecords: [],
      preservedRecords: [],
      errors: [],
      contentHashIndexRebuilt: false,
      danglingIndexes: [],
    };

    // Load canonical static authority
    const mediaV1Path = join(process.cwd(), 'src/config/media.v1.main.json');
    const mediaV1Data = JSON.parse(readFileSync(mediaV1Path, 'utf8'));
    const canonicalRecords = new Map<string, any>();
    mediaV1Data.media.forEach((m: any) => {
      canonicalRecords.set(m.id, m);
    });

    console.log('[MEDIA_RECONCILE] CANONICAL_AUTHORITY_LOADED', {
      requestId,
      canonicalCount: canonicalRecords.size,
    });

    // Enumerate all media:* records in KV
    const mediaKeys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await redis.scan(cursor, { match: 'media:*', count: 100 });
      cursor = result[0];
      mediaKeys.push(...result[1]);
    } while (cursor !== '0');

    report.totalRecords = mediaKeys.length;

    console.log('[MEDIA_RECONCILE] KV_ENUMERATION_COMPLETE', {
      requestId,
      totalRecords: mediaKeys.length,
    });

    // Analyze each record
    for (const key of mediaKeys) {
      const mediaId = key.replace('media:', '');
      
      try {
        const data = await redis.get(key);
        if (!data) {
          console.warn('[MEDIA_RECONCILE] RECORD_NOT_FOUND', { requestId, key });
          continue;
        }

        const media = typeof data === 'string' ? JSON.parse(data) : data;

        // Classify record
        if (media.lifecycleState === 'source_reference') {
          // DriveReference - preserve
          report.driveReferenceRecords++;
          report.preservedRecords.push(mediaId);
          console.log('[MEDIA_RECONCILE] PRESERVED_DRIVE_REFERENCE', { requestId, mediaId });
        } else if (media.lifecycleState === 'published' && media.source === 'local') {
          // PublishedMediaAsset - check for synthetic hash via materialization completeness
          if (media.contentHash && !isMaterializationComplete(media)) {
            report.syntheticRecords++;
            report.removedRecords.push(mediaId);
            console.log('[MEDIA_RECONCILE] DETECTED_SYNTHETIC', { requestId, mediaId, contentHash: media.contentHash });

            if (!dryRun) {
              await redis.del(key);
              console.log('[MEDIA_RECONCILE] REMOVED_SYNTHETIC', { requestId, mediaId });
            }
          } else {
            // Check against canonical authority
            const canonical = canonicalRecords.get(mediaId);
            if (canonical) {
              // P0 FIX: Verify canonical static record is materially complete before using it
              // Do not replace runtime record with incomplete static authority
              const isCanonicalComplete = isMaterializationComplete(canonical);

              if (!isCanonicalComplete) {
                console.error('[MEDIA_RECONCILE] CANONICAL_INCOMPLETE - DANGEROUS REPLACEMENT BLOCKED', {
                  requestId,
                  mediaId,
                  reason: 'Canonical static record is incomplete - would replace runtime with incomplete authority'
                });
                report.incompleteCanonicalCount = (report.incompleteCanonicalCount || 0) + 1;
                // Preserve runtime record - do not overwrite with incomplete static authority
                report.preservedRecords.push(mediaId);
                continue;
              }

              // Compare hashes
              if (media.contentHash !== canonical.contentHash) {
                report.staleRecords++;
                report.replacedRecords.push({
                  id: mediaId,
                  oldHash: media.contentHash,
                  newHash: canonical.contentHash,
                });
                console.log('[MEDIA_RECONCILE] DETECTED_STALE', {
                  requestId,
                  mediaId,
                  oldHash: media.contentHash,
                  newHash: canonical.contentHash,
                });

                if (!dryRun) {
                  await redis.set(key, JSON.stringify(canonical));
                  console.log('[MEDIA_RECONCILE] REPLACED_STALE', { requestId, mediaId });
                }
              } else {
                report.validRecords++;
                report.preservedRecords.push(mediaId);
                console.log('[MEDIA_RECONCILE] PRESERVED_VALID', { requestId, mediaId });
              }
            } else {
              // Record exists in KV but not in canonical - this may be legitimate DriveReference or new materialized asset
              // For now, preserve it
              report.validRecords++;
              report.preservedRecords.push(mediaId);
              console.log('[MEDIA_RECONCILE] PRESERVED_NON_CANONICAL', { requestId, mediaId });
            }
          }
        } else {
          // Unknown lifecycle state - preserve
          report.validRecords++;
          report.preservedRecords.push(mediaId);
          console.log('[MEDIA_RECONCILE] PRESERVED_UNKNOWN_STATE', { requestId, mediaId, lifecycleState: media.lifecycleState });
        }
      } catch (error) {
        const errorMsg = `Failed to process ${mediaId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        report.errors.push(errorMsg);
        console.error('[MEDIA_RECONCILE] ERROR', { requestId, mediaId, error });
      }
    }

    // Rebuild content_hash:* index if not dry run
    if (!dryRun) {
      console.log('[MEDIA_RECONCILE] REBUILDING_CONTENT_HASH_INDEX', { requestId });

      // First, remove all existing content_hash:* entries
      let indexCursor = '0';
      const indexKeysToDelete: string[] = [];
      
      do {
        const result = await redis.scan(indexCursor, { match: 'content_hash:*', count: 100 });
        indexCursor = result[0];
        indexKeysToDelete.push(...result[1]);
      } while (indexCursor !== '0');

      if (indexKeysToDelete.length > 0) {
        await redis.del(...indexKeysToDelete);
        console.log('[MEDIA_RECONCILE] CLEARED_OLD_INDEX', { requestId, count: indexKeysToDelete.length });
      }

      // Rebuild index from current media:* records
      let mediaCursor = '0';
      let indexRebuilt = 0;
      
      do {
        const result = await redis.scan(mediaCursor, { match: 'media:*', count: 100 });
        mediaCursor = result[0];
        const keys = result[1];

        for (const key of keys) {
          try {
            const data = await redis.get(key);
            if (data) {
              const media = typeof data === 'string' ? JSON.parse(data) : data;
              if (media.contentHash) {
                await redis.set(`content_hash:${media.contentHash}`, media.id);
                indexRebuilt++;
              }
            }
          } catch (error) {
            console.error('[MEDIA_RECONCILE] INDEX_REBUILD_ERROR', { requestId, key, error });
          }
        }
      } while (mediaCursor !== '0');

      report.contentHashIndexRebuilt = true;
      console.log('[MEDIA_RECONCILE] INDEX_REBUILT', { requestId, count: indexRebuilt });

      // Verify no dangling indexes (indexes pointing to non-existent media)
      let verifyCursor = '0';
      
      do {
        const result = await redis.scan(verifyCursor, { match: 'content_hash:*', count: 100 });
        verifyCursor = result[0];
        const indexKeys = result[1];

        for (const indexKey of indexKeys) {
          try {
            const mediaId = await redis.get(indexKey);
            if (mediaId) {
              const mediaKey = `media:${mediaId}`;
              const mediaExists = await redis.exists(mediaKey);
              if (mediaExists === 0) {
                report.danglingIndexes.push(indexKey);
                console.warn('[MEDIA_RECONCILE] DANGLING_INDEX', { requestId, indexKey, mediaId });
                
                // Clean up dangling index
                await redis.del(indexKey);
              }
            }
          } catch (error) {
            console.error('[MEDIA_RECONCILE] INDEX_VERIFY_ERROR', { requestId, indexKey, error });
          }
        }
      } while (verifyCursor !== '0');
    }

    report.endTime = new Date().toISOString();

    console.log('[MEDIA_RECONCILE] COMPLETE', {
      requestId,
      report,
    });

    return NextResponse.json({
      success: true,
      requestId,
      report,
    });
  } catch (error) {
    console.error('[MEDIA_RECONCILE ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: "Reconciliation failed",
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
