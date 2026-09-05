/**
 * Media Authority Sync from Static to KV
 *
 * This endpoint syncs media records from media.v1.json to KV
 * It updates existing stale records with corrected constitutional fields.
 *
 * POST /api/admin/diagnostic/sync-media-authority
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { loadMediaManifest } from "@/lib/media";
import { saveMedia, getMediaRecordRaw } from "@/lib/media-kv-store";

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
    const manifest = loadMediaManifest();
    
    let synced = 0;
    let updated = 0;
    let skipped = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    for (const media of manifest.media) {
      try {
        // Skip if missing constitutional fields
        if (!media.lifecycleState || !media.source || !media.contentHash) {
          skipped++;
          console.log('[SYNC] SKIPPED', { mediaId: media.id, reason: 'Missing constitutional fields' });
          continue;
        }
        
        // P0 FIX: Ensure storage field is present for public media gate compliance
        // Static files have local files, so storage should be 'static'
        // Drive-ingested assets will have storage: 'blob' from ingest
        if (!media.storage && media.source === 'local') {
          media.storage = 'static';
          console.log('[SYNC] STORAGE_FIX', { mediaId: media.id, addedStorage: 'static' });
        }
        
        // Check if already in KV
        const existing = await getMediaRecordRaw(media.id);
        if (existing) {
          // Update existing stale record with corrected constitutional fields
          await saveMedia(media);
          updated++;
          console.log('[SYNC] UPDATED', { 
            mediaId: media.id,
            oldSource: existing.source,
            newSource: media.source,
            oldLifecycleState: existing.lifecycleState,
            newLifecycleState: media.lifecycleState,
            oldStorage: existing.storage,
            newStorage: media.storage,
          });
        } else {
          // Write new record to KV
          await saveMedia(media);
          synced++;
          console.log('[SYNC] SYNCED', { 
            mediaId: media.id,
            lifecycleState: media.lifecycleState,
            source: media.source,
            contentHash: media.contentHash,
            storage: media.storage,
          });
        }
        
      } catch (error) {
        failed++;
        errors[media.id] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SYNC] ERROR', { mediaId: media.id, error });
      }
    }
    
    return NextResponse.json({
      totalMediaCount: manifest.media.length,
      synced,
      updated,
      skipped,
      failed,
      errors: failed > 0 ? errors : undefined,
    });
    
  } catch (error) {
    console.error('[SYNC] FATAL ERROR', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json(
      { error: 'SYNC_FAILED', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
