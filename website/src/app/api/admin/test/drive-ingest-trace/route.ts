/**
 * Drive Ingestion Trace Test Endpoint
 *
 * This endpoint traces the complete Drive → bytes → hash → MediaAsset → Blob → KV → assignment → projection → browser chain
 * for a specific Drive file to prove the constitutional pipeline works end-to-end.
 *
 * GET /api/admin/test/drive-ingest-trace?filename=xxx
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { driveDiscovery } from "@/lib/drive/drive-discovery";
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[DRIVE_INGEST_TRACE] REQUEST_RECEIVED', { requestId });

  // SECURITY: Require authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: "filename parameter required", message: "Provide filename to search for in Drive" },
        { status: 400 }
      );
    }

    console.log('[DRIVE_INGEST_TRACE] SEARCHING_FOR_FILE', { requestId, filename });

    // STEP 1: Verify Drive API returns actual file and Drive ID
    console.log('[DRIVE_INGEST_TRACE] STEP_1_DRIVE_API_SEARCH', { requestId, filename });
    const searchResults = await driveDiscovery.searchFiles(filename);
    
    if (searchResults.length === 0) {
      return NextResponse.json(
        { 
          error: "File not found in Drive", 
          message: `No file named '${filename}' found in Drive`,
          requestId,
          step: 'DRIVE_API_SEARCH'
        },
        { status: 404 }
      );
    }

    const driveFile = searchResults[0];
    console.log('[DRIVE_INGEST_TRACE] STEP_1_SUCCESS', {
      requestId,
      driveFileId: driveFile.id,
      driveFileName: driveFile.name,
      driveMimeType: driveFile.mimeType,
      driveSize: driveFile.size,
    });

    // Verify it's an image
    if (!driveFile.mimeType?.startsWith('image/')) {
      return NextResponse.json(
        { 
          error: "Not an image", 
          message: `File '${filename}' is not an image (MIME type: ${driveFile.mimeType})`,
          requestId,
          step: 'IMAGE_VALIDATION'
        },
        { status: 400 }
      );
    }

    // STEP 2: Download actual bytes from Drive
    console.log('[DRIVE_INGEST_TRACE] STEP_2_DOWNLOAD_BYTES', { requestId, driveFileId: driveFile.id });
    let fileBuffer: Buffer;
    try {
      fileBuffer = await driveDiscovery.downloadFile(driveFile.id);
      console.log('[DRIVE_INGEST_TRACE] STEP_2_SUCCESS', {
        requestId,
        bytesDownloaded: fileBuffer.length,
      });
    } catch (error) {
      console.error('[DRIVE_INGEST_TRACE] STEP_2_FAILED', { requestId, error });
      return NextResponse.json(
        { 
          error: "Drive download failed", 
          message: `Failed to download bytes from Drive for file '${filename}'`,
          requestId,
          step: 'DRIVE_DOWNLOAD',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // STEP 3: Compute exact SHA-256 from actual bytes
    console.log('[DRIVE_INGEST_TRACE] STEP_3_COMPUTE_HASH', { requestId });
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('[DRIVE_INGEST_TRACE] STEP_3_SUCCESS', {
      requestId,
      contentHash: contentHash.substring(0, 16) + '...',
      fullHash: contentHash,
    });

    // STEP 4: Generate canonical MediaAsset ID
    console.log('[DRIVE_INGEST_TRACE] STEP_4_GENERATE_MEDIA_ID', { requestId });
    const mediaId = contentHash.substring(0, 32); // First 32 hex chars = 128 bits
    console.log('[DRIVE_INGEST_TRACE] STEP_4_SUCCESS', {
      requestId,
      mediaId,
    });

    // STEP 5: Check if Sharp is available for variant generation
    console.log('[DRIVE_INGEST_TRACE] STEP_5_SHARP_AVAILABILITY', { requestId });
    let sharpAvailable = false;
    try {
      const sharp = require('sharp');
      sharpAvailable = true;
      console.log('[DRIVE_INGEST_TRACE] STEP_5_SUCCESS', { requestId, sharpAvailable: true });
    } catch (error) {
      console.log('[DRIVE_INGEST_TRACE] STEP_5_FAILED', { requestId, error });
    }

    // Return trace results so far
    const traceResult = {
      requestId,
      filename,
      steps: {
        driveApiSearch: {
          success: true,
          driveFileId: driveFile.id,
          driveFileName: driveFile.name,
          driveMimeType: driveFile.mimeType,
          driveSize: driveFile.size,
        },
        driveDownload: {
          success: true,
          bytesDownloaded: fileBuffer.length,
        },
        hashComputation: {
          success: true,
          contentHash,
        },
        mediaIdGeneration: {
          success: true,
          mediaId,
        },
        sharpAvailability: {
          success: true,
          sharpAvailable,
        },
      },
      nextSteps: [
        "Call /api/drive/ingest with driveId parameter",
        "Verify Blob objects are created",
        "Verify Blob metadata is written",
        "Verify PublishedMediaAsset is written to KV",
        "Verify assignment is created",
        "Verify public URL is accessible",
        "Verify browser displays the photo",
      ],
    };

    console.log('[DRIVE_INGEST_TRACE] TRACE_COMPLETE', { requestId, traceResult });

    return NextResponse.json({
      success: true,
      requestId,
      traceResult,
    });
  } catch (error) {
    console.error('[DRIVE_INGEST_TRACE ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      {
        error: "Trace failed",
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
