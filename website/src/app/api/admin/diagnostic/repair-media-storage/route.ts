/**
 * Media Storage Field Repair Endpoint
 *
 * Repairs KV media records missing the 'storage' field.
 * Uses evidence-based classification to determine correct storage type.
 *
 * POST /api/admin/diagnostic/repair-media-storage
 *
 * Constitutional Rules:
 * - Never infer storage: blob merely because a record has Drive provenance
 * - Preserve all existing media identity, content hashes, variants, Drive provenance, and assignments
 * - Never delete records
 * - Never overwrite a valid storage declaration
 * - Skip records that are legitimately lifecycle states without storage
 * - For local source: only add storage: static if record exists in static media.v1.json manifest
 * - For Drive source: skip until Blob evidence is manually verified
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw, saveMedia } from '@/lib/media-kv-store';
import { loadMediaManifest } from '@/lib/media';
import { getBlobMetadataByContentHash, verifyBlobHash } from '@/lib/blob-storage';
import type { Media } from '@/types/media';

export async function POST() {
  // REQUIRE ADMIN AUTHORIZATION
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'WORKBENCH_AUTH_REQUIRED', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  try {
    console.log('[STORAGE_REPAIR] Starting media storage field repair');
    
    // Load static media manifest for evidence-based classification
    const manifest = loadMediaManifest();
    const staticMediaMap = new Map(manifest.media.map(m => [m.id, m]));
    console.log('[STORAGE_REPAIR] Static manifest loaded', { count: staticMediaMap.size });
    
    const mediaIds = await listMediaIds();
    console.log('[STORAGE_REPAIR] Found media records', { count: mediaIds.length });
    
    let repaired = 0;
    let skipped = 0;
    let failed = 0;
    const repairs: Array<{ mediaId: string; reason: string; addedStorage: string }> = [];
    const skips: Array<{ mediaId: string; reason: string }> = [];
    const errors: Record<string, string> = {};
    
    for (const mediaId of mediaIds) {
      try {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) {
          console.warn('[STORAGE_REPAIR] Record not found', { mediaId });
          skipped++;
          skips.push({ mediaId, reason: 'Record not found in KV' });
          continue;
        }
        
        // Skip if storage field already exists (valid)
        if (media.storage) {
          skipped++;
          skips.push({ mediaId, reason: 'Storage field already present' });
          continue;
        }
        
        // Skip legitimate lifecycle states that should not have storage
        if (media.lifecycleState === 'source_reference') {
          // DriveReference - legitimately has no storage (not materialized yet)
          skipped++;
          skips.push({ mediaId, reason: 'DriveReference (source_reference) - legitimately no storage' });
          continue;
        }
        
        if (media.lifecycleState === 'materializing') {
          // Intermediate state - not yet materialized
          skipped++;
          skips.push({ mediaId, reason: 'Materializing state - intermediate, not ready for storage classification' });
          continue;
        }
        
        if (media.lifecycleState === 'stale') {
          // Stale record - needs refresh, not repair
          skipped++;
          skips.push({ mediaId, reason: 'Stale record - requires refresh, not storage repair' });
          continue;
        }
        
        // Evidence-based storage classification
        let storage: 'static' | 'blob' | null = null;
        let reason = '';
        
        if (media.source === 'local') {
          // P0 FIX: Only add storage: static if record exists in static manifest
          // This ensures we only repair records that have proven static authority
          const staticRecord = staticMediaMap.get(mediaId);
          if (staticRecord) {
            // Record exists in static manifest → static storage is proven
            storage = 'static';
            reason = 'Local source with static manifest evidence → static storage';
          } else {
            // Local source but not in static manifest → skip to avoid false inference
            skipped++;
            skips.push({ 
              mediaId, 
              reason: 'Local source without static manifest evidence - requires manual verification' 
            });
            continue;
          }
        } else if (media.source === 'google-drive') {
          // P0 FIX: Only set storage: blob with actual physical Blob evidence
          // NEVER infer blob merely from Drive provenance
          if (media.lifecycleState === 'published' && media.contentHash) {
            // Published Drive asset with content hash → check for Blob evidence
            const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
            
            if (blobMetadata) {
              // Blob metadata exists → verify physical integrity
              const originalUrl = media.variants?.original || '';
              
              // Check if media URL matches Blob URL
              if (originalUrl === blobMetadata.url) {
                // URL matches → verify physical hash
                const verification = await verifyBlobHash(blobMetadata.url, media.contentHash);
                
                if (verification.success) {
                  // Physical Blob hash verified → safe to set storage: blob
                  storage = 'blob';
                  reason = 'Drive source with published state + contentHash + Blob metadata + URL match + physical hash verification → blob storage';
                } else {
                  // Hash verification failed → skip to avoid false inference
                  skipped++;
                  skips.push({ 
                    mediaId, 
                    reason: `Drive source with Blob metadata but physical hash verification failed (${verification.errorType}) - requires manual review` 
                  });
                  continue;
                }
              } else {
                // URL mismatch → skip to avoid false inference
                skipped++;
                skips.push({ 
                  mediaId, 
                  reason: 'Drive source with Blob metadata but URL mismatch - requires manual review' 
                });
                continue;
              }
            } else {
              // No Blob metadata → skip
              skipped++;
              skips.push({ 
                mediaId, 
                reason: 'Drive source with contentHash but no Blob metadata - requires manual verification' 
              });
              continue;
            }
          } else {
            // Drive record without clear evidence → skip to avoid incorrect inference
            skipped++;
            skips.push({ 
              mediaId, 
              reason: 'Drive source without sufficient evidence for storage classification' 
            });
            continue;
          }
        } else {
          // Unknown source → skip
          skipped++;
          skips.push({ mediaId, reason: `Unknown source: ${media.source}` });
          continue;
        }
        
        if (!storage) {
          skipped++;
          skips.push({ mediaId, reason: 'Unable to determine storage type from available evidence' });
          continue;
        }
        
        // Apply repair
        const repairedMedia: Media = {
          ...media,
          storage,
        };
        
        await saveMedia(repairedMedia);
        repaired++;
        repairs.push({ mediaId, reason, addedStorage: storage });
        
        console.log('[STORAGE_REPAIR] REPAIRED', { 
          mediaId, 
          source: media.source,
          lifecycleState: media.lifecycleState,
          addedStorage: storage,
          reason,
        });
        
      } catch (error) {
        failed++;
        errors[mediaId] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[STORAGE_REPAIR] ERROR', { mediaId, error });
      }
    }
    
    console.log('[STORAGE_REPAIR] Complete', {
      totalRecords: mediaIds.length,
      repaired,
      skipped,
      failed,
    });
    
    return NextResponse.json({
      totalRecords: mediaIds.length,
      repaired,
      skipped,
      failed,
      repairs,
      skips,
      errors: failed > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error('[STORAGE_REPAIR] FATAL ERROR', error);
    return NextResponse.json(
      { 
        error: 'STORAGE_REPAIR_FAILED', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
