/**
 * Workbench Materialization Verification API Route
 *
 * VERIFICATION: Check if a PublishedMediaAsset is materially complete
 *
 * This endpoint verifies that a PublishedMediaAsset has all required
 * variants and is not in an incomplete state (e.g., missing renditions,
 * synthetic hash, etc.).
 */

import { NextResponse } from 'next/server';
import { getMedia } from '@/lib/media-kv-store';
import { isPubliclyComplete } from '@/lib/media-contracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    const { searchParams } = new URL(request.url);
    const assetId = searchParams.get('assetId');

    if (!assetId) {
      return NextResponse.json(
        {
          error: 'ASSET_ID_REQUIRED',
          message: 'assetId is required',
          requestId,
        },
        { status: 400 }
      );
    }

    console.log('[WORKBENCH_VERIFICATION] Request received', {
      requestId,
      assetId,
    });

    // Get the media record
    const media = await getMedia(assetId);
    if (!media) {
      console.log('[WORKBENCH_VERIFICATION] Asset not found', {
        requestId,
        assetId,
      });
      return NextResponse.json(
        {
          complete: false,
          reason: 'ASSET_NOT_FOUND',
          message: 'Asset not found in KV',
          requestId,
        }
      );
    }

    // Check if the asset is publicly complete
    const complete = isPubliclyComplete(media);

    console.log('[WORKBENCH_VERIFICATION] Verification complete', {
      requestId,
      assetId,
      complete,
      lifecycleState: media.lifecycleState,
      source: media.source,
      hasStorage: !!media.storage,
      hasVariants: !!media.variants,
    });

    return NextResponse.json({
      complete,
      requestId,
      details: {
        lifecycleState: media.lifecycleState,
        source: media.source,
        hasStorage: !!media.storage,
        hasVariants: !!media.variants,
      },
    });
  } catch (error) {
    console.error('[WORKBENCH_VERIFICATION] Error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        complete: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
