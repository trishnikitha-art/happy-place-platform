/**
 * Simple Media Authority Sync from Static to KV
 * 
 * This endpoint syncs media records from media.v1.main.json to KV
 * without rematerialization. It assumes the static records already have
 * the correct constitutional fields (lifecycleState, source, contentHash).
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
    let skipped = 0;
    let failed = 0;
    const errors: Record<string, string> = {};
    
    for (const media of manifest.media) {
      try {
        // Check if already in KV
        const existing = await getMediaRecordRaw(media.id);
        if (existing) {
          skipped++;
          console.log('[SYNC] SKIPPED', { mediaId: media.id, reason: 'Already in KV' });
          continue;
        }
        
        // Skip if missing constitutional fields
        if (!media.lifecycleState || !media.source || !media.contentHash) {
          skipped++;
          console.log('[SYNC] SKIPPED', { mediaId: media.id, reason: 'Missing constitutional fields' });
          continue;
        }
        
        // Write to KV
        await saveMedia(media);
        synced++;
        console.log('[SYNC] SYNCED', { 
          mediaId: media.id,
          lifecycleState: media.lifecycleState,
          source: media.source,
          contentHash: media.contentHash
        });
        
      } catch (error) {
        failed++;
        errors[media.id] = error instanceof Error ? error.message : 'Unknown error';
        console.error('[SYNC] ERROR', { mediaId: media.id, error });
      }
    }
    
    return NextResponse.json({
      totalMediaCount: manifest.media.length,
      synced,
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
