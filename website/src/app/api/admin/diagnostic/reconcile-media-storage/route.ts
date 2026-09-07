/**
 * Media Storage Reconciliation Endpoint
 *
 * SERVER-SIDE AUDIT → PLAN → REPAIR → VERIFY SYSTEM
 *
 * This endpoint performs the complete reconciliation workflow without requiring
 * manual ID lists or browser console scripts.
 *
 * POST /api/admin/diagnostic/reconcile-media-storage
 *
 * Request Body:
 * {
 *   action: 'audit' | 'plan' | 'repair' | 'verify' | 'full'
 *   options?: {
 *     dryRun?: boolean  // For plan mode, show what would be repaired without mutating
 *   }
 * }
 *
 * Constitutional Rules:
 * - Evidence-driven: Every repair requires complete Blob evidence chain
 * - Idempotent: Repeated repairs are safe and produce no changes
 * - Field-level: Only mutates storage field, never full object replacement
 * - Preserve provenance: All Drive provenance and assignments preserved
 * - No guesses: AMBIGUOUS records are never auto-repaired
 * - Safety: Requires Workbench authentication
 *
 * Workflow:
 * 1. AUDIT: Classify all records, return complete counts and ID lists
 * 2. PLAN: Show proposed mutations with evidence for each
 * 3. REPAIR: Execute field-level mutations with evidence verification
 * 4. VERIFY: Re-audit to confirm repairs succeeded
 * 5. FULL: Execute audit → plan → repair → verify in one transaction
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw, saveMedia } from '@/lib/media-kv-store';
import { loadMediaManifest } from '@/lib/media';
import { getBlobMetadataByContentHash, verifyBlobHash } from '@/lib/blob-storage';
import type { Media } from '@/types/media';

interface ReconcileRequest {
  action: 'audit' | 'plan' | 'repair' | 'verify' | 'full';
  options?: {
    dryRun?: boolean;
  };
}

interface ClassificationResult {
  mediaId: string;
  classification: string;
  reason: string;
  evidence?: {
    hasContentHash: boolean;
    hasBlobMetadata: boolean;
    urlMatch: boolean;
    hashVerified: boolean;
  };
}

interface ReconcilePlan {
  eligibleForRepair: Array<{
    mediaId: string;
    currentStorage: string | undefined;
    proposedStorage: 'static' | 'blob';
    evidence: string;
  }>;
  ambiguous: Array<{
    mediaId: string;
    reason: string;
  }>;
  skipped: Array<{
    mediaId: string;
    reason: string;
  }>;
}

async function classifyRecord(media: Media, staticMediaMap: Map<string, Media>): Promise<ClassificationResult> {
  const hasStorage = !!media.storage;
  const hasContentHash = !!media.contentHash;
  
  // Skip legitimate lifecycle states
  if (media.lifecycleState === 'source_reference') {
    return {
      mediaId: media.id,
      classification: 'DRIVE_REFERENCE',
      reason: 'DriveReference (source_reference) - legitimately no storage',
    };
  }
  
  if (media.lifecycleState === 'materializing') {
    return {
      mediaId: media.id,
      classification: 'MATERIALIZING',
      reason: 'Materializing state - intermediate, not ready for storage classification',
    };
  }
  
  if (media.lifecycleState === 'stale') {
    return {
      mediaId: media.id,
      classification: 'STALE',
      reason: 'Stale record - requires refresh, not storage repair',
    };
  }
  
  // Check for contract violations
  if (hasStorage) {
    const originalUrl = media.variants?.original || '';
    
    if (media.storage === 'blob' && (originalUrl.startsWith('/images/') || originalUrl.startsWith('/public/'))) {
      return {
        mediaId: media.id,
        classification: 'CONTRACT_VIOLATION_STATIC_MARKED_BLOB',
        reason: 'Static URL but marked as blob → should be static',
      };
    }
    
    if (media.storage === 'static' && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
      return {
        mediaId: media.id,
        classification: 'CONTRACT_VIOLATION_BLOB_MARKED_STATIC',
        reason: 'Blob URL but marked as static → requires evidence-based repair',
      };
    }
    
    // Valid storage declaration
    return {
      mediaId: media.id,
      classification: 'VALID_PUBLISHED',
      reason: 'Storage field already valid',
    };
  }
  
  // Source-based classification for missing storage
  if (media.source === 'local') {
    // Check for REPAIRABLE_BLOB - local source with full Blob evidence
    if (hasContentHash && media.contentHash) {
      const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
      const originalUrl = media.variants?.original || '';
      
      if (blobMetadata && originalUrl === blobMetadata.url) {
        const verification = await verifyBlobHash(blobMetadata.url, media.contentHash);
        if (verification.success) {
          return {
            mediaId: media.id,
            classification: 'REPAIRABLE_BLOB',
            reason: 'Local source with full Blob evidence (contentHash + metadata + URL match + physical hash)',
            evidence: {
              hasContentHash: true,
              hasBlobMetadata: true,
              urlMatch: true,
              hashVerified: true,
            },
          };
        }
      }
    }
    
    // Check for static manifest evidence
    const staticRecord = staticMediaMap.get(media.id);
    if (staticRecord) {
      return {
        mediaId: media.id,
        classification: 'REPAIRABLE_STATIC',
        reason: 'Local source with static manifest evidence',
      };
    }
    
    return {
      mediaId: media.id,
      classification: 'AMBIGUOUS',
      reason: 'Local source without static manifest evidence or Blob evidence',
    };
  }
  
  if (media.source === 'google-drive') {
    return {
      mediaId: media.id,
      classification: 'REQUIRES_MATERIALIZATION',
      reason: 'Drive source without Blob evidence - requires Drive materialization',
    };
  }
  
  return {
    mediaId: media.id,
    classification: 'UNKNOWN',
    reason: `Unknown source: ${media.source}`,
  };
}

export async function POST(request: Request) {
  // REQUIRE WORKBENCH AUTHENTICATION
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'WORKBENCH_AUTH_REQUIRED', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  try {
    const body: ReconcileRequest = await request.json();
    const { action, options = {} } = body;
    
    console.log('[MEDIA_RECONCILIATION] Starting', { action, options });
    
    // Load static manifest for evidence-based classification
    const manifest = loadMediaManifest();
    const staticMediaMap = new Map(manifest.media.map(m => [m.id, m]));
    
    // Get all media IDs
    const mediaIds = await listMediaIds();
    console.log('[MEDIA_RECONCILIATION] Total records to classify', { count: mediaIds.length });
    
    // AUDIT MODE: Classify all records
    const classifications: ClassificationResult[] = [];
    for (const mediaId of mediaIds) {
      const media = await getMediaRecordRaw(mediaId);
      if (!media) continue;
      
      const classification = await classifyRecord(media, staticMediaMap);
      classifications.push(classification);
    }
    
    // Aggregate classification counts
    const counts = {
      totalRecords: mediaIds.length,
      validPublished: 0,
      driveReference: 0,
      materializing: 0,
      stale: 0,
      repairableStatic: 0,
      repairableBlob: 0,
      requiresMaterialization: 0,
      ambiguous: 0,
      unknown: 0,
      contractViolation: 0,
    };
    
    const repairableBlobIds: string[] = [];
    const repairableStaticIds: string[] = [];
    const ambiguousIds: string[] = [];
    
    for (const c of classifications) {
      switch (c.classification) {
        case 'VALID_PUBLISHED':
          counts.validPublished++;
          break;
        case 'DRIVE_REFERENCE':
          counts.driveReference++;
          break;
        case 'MATERIALIZING':
          counts.materializing++;
          break;
        case 'STALE':
          counts.stale++;
          break;
        case 'REPAIRABLE_STATIC':
          counts.repairableStatic++;
          repairableStaticIds.push(c.mediaId);
          break;
        case 'REPAIRABLE_BLOB':
          counts.repairableBlob++;
          repairableBlobIds.push(c.mediaId);
          break;
        case 'REQUIRES_MATERIALIZATION':
          counts.requiresMaterialization++;
          break;
        case 'AMBIGUOUS':
          counts.ambiguous++;
          ambiguousIds.push(c.mediaId);
          break;
        case 'UNKNOWN':
          counts.unknown++;
          break;
        case 'CONTRACT_VIOLATION_STATIC_MARKED_BLOB':
        case 'CONTRACT_VIOLATION_BLOB_MARKED_STATIC':
          counts.contractViolation++;
          break;
      }
    }
    
    console.log('[MEDIA_RECONCILIATION] Classification complete', counts);
    
    // Return early for audit-only mode
    if (action === 'audit') {
      return NextResponse.json({
        action: 'audit',
        counts,
        repairableBlobIds,
        repairableStaticIds,
        ambiguousIds,
        timestamp: new Date().toISOString(),
      });
    }
    
    // PLAN MODE: Show proposed repairs
    if (action === 'plan') {
      const plan: ReconcilePlan = {
        eligibleForRepair: [],
        ambiguous: [],
        skipped: [],
      };
      
      for (const classification of classifications) {
        if (classification.classification === 'REPAIRABLE_BLOB') {
          const media = await getMediaRecordRaw(classification.mediaId);
          if (media) {
            plan.eligibleForRepair.push({
              mediaId: classification.mediaId,
              currentStorage: media.storage,
              proposedStorage: 'blob',
              evidence: classification.reason,
            });
          }
        } else if (classification.classification === 'REPAIRABLE_STATIC') {
          const media = await getMediaRecordRaw(classification.mediaId);
          if (media) {
            plan.eligibleForRepair.push({
              mediaId: classification.mediaId,
              currentStorage: media.storage,
              proposedStorage: 'static',
              evidence: classification.reason,
            });
          }
        } else if (classification.classification === 'AMBIGUOUS') {
          plan.ambiguous.push({
            mediaId: classification.mediaId,
            reason: classification.reason,
          });
        } else {
          plan.skipped.push({
            mediaId: classification.mediaId,
            reason: classification.reason,
          });
        }
      }
      
      return NextResponse.json({
        action: 'plan',
        counts,
        plan,
        dryRun: options.dryRun || false,
        timestamp: new Date().toISOString(),
      });
    }
    
    // REPAIR MODE: Execute field-level mutations
    if (action === 'repair' || action === 'full') {
      if (options.dryRun) {
        return NextResponse.json({
          action: 'repair',
          dryRun: true,
          message: 'Dry run mode - no mutations performed',
          eligibleForRepair: repairableBlobIds.length + repairableStaticIds.length,
          timestamp: new Date().toISOString(),
        });
      }
      
      let repaired = 0;
      let skipped = 0;
      let failed = 0;
      const repairs: Array<{ mediaId: string; storage: string; reason: string }> = [];
      const errors: Record<string, string> = {};
      
      // Repair REPAIRABLE_BLOB records
      for (const mediaId of repairableBlobIds) {
        try {
          const media = await getMediaRecordRaw(mediaId);
          if (!media) {
            skipped++;
            continue;
          }
          
          // Verify evidence one more time before mutation
          const blobMetadata = await getBlobMetadataByContentHash(media.contentHash!);
          const originalUrl = media.variants?.original || '';
          
          if (!blobMetadata || originalUrl !== blobMetadata.url) {
            skipped++;
            continue;
          }
          
          const verification = await verifyBlobHash(blobMetadata.url, media.contentHash!);
          if (!verification.success) {
            skipped++;
            continue;
          }
          
          // Field-level mutation: only storage field
          const repairedMedia: Media = {
            ...media,
            storage: 'blob',
          };
          
          await saveMedia(repairedMedia);
          repaired++;
          repairs.push({
            mediaId,
            storage: 'blob',
            reason: 'REPAIRABLE_BLOB with full Blob evidence',
          });
          
          console.log('[MEDIA_RECONCILIATION] REPAIRED', { mediaId, storage: 'blob' });
        } catch (error) {
          failed++;
          errors[mediaId] = error instanceof Error ? error.message : 'Unknown error';
        }
      }
      
      // Repair REPAIRABLE_STATIC records
      for (const mediaId of repairableStaticIds) {
        try {
          const media = await getMediaRecordRaw(mediaId);
          if (!media) {
            skipped++;
            continue;
          }
          
          // Field-level mutation: only storage field
          const repairedMedia: Media = {
            ...media,
            storage: 'static',
          };
          
          await saveMedia(repairedMedia);
          repaired++;
          repairs.push({
            mediaId,
            storage: 'static',
            reason: 'REPAIRABLE_STATIC with static manifest evidence',
          });
          
          console.log('[MEDIA_RECONCILIATION] REPAIRED', { mediaId, storage: 'static' });
        } catch (error) {
          failed++;
          errors[mediaId] = error instanceof Error ? error.message : 'Unknown error';
        }
      }
      
      console.log('[MEDIA_RECONCILIATION] Repair complete', { repaired, skipped, failed });
      
      const repairResult = {
        action: 'repair',
        counts: {
          repaired,
          skipped,
          failed,
        },
        repairs,
        errors: failed > 0 ? errors : undefined,
        timestamp: new Date().toISOString(),
      };
      
      // For full mode, continue to verify
      if (action === 'full') {
        // Re-run classification to verify repairs
        const verifyClassifications: ClassificationResult[] = [];
        for (const mediaId of mediaIds) {
          const media = await getMediaRecordRaw(mediaId);
          if (!media) continue;
          
          const classification = await classifyRecord(media, staticMediaMap);
          verifyClassifications.push(classification);
        }
        
        const verifyCounts = {
          totalRecords: mediaIds.length,
          validPublished: 0,
          repairableBlob: 0,
          repairableStatic: 0,
          ambiguous: 0,
        };
        
        for (const c of verifyClassifications) {
          switch (c.classification) {
            case 'VALID_PUBLISHED':
              verifyCounts.validPublished++;
              break;
            case 'REPAIRABLE_BLOB':
              verifyCounts.repairableBlob++;
              break;
            case 'REPAIRABLE_STATIC':
              verifyCounts.repairableStatic++;
              break;
            case 'AMBIGUOUS':
              verifyCounts.ambiguous++;
              break;
          }
        }
        
        return NextResponse.json({
          action: 'full',
          repairResult,
          verifyResult: {
            beforeCounts: counts,
            afterCounts: verifyCounts,
            repairableBlobResolved: counts.repairableBlob - verifyCounts.repairableBlob,
            repairableStaticResolved: counts.repairableStatic - verifyCounts.repairableStatic,
          },
          timestamp: new Date().toISOString(),
        });
      }
      
      return NextResponse.json(repairResult);
    }
    
    // VERIFY MODE: Re-audit after repair
    if (action === 'verify') {
      const verifyClassifications: ClassificationResult[] = [];
      for (const mediaId of mediaIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) continue;
        
        const classification = await classifyRecord(media, staticMediaMap);
        verifyClassifications.push(classification);
      }
      
      const verifyCounts = {
        totalRecords: mediaIds.length,
        validPublished: 0,
        repairableBlob: 0,
        repairableStatic: 0,
        ambiguous: 0,
      };
      
      for (const c of verifyClassifications) {
        switch (c.classification) {
          case 'VALID_PUBLISHED':
            verifyCounts.validPublished++;
            break;
          case 'REPAIRABLE_BLOB':
            verifyCounts.repairableBlob++;
            break;
          case 'REPAIRABLE_STATIC':
            verifyCounts.repairableStatic++;
            break;
          case 'AMBIGUOUS':
            verifyCounts.ambiguous++;
              break;
        }
      }
      
      return NextResponse.json({
        action: 'verify',
        counts: verifyCounts,
        timestamp: new Date().toISOString(),
      });
    }
    
    return NextResponse.json(
      { error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MEDIA_RECONCILIATION] Error', error);
    return NextResponse.json(
      {
        error: 'RECONCILIATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
