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
 * POST /api/workbench/media-authority
 * Body: { action: 'getPublishedMediaAssets' }
 */

import { NextResponse } from 'next/server';
import { getPublishedMediaAssets } from '@/lib/visual-asset-registry';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'getPublishedMediaAssets') {
      const result = await getPublishedMediaAssets();
      return NextResponse.json(result);
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
