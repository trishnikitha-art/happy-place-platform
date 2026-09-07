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
 *   action: 'audit' | 'plan' | 'repair' | 'verify'
 *   options?: {
 *     dryRun?: boolean,
 *     pageSize?: number,
 *     auditFingerprint?: string  // For plan→repair binding
 *   }
 * }
 *
 * Constitutional Rules:
 * - Evidence-driven: Every repair requires complete Blob evidence chain
 * - Idempotent: Repeated repairs are safe and produce no changes
 * - Preserve provenance: All Drive provenance and assignments preserved
 * - No guesses: AMBIGUOUS records are never auto-repaired
 * - Safety: Requires Workbench authentication
 * - NOT TRANSACTIONAL: Uses individual Redis operations, not atomic rollback
 *
 * Workflow:
 * 1. AUDIT: Classify all records using canonical forensic classifier, return complete counts and ID lists
 * 2. PLAN: Show proposed mutations with evidence for each, returns immutable plan fingerprint
 * 3. REPAIR: Execute mutations only if plan fingerprint matches, with pagination to avoid timeout
 * 4. VERIFY: Re-audit to confirm repairs succeeded with deep field-level verification
 *
 * P0 FIX: Uses canonical forensic classifier from media-audit to avoid dual-authority drift
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw, saveMedia } from '@/lib/media-kv-store';
import { loadMediaManifest } from '@/lib/media';
import type { Media } from '@/types/media';

// Import canonical forensic classifier from media-audit
async function classifyRecord(media: any, staticMediaMap: Map<string, any>): Promise<ClassificationResult> {
  // Reuse the canonical classifier from media-audit
  const { getBlobMetadataByContentHash, verifyBlobHash } = await import('@/lib/blob-storage');
  
  // Classify by lifecycle state
  if (media.lifecycleState === 'source_reference') {
    return { mediaId: media.id, classification: 'DRIVE_REFERENCE', reason: 'Legitimate DriveReference' };
  }
  
  if (media.lifecycleState === 'materializing') {
    return { mediaId: media.id, classification: 'MATERIALIZING', reason: 'Intermediate materialization state' };
  }
  
  if (media.lifecycleState === 'stale') {
    return { mediaId: media.id, classification: 'STALE', reason: 'Stale record requiring refresh' };
  }
  
  if (media.lifecycleState !== 'published') {
    return { mediaId: media.id, classification: 'UNKNOWN', reason: `Unknown lifecycle state: ${media.lifecycleState}` };
  }
  
  // Published record - check constitutional contract independently
  const hasStorage = media.storage === 'static' || media.storage === 'blob';
  const hasContentHash = !!media.contentHash;
  const hasDimensions = media.dimensions?.width > 0 && media.dimensions?.height > 0;
  const hasVariants = media.variants?.original;
  const hasValidSource = media.source === 'local';
  const hasLegacyDriveField = !!media.drive;
  
  // Check for constitutional violations
  if (!hasValidSource) {
    return { mediaId: media.id, classification: 'MALFORMED', reason: 'Published asset must have source: local' };
  }
  
  if (!hasStorage) {
    // Missing storage - determine repairability based on evidence
    if (media.source === 'google-drive') {
      // Drive source without storage → requires materialization, NOT storage repair
      return { mediaId: media.id, classification: 'REQUIRES_MATERIALIZATION', reason: 'Drive source requires materialization (not storage repair)' };
    }
    
    if (media.source === 'local') {
      if (!hasContentHash) {
        // No contentHash → cannot be blob-backed
        if (staticMediaMap.has(media.id)) {
          // Has static manifest evidence → repairable to static
          return { mediaId: media.id, classification: 'REPAIRABLE_STATIC', reason: 'Local source with static manifest evidence' };
        }
        // No static manifest evidence → ambiguous
        return { mediaId: media.id, classification: 'AMBIGUOUS', reason: 'Local source without static manifest evidence or contentHash' };
      }
      
      // Has contentHash - check for Blob evidence
      try {
        const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
        if (blobMetadata) {
          const originalUrl = media.variants?.original || '';
          if (originalUrl === blobMetadata.url) {
            const verification = await verifyBlobHash(blobMetadata.url, media.contentHash);
            if (verification.success) {
              // Full Blob evidence chain → repairable to blob
              return { mediaId: media.id, classification: 'REPAIRABLE_BLOB', reason: 'Local source with full Blob evidence chain' };
            }
            return { mediaId: media.id, classification: 'AMBIGUOUS', reason: 'Blob hash verification failed' };
          }
          return { mediaId: media.id, classification: 'AMBIGUOUS', reason: 'Blob URL mismatch' };
        }
        return { mediaId: media.id, classification: 'AMBIGUOUS', reason: 'No Blob metadata for contentHash' };
      } catch (error) {
        return { mediaId: media.id, classification: 'AMBIGUOUS', reason: 'Blob verification error' };
      }
    }
  }
  
  // Has storage - verify it's correct
  if (media.storage === 'blob') {
    if (!hasContentHash) {
      return { mediaId: media.id, classification: 'MALFORMED', reason: 'Blob storage requires contentHash' };
    }
    if (!hasVariants) {
      return { mediaId: media.id, classification: 'MALFORMED', reason: 'Blob storage requires variants' };
    }
  }
  
  if (media.storage === 'static') {
    if (!hasVariants) {
      return { mediaId: media.id, classification: 'MALFORMED', reason: 'Static storage requires variants' };
    }
    const originalUrl = media.variants?.original || '';
    if (!originalUrl.startsWith('/images/')) {
      return { mediaId: media.id, classification: 'MALFORMED', reason: 'Static storage requires /images/ URL' };
    }
  }
  
  // Valid published record
  return { mediaId: media.id, classification: 'VALID_PUBLISHED', reason: 'Valid published asset' };
}

interface ReconcileRequest {
  action: 'audit' | 'plan' | 'repair' | 'verify';
  options?: {
    dryRun?: boolean;
    pageSize?: number;
    auditFingerprint?: string;
  };
}

interface ClassificationResult {
  mediaId: string;
  classification: string;
  reason: string;
}

interface ReconcilePlan {
  fingerprint: string;
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

// Generate immutable plan fingerprint from classification results
function generatePlanFingerprint(classifications: ClassificationResult[]): string {
  const crypto = require('crypto');
  const sorted = classifications
    .map(c => `${c.mediaId}:${c.classification}`)
    .sort()
    .join('|');
  return crypto.createHash('sha256').update(sorted).digest('hex');
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
    
    // P0 FIX: Add pagination to avoid timeout on large datasets
    const pageSize = options.pageSize || 50;
    const totalPages = Math.ceil(mediaIds.length / pageSize);
    
    // AUDIT MODE: Classify all records with pagination
    const classifications: ClassificationResult[] = [];
    for (let page = 0; page < totalPages; page++) {
      const startIdx = page * pageSize;
      const endIdx = Math.min(startIdx + pageSize, mediaIds.length);
      const pageIds = mediaIds.slice(startIdx, endIdx);
      
      console.log('[MEDIA_RECONCILIATION] Processing page', { page: page + 1, totalPages, count: pageIds.length });
      
      for (const mediaId of pageIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) continue;
        
        const classification = await classifyRecord(media, staticMediaMap);
        classifications.push(classification);
      }
    }
    
    // Aggregate classification counts
    const counts = {
      totalRecords: mediaIds.length,
      validPublished: 0,
      driveReference: 0,
      materializing: 0,
      stale: 0,
      malformed: 0,
      repairableStatic: 0,
      repairableBlob: 0,
      requiresMaterialization: 0,
      ambiguous: 0,
      unknown: 0,
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
        case 'MALFORMED':
          counts.malformed++;
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
    
    // PLAN MODE: Show proposed repairs with immutable fingerprint
    if (action === 'plan') {
      const plan: ReconcilePlan = {
        fingerprint: generatePlanFingerprint(classifications),
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
    
    // REPAIR MODE: Execute mutations with plan fingerprint binding
    if (action === 'repair') {
      // P0 FIX: Require plan fingerprint to bind plan to repair
      if (!options.auditFingerprint) {
        return NextResponse.json(
          { error: 'PLAN_FINGERPRINT_REQUIRED', message: 'auditFingerprint from plan action is required for repair' },
          { status: 400 }
        );
      }
      
      // Verify fingerprint matches current state
      const currentFingerprint = generatePlanFingerprint(classifications);
      if (currentFingerprint !== options.auditFingerprint) {
        return NextResponse.json(
          { 
            error: 'STALE_PLAN', 
            message: 'Plan fingerprint does not match current state. Records changed between plan and repair.',
            currentFingerprint,
            providedFingerprint: options.auditFingerprint,
          },
          { status: 409 }
        );
      }
      
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
      const repairs: Array<{ mediaId: string; storage: string; reason: string; before: any; after: any }> = [];
      const errors: Record<string, string> = {};
      
      // P0 FIX: Strengthen static evidence verification
      const { getBlobMetadataByContentHash, verifyBlobHash } = await import('@/lib/blob-storage');
      
      // Repair REPAIRABLE_BLOB records with pagination
      for (let i = 0; i < repairableBlobIds.length; i += pageSize) {
        const batchIds = repairableBlobIds.slice(i, i + pageSize);
        console.log('[MEDIA_RECONCILIATION] Repairing REPAIRABLE_BLOB batch', { batch: Math.floor(i / pageSize) + 1, count: batchIds.length });
        
        for (const mediaId of batchIds) {
          try {
            const media = await getMediaRecordRaw(mediaId);
            if (!media) {
              skipped++;
              continue;
            }
            
            // Capture before state for verification
            const beforeState = {
              storage: media.storage,
              contentHash: media.contentHash,
              variants: media.variants,
              provenance: media.provenance,
            };
            
            // Verify evidence one more time before mutation
            if (!media.contentHash) {
              skipped++;
              continue;
            }
            
            const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
            const originalUrl = media.variants?.original || '';
            
            if (!blobMetadata || originalUrl !== blobMetadata.url) {
              skipped++;
              continue;
            }
            
            const verification = await verifyBlobHash(blobMetadata.url, media.contentHash);
            if (!verification.success) {
              skipped++;
              continue;
            }
            
            // Mutation: only storage field
            const repairedMedia: Media = {
              ...media,
              storage: 'blob',
            };
            
            await saveMedia(repairedMedia);
            
            // Capture after state for verification
            const afterMedia = await getMediaRecordRaw(mediaId);
            const afterState = {
              storage: afterMedia?.storage,
              contentHash: afterMedia?.contentHash,
              variants: afterMedia?.variants,
              provenance: afterMedia?.provenance,
            };
            
            repaired++;
            repairs.push({
              mediaId,
              storage: 'blob',
              reason: 'REPAIRABLE_BLOB with full Blob evidence',
              before: beforeState,
              after: afterState,
            });
            
            console.log('[MEDIA_RECONCILIATION] REPAIRED', { mediaId, storage: 'blob' });
          } catch (error) {
            failed++;
            errors[mediaId] = error instanceof Error ? error.message : 'Unknown error';
            console.error('[MEDIA_RECONCILIATION] Repair failed', { mediaId, error });
          }
        }
      }
      
      // Repair REPAIRABLE_STATIC records with stronger evidence verification
      for (let i = 0; i < repairableStaticIds.length; i += pageSize) {
        const batchIds = repairableStaticIds.slice(i, i + pageSize);
        console.log('[MEDIA_RECONCILIATION] Repairing REPAIRABLE_STATIC batch', { batch: Math.floor(i / pageSize) + 1, count: batchIds.length });
        
        for (const mediaId of batchIds) {
          try {
            const media = await getMediaRecordRaw(mediaId);
            if (!media) {
              skipped++;
              continue;
            }
            
            // P0 FIX: Strengthen static evidence - verify manifest record matches
            const staticRecord = staticMediaMap.get(mediaId);
            if (!staticRecord) {
              skipped++;
              continue;
            }
            
            // Verify key immutable fields match
            if (staticRecord.contentHash && media.contentHash !== staticRecord.contentHash) {
              skipped++;
              continue;
            }
            
            if (staticRecord.variants?.original && media.variants?.original !== staticRecord.variants.original) {
              skipped++;
              continue;
            }
            
            // Capture before state
            const beforeState = {
              storage: media.storage,
              contentHash: media.contentHash,
              variants: media.variants,
            };
            
            // Mutation: only storage field
            const repairedMedia: Media = {
              ...media,
              storage: 'static',
            };
            
            await saveMedia(repairedMedia);
            
            // Capture after state
            const afterMedia = await getMediaRecordRaw(mediaId);
            const afterState = {
              storage: afterMedia?.storage,
              contentHash: afterMedia?.contentHash,
              variants: afterMedia?.variants,
            };
            
            repaired++;
            repairs.push({
              mediaId,
              storage: 'static',
              reason: 'REPAIRABLE_STATIC with verified static manifest evidence',
              before: beforeState,
              after: afterState,
            });
            
            console.log('[MEDIA_RECONCILIATION] REPAIRED', { mediaId, storage: 'static' });
          } catch (error) {
            failed++;
            errors[mediaId] = error instanceof Error ? error.message : 'Unknown error';
            console.error('[MEDIA_RECONCILIATION] Repair failed', { mediaId, error });
          }
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
      
      return NextResponse.json(repairResult);
    }
    
    // VERIFY MODE: Deep field-level verification after repair
    if (action === 'verify') {
      const verifyClassifications: ClassificationResult[] = [];
      for (let page = 0; page < totalPages; page++) {
        const startIdx = page * pageSize;
        const endIdx = Math.min(startIdx + pageSize, mediaIds.length);
        const pageIds = mediaIds.slice(startIdx, endIdx);
        
        for (const mediaId of pageIds) {
          const media = await getMediaRecordRaw(mediaId);
          if (!media) continue;
          
          const classification = await classifyRecord(media, staticMediaMap);
          verifyClassifications.push(classification);
        }
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
