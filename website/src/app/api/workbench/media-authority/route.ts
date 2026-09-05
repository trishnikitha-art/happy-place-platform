/**
 * Workbench Media Authority API Route
 *
 * Server-side proxy for media authority queries from client-side Workbench.
 * 
 * CRITICAL: This route exists because the Workbench is a 'use client' component
 * that cannot safely access server credentials (KV_REST_API_URL, KV_REST_API_TOKEN).
 * 
 * The browser must never invoke media-kv-store directly.
 * 
 * CRITICAL FIX: Added Workbench authentication boundary
 * Server-side authority data must only be exposed to authenticated Workbench users
 * 
 * POST /api/drive/discovery - Returns Drive corpus (My Drive + Shared Drives)
 * POST /api/workbench/media-authority - Returns published media assets from KV
 */

import { NextResponse } from 'next/server';
import { getPublishedMediaAssets } from '@/lib/visual-asset-registry';
import { workbenchSession } from '@/lib/workbench-session';
import { getMediaRecordRaw, listMediaIds } from '@/lib/media-kv-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // CRITICAL FIX: Verify Workbench authentication before exposing media authority data
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

    if (action === 'getPublishedMediaAssets' || action === 'list') {
      const result = await getPublishedMediaAssets();
      // Return in format expected by Workbench: { media: assets[], available: boolean, error?: string }
      return NextResponse.json({
        media: result.assets,
        available: result.available,
        error: result.error,
      });
    }

    // P0 FIX: Add action to find media by Drive file ID for deduplication
    if (action === 'getByDriveFileId') {
      const { driveFileId } = body;
      if (!driveFileId) {
        return NextResponse.json(
          { error: 'driveFileId required' },
          { status: 400 }
        );
      }

      // Find media by Drive file ID by scanning KV media records
      // P0 FIX: Use getMediaRecordRaw for reconciliation to find records even if they fail public gate
      const mediaIds = await listMediaIds();
      let foundMedia = null;
      
      for (const mediaId of mediaIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (media && media.drive?.fileId === driveFileId) {
          foundMedia = media;
          break;
        }
      }

      return NextResponse.json({
        media: foundMedia,
        found: !!foundMedia,
      });
    }

    return NextResponse.json(
      { error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    console.error('[WORKBENCH_MEDIA_AUTHORITY] Error:', error);
    return NextResponse.json(
      { 
        error: 'Media authority query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
