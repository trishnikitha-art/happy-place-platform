/**
 * Workbench Media Authority Audit API
 *
 * Audits KV media authority records to identify failing records.
 * Returns classification of records by type and failure reason.
 *
 * POST /api/workbench/media-audit
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw, verifyPublicMediaAuthority } from '@/lib/media-kv-store';
import { loadMediaManifest } from '@/lib/media';
import { getBlobMetadataByContentHash, verifyBlobHash } from '@/lib/blob-storage';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Require Workbench authentication for security
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { 
        error: 'WORKBENCH_AUTH_REQUIRED',
        message: 'Workbench authentication required',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'auditPublicGate') {
      console.log('[MEDIA_AUDIT] Starting public media gate audit');
      
      // Load static manifest for evidence-based classification
      const manifest = loadMediaManifest();
      const staticMediaMap = new Map(manifest.media.map(m => [m.id, m]));
      
      const mediaIds = await listMediaIds();
      const results = {
        totalRecords: mediaIds.length,
        validPublished: 0,
        sourceReferences: 0,
        materializing: 0,
        stale: 0,
        malformedPublished: 0,
        missingStorage: 0,
        missingStorageIds: [] as string[], // All records missing storage
        repairableStatic: 0,
        repairableStaticIds: [] as string[], // Can be repaired to static with manifest evidence
        repairableBlob: 0,
        repairableBlobIds: [] as string[], // Can be repaired to blob with full evidence
        requiresMaterialization: 0,
        requiresMaterializationIds: [] as string[], // Drive records need materialization
        ambiguous: 0,
        ambiguousIds: [] as string[], // Insufficient evidence, manual review
        unknown: 0,
        sampleRecords: [] as any[],
      };
      
      for (const mediaId of mediaIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) {
          continue;
        }
        
        // P0 FIX: Classify by lifecycle state and characteristics
        if (media.lifecycleState === 'source_reference') {
          // Legitimate DriveReference - should fail public gate by design
          results.sourceReferences++;
        } else if (media.lifecycleState === 'materializing') {
          // Intermediate materialization state
          results.materializing++;
        } else if (media.lifecycleState === 'stale') {
          // Stale record requiring refresh
          results.stale++;
        } else if (media.lifecycleState === 'published') {
          // Check if published asset is actually valid
          const hasPublicAuthority = await verifyPublicMediaAuthority(media);
          if (hasPublicAuthority) {
            results.validPublished++;
          } else {
            // Published asset that fails public gate - classify specific failure
            if (!media.storage) {
              results.missingStorage++;
              results.missingStorageIds.push(media.id);
              
              // P0 FIX: Classify missing storage into actionable categories
              // First check source type to determine correct repair path
              if (media.source === 'google-drive') {
                // P0 FIX: Drive source without storage → requires materialization, NOT storage repair
                // Do NOT infer blob from Drive provenance
                results.requiresMaterialization++;
                results.requiresMaterializationIds.push(mediaId);
              } else if (media.source === 'local') {
                // Local source - check for static manifest evidence
                if (!media.contentHash) {
                  // No contentHash → cannot be blob-backed
                  if (staticMediaMap.has(mediaId)) {
                    // Has static manifest evidence → repairable to static
                    results.repairableStatic++;
                    results.repairableStaticIds.push(mediaId);
                  } else {
                    // No static manifest evidence → ambiguous
                    results.ambiguous++;
                    results.ambiguousIds.push(mediaId);
                  }
                } else {
                  // Has contentHash - check for Blob evidence
                  try {
                    const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
                    if (blobMetadata) {
                      const originalUrl = media.variants?.original || '';
                      if (originalUrl === blobMetadata.url) {
                        const verification = await verifyBlobHash(blobMetadata.url, media.contentHash);
                        if (verification.success) {
                          // Full Blob evidence chain → repairable to blob
                          results.repairableBlob++;
                          results.repairableBlobIds.push(mediaId);
                        } else {
                          // Hash verification failed → ambiguous
                          results.ambiguous++;
                          results.ambiguousIds.push(mediaId);
                        }
                      } else {
                        // URL mismatch → ambiguous
                        results.ambiguous++;
                        results.ambiguousIds.push(mediaId);
                      }
                    } else {
                      // No Blob metadata → ambiguous
                      results.ambiguous++;
                      results.ambiguousIds.push(mediaId);
                    }
                  } catch (error) {
                    console.error('[MEDIA_AUDIT] Blob verification failed:', { mediaId, error });
                    results.ambiguous++;
                    results.ambiguousIds.push(mediaId);
                  }
                }
              } else {
                // Unknown source → ambiguous
                results.ambiguous++;
                results.ambiguousIds.push(mediaId);
              }
            } else if (media.storage === 'blob' && !media.contentHash) {
              // Blob storage without content hash indicates incomplete materialization
              results.malformedPublished++;
            } else {
              results.malformedPublished++;
            }
          }
        } else {
          // Unknown lifecycle state
          results.unknown++;
        }
        
        // Collect sample records (first 10)
        if (results.sampleRecords.length < 10) {
          results.sampleRecords.push({
            id: media.id,
            filename: media.filename,
            source: media.source,
            lifecycleState: media.lifecycleState,
            storage: media.storage,
            contentHash: media.contentHash,
          });
        }
      }
      
      console.log('[MEDIA_AUDIT] Audit complete:', {
        totalRecords: results.totalRecords,
        validPublished: results.validPublished,
        sourceReferences: results.sourceReferences,
        materializing: results.materializing,
        stale: results.stale,
        malformedPublished: results.malformedPublished,
        missingStorage: results.missingStorage,
        repairableStatic: results.repairableStatic,
        repairableBlob: results.repairableBlob,
        requiresMaterialization: results.requiresMaterialization,
        ambiguous: results.ambiguous,
      });
      
      return NextResponse.json({
        audit: results,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MEDIA_AUDIT] Error:', error);
    return NextResponse.json(
      { 
        error: 'Media audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
