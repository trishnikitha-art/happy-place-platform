/**
 * Workbench Drive Materialization API Route
 *
 * BRIDGE: Workbench UI → Drive Materialization
 *
 * This endpoint exists because the Media Workbench needs a convenient materialization
 * endpoint that handles Workbench authentication and returns the asset in the format
 * expected by the Workbench UI.
 *
 * It wraps the core /api/drive/ingest logic with Workbench-specific handling.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface MaterializeRequest {
  fileId: string;  // The Google Drive file ID to materialize
  sharedDriveId?: string;  // The Shared Drive ID (corpus context)
  fileName: string;
  mimeType: string;
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      return NextResponse.json(
        {
          error: 'WORKBENCH_AUTH_REQUIRED',
          message: 'Workbench authentication required',
          requestId,
        },
        { status: 401 }
      );
    }

    const body: MaterializeRequest = await request.json();
    const { fileId, sharedDriveId, fileName, mimeType } = body;

    console.log('[WORKBENCH_MATERIALIZATION] Request received', {
      requestId,
      fileId,
      sharedDriveId,
      fileName,
      mimeType,
    });

    if (!fileId) {
      return NextResponse.json(
        {
          error: 'FILE_ID_REQUIRED',
          message: 'fileId is required',
          requestId,
        },
        { status: 400 }
      );
    }

    // P0 FIX: Enforce corpus authorization before forwarding to core ingest
    // This prevents cross-corpus access even through the bridge
    const corpusAuth = await verifyCorpusAuthorization(fileId, sharedDriveId);
    if (!corpusAuth.authorized) {
      console.error('[WORKBENCH_MATERIALIZATION] CORPUS_AUTHORIZATION_FAILED', {
        requestId,
        fileId,
        sharedDriveId,
        reason: corpusAuth.reason,
      });
      return NextResponse.json(
        {
          error: 'CORPUS_NOT_AUTHORIZED',
          message: corpusAuth.reason || 'Drive corpus is not authorized for this session',
          requestId,
        },
        { status: 403 }
      );
    }

    console.log('[WORKBENCH_MATERIALIZATION] Corpus authorization verified', {
      requestId,
      fileId,
      sharedDriveId,
      corpus: corpusAuth.corpus,
    });

    // P0 FIX: Do NOT reject based on MIME type at this boundary
    // MIME is metadata, not content authority
    // Sharp will determine whether the bytes are actually an image after download
    // All Drive objects (including Google-native) pass through to Sharp validation
    console.log('[WORKBENCH_MATERIALIZATION] MIME classification', {
      requestId,
      mimeType,
      classification: mimeType?.startsWith('image/') ? 'image-metadata' : 'no-image-metadata',
      note: 'Sharp will determine actual image status from bytes',
    });

    // Call the core Drive ingest endpoint
    // We use fetch to call the same process API to avoid duplicating logic
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const ingestUrl = `${baseUrl}/api/drive/ingest`;
    const ingestBody = {
      fileId: fileId,  // The Google Drive file ID to materialize
      sharedDriveId: sharedDriveId,  // The Shared Drive ID (corpus context)
      roles: ['gallery'],
    };

    console.log('[WORKBENCH_MATERIALIZATION] Calling core ingest endpoint', {
      requestId,
      ingestUrl,
      ingestBody,
    });

    const ingestResponse = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Forward the same cookies for authentication
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(ingestBody),
    });

    if (!ingestResponse.ok) {
      const error = await ingestResponse.json();
      console.error('[WORKBENCH_MATERIALIZATION] Core ingest failed', {
        requestId,
        error,
        status: ingestResponse.status,
      });
      return NextResponse.json(
        {
          error: error.error || 'MATERIALIZATION_FAILED',
          message: error.message || 'Failed to materialize Drive file',
          details: error,
          requestId,
        },
        { status: ingestResponse.status }
      );
    }

    const result = await ingestResponse.json();
    console.log('[WORKBENCH_MATERIALIZATION] Success', {
      requestId,
      assetId: result.media?.id,
      filename: result.media?.filename,
    });

    // Return the asset in the format expected by the Workbench
    // P0 FIX: Match ingest endpoint contract - return both media and mediaId
    return NextResponse.json({
      success: true,
      media: result.media,
      mediaId: result.mediaId,
      asset: result.media, // Backward compatibility
      requestId,
    });
  } catch (error) {
    console.error('[WORKBENCH_MATERIALIZATION] Error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'MATERIALIZATION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
