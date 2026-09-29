/**
 * Media Storage Field Repair Endpoint
 *
 * Repairs KV media records missing the 'storage' field or incorrect 'source' field.
 * Uses evidence-based classification to determine correct storage and source types.
 *
 * POST /api/admin/diagnostic/repair-media-storage
 *
 * Request Body (optional):
 * {
 *   mediaIds: string[]  // Explicit list of IDs to repair (if omitted, requires explicit confirmation)
 *   confirm: boolean    // Required if mediaIds is omitted to confirm bulk repair
 * }
 *
 * Constitutional Rules:
 * - Never infer storage: r2 merely because a record has Drive provenance
 * - Preserve all existing media identity, content hashes, variants, Drive provenance, and assignments
 * - Never delete records
 * - Never overwrite a valid storage declaration
 * - Skip records that are legitimately lifecycle states without storage
 * - For local source: only add storage: static if record exists in static media.v1.json manifest
 * - For Drive source: only set storage: r2 with physical R2 evidence (contentHash + R2 object existence)
 * - P0 FIX: Prefer explicit ID list over bulk mutation for safe production repair
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw, saveMedia } from '@/lib/media-kv-store';
import { loadMediaManifest } from '@/lib/media';
import { verifyR2ObjectExists } from '@/lib/r2-storage';
import type { Media } from '@/types/media';

interface RepairRequest {
  mediaIds?: string[];
  confirm?: boolean;
}

export async function POST(request: Request) {
  // REQUIRE ADMIN AUTHORIZATION
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'WORKBENCH_AUTH_REQUIRED', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  // Parse request body
  let body: RepairRequest = {};
  try {
    body = await request.json();
  } catch {
    // Empty body is allowed
  }

  const explicitIds = body.mediaIds;
  const bulkConfirm = body.confirm;

  // P0 FIX: Require explicit ID list OR explicit bulk confirmation
  // This prevents accidental bulk mutation without operator intent
  if (!explicitIds && !bulkConfirm) {
    return NextResponse.json({
      error: 'EXPLICIT_CONFIRMATION_REQUIRED',
      message: 'Either provide mediaIds array for targeted repair, or set confirm: true for bulk repair',
    }, { status: 400 });
  }

  try {
    console.log('[STORAGE_REPAIR] Starting media storage field repair', {
      mode: explicitIds ? 'targeted' : 'bulk',
      targetCount: explicitIds?.length || 'all',
    });
    
    // Load static media manifest for evidence-based classification
    const manifest = loadMediaManifest();
    const staticMediaMap = new Map(manifest.media.map(m => [m.id, m]));
    console.log('[STORAGE_REPAIR] Static manifest loaded', { count: staticMediaMap.size });
    
    // Determine target media IDs
    let mediaIds: string[];
    if (explicitIds) {
      mediaIds = explicitIds;
      console.log('[STORAGE_REPAIR] Using explicit ID list', { count: mediaIds.length });
    } else {
      mediaIds = await listMediaIds();
      console.log('[STORAGE_REPAIR] Scanning all media records', { count: mediaIds.length });
    }
    
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
        
        // Check if storage field exists
        const hasStorage = !!media.storage;
        
        // Evidence-based storage classification
        let storage: 'static' | 'r2' | null = null;
        let reason = '';
        
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
        
        // P0 FIX: Check for contract violations even when storage exists
        if (hasStorage) {
          const originalUrl = media.variants?.original || '';
          
          if (media.storage === 'r2' && (originalUrl.startsWith('/images/') || originalUrl.startsWith('/public/'))) {
            // STATIC_MARKED_R2: Static URL but marked as r2
            // Repair to storage: static
            storage = 'static';
            reason = 'Contract violation repair: static URL but marked as r2 → corrected to static';
          } else if (media.storage === 'static' && (originalUrl.startsWith('http://') || originalUrl.startsWith('https://'))) {
            // R2_MARKED_STATIC: R2 URL but marked as static
            // Repair to storage: r2, but only with R2 evidence
            if (media.contentHash) {
              const r2Key = originalUrl.split('/').pop() || '';
              const objectExists = await verifyR2ObjectExists(r2Key);
              if (objectExists) {
                storage = 'r2';
                reason = 'Contract violation repair: R2 URL but marked as static + R2 object verification → corrected to r2';
              } else {
                skipped++;
                skips.push({ 
                  mediaId, 
                  reason: 'Contract violation (R2 URL marked static) but R2 object not found - requires manual review' 
                });
                continue;
              }
            } else {
              skipped++;
              skips.push({ 
                mediaId, 
                reason: 'Contract violation (R2 URL marked static) but no contentHash - requires manual review' 
              });
              continue;
            }
          } else {
            // Valid storage declaration, no repair needed
            skipped++;
            skips.push({ mediaId, reason: 'Storage field already valid' });
            continue;
          }
          
          // P0 FIX: Contract violation repair proven → persist immediately and STOP
          // Do NOT fall through into source classifier which may overwrite or skip
          if (storage) {
            const repairedMedia: Media = {
              ...media,
              storage: storage as 'static' | 'r2' | undefined,
            };
            
            await saveMedia(repairedMedia);
            repaired++;
            repairs.push({ mediaId, reason, addedStorage: storage });
            
            console.log('[STORAGE_REPAIR] CONTRACT_VIOLATION_REPAIRED', { 
              mediaId, 
              originalStorage: media.storage,
              addedStorage: storage,
              reason,
            });
            
            continue; // STOP processing this record
          }
        }
        
        // Source-based classification (only if storage not yet determined)
        if (media.source === 'local') {
          // P0 FIX: Check for REPAIRABLE_R2 case - local source with R2 evidence
          // This happens when media was successfully uploaded to R2 but storage field was never set
          if (media.contentHash) {
            const originalUrl = media.variants?.original || '';
            const r2Key = originalUrl.split('/').pop() || '';
            const objectExists = await verifyR2ObjectExists(r2Key);
            
            if (objectExists) {
              // R2 object exists → repair storage to r2
              // Source remains 'local' per PublishedMediaAsset contract
              storage = 'r2';
              reason = 'REPAIRABLE_R2: local source with R2 object evidence (contentHash + object exists) → corrected to storage: r2';
            }
          }
          
          // If not REPAIRABLE_R2, check for static manifest evidence
          if (!storage) {
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
                reason: 'Local source without static manifest evidence or R2 evidence - requires manual verification' 
              });
              continue;
            }
          }
        } else if (media.source === 'google-drive') {
          // P0 FIX: Drive source without storage → REQUIRES MATERIALIZATION, NOT STORAGE REPAIR
          // NEVER infer r2 merely from Drive provenance
          // Only repair to r2 if R2 object exists (rare edge case)
          if (media.lifecycleState === 'published' && media.contentHash) {
            // Published Drive asset with content hash → check for R2 evidence
            const originalUrl = media.variants?.original || '';
            const r2Key = originalUrl.split('/').pop() || '';
            const objectExists = await verifyR2ObjectExists(r2Key);
            
            if (objectExists) {
              // R2 object exists → safe to set storage: r2
              // This is the rare case where a Drive record was materialized but storage field was not set
              storage = 'r2';
              reason = 'Drive source with published state + contentHash + R2 object exists → r2 storage';
            } else {
              // R2 object not found → requires materialization
              skipped++;
              skips.push({ 
                mediaId, 
                reason: 'Drive source without R2 object evidence - requires Drive materialization (not storage repair)' 
              });
              continue;
            }
          } else {
            // Drive record without clear evidence → requires materialization
            skipped++;
            skips.push({ 
              mediaId, 
              reason: 'Drive source without sufficient evidence - requires Drive materialization (not storage repair)' 
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
          storage: storage as 'static' | 'r2' | undefined,
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
      mode: explicitIds ? 'targeted' : 'bulk',
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
