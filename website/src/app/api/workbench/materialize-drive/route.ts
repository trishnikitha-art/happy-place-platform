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

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface MaterializeRequest {
  fileId: string;
  sharedDriveId?: string;
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

    // Call the core Drive ingest endpoint
    // We use fetch to call the same process API to avoid duplicating logic
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const ingestUrl = `${baseUrl}/api/drive/ingest`;
    const ingestBody = {
      driveId: fileId,
      driveIdParameter: sharedDriveId,
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
    return NextResponse.json({
      success: true,
      asset: result.media,
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
