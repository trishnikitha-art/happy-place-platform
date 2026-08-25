/**
 * Media Materialization Completeness Verification API
 *
 * Verifies whether a PublishedMediaAsset is materially complete.
 * Uses the authoritative completeness contract defined in /api/drive/ingest.
 *
 * GET /api/admin/media/verify-complete?mediaId={id}
 *
 * Returns: { complete: boolean, checks: { ... } }
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { getMedia } from "@/lib/media";

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // SECURITY: Require authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const mediaId = searchParams.get('mediaId');

  if (!mediaId) {
    return NextResponse.json(
      { error: "Missing mediaId parameter" },
      { status: 400 }
    );
  }

  console.log('[MEDIA_VERIFY] VERIFICATION_REQUEST', { requestId, mediaId });

  try {
    const media = await getMedia(mediaId);

    if (!media) {
      console.log('[MEDIA_VERIFY] MEDIA_NOT_FOUND', { requestId, mediaId });
      return NextResponse.json(
        { complete: false, error: "Media not found" },
        { status: 404 }
      );
    }

    // Import the completeness check function
    const { isMediaMaterializationComplete } = await import('@/app/api/drive/ingest/route');

    const complete = isMediaMaterializationComplete(media);

    console.log('[MEDIA_VERIFY] VERIFICATION_RESULT', {
      requestId,
      mediaId,
      complete,
      lifecycleState: media.lifecycleState,
      source: media.source,
    });

    return NextResponse.json({
      complete,
      mediaId,
      lifecycleState: media.lifecycleState,
      source: media.source,
    });
  } catch (error) {
    console.error('[MEDIA_VERIFY] VERIFICATION_ERROR', {
      requestId,
      mediaId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        complete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
