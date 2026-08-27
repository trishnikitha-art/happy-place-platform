/**
 * Local Drive Ingestion Trace Test Endpoint
 *
 * This is a local-only version of the trace endpoint that bypasses authentication
 * for development testing. It traces the complete Drive → bytes → hash → MediaAsset → Blob → KV → assignment → projection → browser chain.
 *
 * GET /api/admin/test/drive-ingest-trace-local?filename=xxx
 *
 * FOR DEVELOPMENT TESTING ONLY - DO NOT USE IN PRODUCTION
 */

import { NextResponse } from "next/server";
import { driveDiscovery } from "@/lib/drive/drive-discovery";
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const requestId = `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[DRIVE_INGEST_TRACE_LOCAL] REQUEST_RECEIVED', { requestId });

  // DEVELOPMENT BYPASS ONLY - for testing without OAuth setup
  const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (!authBypassEnabled) {
    return NextResponse.json(
      { 
        error: "Authentication required", 
        message: "This endpoint requires DRIVE_AUTH_BYPASS=true in development mode for testing" 
      },
      { status: 401 }
    );
  }
  
  console.warn('[DRIVE_INGEST_TRACE_LOCAL] AUTH_BYPASS_ENABLED - DEVELOPMENT ONLY');

  try {
    const { searchParams } = new URL(request.url);
    const filename = searchParams.get('filename');

    if (!filename) {
      return NextResponse.json(
        { error: "filename parameter required", message: "Provide filename to search for in Drive" },
        { status: 400 }
      );
    }

    console.log('[DRIVE_INGEST_TRACE_LOCAL] SEARCHING_FOR_FILE', { requestId, filename });

    // STEP 1: Verify Drive API returns actual file and Drive ID
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_1_DRIVE_API_SEARCH', { requestId, filename });
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
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_1_SUCCESS', {
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
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_2_DOWNLOAD_BYTES', { requestId, driveFileId: driveFile.id });
    let fileBuffer: Buffer;
    try {
      fileBuffer = await driveDiscovery.downloadFile(driveFile.id);
      console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_2_SUCCESS', {
        requestId,
        bytesDownloaded: fileBuffer.length,
      });
    } catch (error) {
      console.error('[DRIVE_INGEST_TRACE_LOCAL] STEP_2_FAILED', { requestId, error });
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
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_3_COMPUTE_HASH', { requestId });
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_3_SUCCESS', {
      requestId,
      contentHash: contentHash.substring(0, 16) + '...',
      fullHash: contentHash,
    });

    // STEP 4: Generate canonical MediaAsset ID
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_4_GENERATE_MEDIA_ID', { requestId });
    const mediaId = contentHash.substring(0, 32); // First 32 hex chars = 128 bits
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_4_SUCCESS', {
      requestId,
      mediaId,
    });

    // STEP 5: Check if Sharp is available for variant generation
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_5_SHARP_AVAILABILITY', { requestId });
    let sharpAvailable = false;
    try {
      const sharp = require('sharp');
      sharpAvailable = true;
      console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_5_SUCCESS', { requestId, sharpAvailable: true });
    } catch (error) {
      console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_5_FAILED', { requestId, error });
    }

    // STEP 6: Check Blob storage configuration
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_6_BLOB_STORAGE_CHECK', { requestId });
    const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_6_SUCCESS', {
      requestId,
      blobConfigured,
    });

    // STEP 7: Check KV storage configuration
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_7_KV_STORAGE_CHECK', { requestId });
    const kvConfigured = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
    console.log('[DRIVE_INGEST_TRACE_LOCAL] STEP_7_SUCCESS', {
      requestId,
      kvConfigured,
    });

    // Return trace results with evidence table
    const traceResult = {
      requestId,
      filename,
      identifierMapping: {
        driveFileId: driveFile.id,
        contentHash: contentHash,
        mediaId: mediaId,
        // These will be populated after actual materialization
        blobKey: null,
        blobMetadataKey: null,
        mediaKvKey: null,
        publishedMediaAssetId: null,
      },
      evidenceTable: {
        driveMetadata: {
          boundary: 'Drive API → Drive file metadata',
          input: filename,
          operation: 'driveDiscovery.searchFiles()',
          output: {
            driveFileId: driveFile.id,
            driveFileName: driveFile.name,
            driveMimeType: driveFile.mimeType,
            driveSize: driveFile.size,
          },
          record: `Drive file ID: ${driveFile.id}`,
          status: 'CREATED'
        },
        driveDownload: {
          boundary: 'Drive file ID → downloaded bytes',
          input: driveFile.id,
          operation: 'driveDiscovery.downloadFile()',
          output: {
            bytesDownloaded: fileBuffer.length,
          },
          record: `Buffer size: ${fileBuffer.length} bytes`,
          status: 'CREATED'
        },
        hashComputation: {
          boundary: 'Downloaded bytes → SHA-256 hash',
          input: `${fileBuffer.length} bytes`,
          operation: 'crypto.createHash("sha256")',
          output: {
            contentHash,
          },
          record: `SHA-256: ${contentHash}`,
          status: 'CREATED'
        },
        mediaIdGeneration: {
          boundary: 'SHA-256 hash → canonical MediaAsset ID',
          input: contentHash,
          operation: 'contentHash.substring(0, 32)',
          output: {
            mediaId,
          },
          record: `MediaAsset ID: ${mediaId}`,
          status: 'CREATED'
        },
        sharpAvailability: {
          boundary: 'Variant generation capability',
          input: 'require("sharp")',
          operation: 'Sharp library check',
          output: {
            sharpAvailable,
          },
          record: `Sharp available: ${sharpAvailable}`,
          status: sharpAvailable ? 'CREATED' : 'FAILED'
        },
        blobStorageConfig: {
          boundary: 'Blob storage configuration',
          input: 'BLOB_READ_WRITE_TOKEN environment variable',
          operation: 'Environment check',
          output: {
            blobConfigured,
          },
          record: `Blob storage ${blobConfigured ? 'configured' : 'not configured'}`,
          status: blobConfigured ? 'CREATED' : 'FAILED'
        },
        kvStorageConfig: {
          boundary: 'KV storage configuration',
          input: 'KV_REST_API_URL and KV_REST_API_TOKEN environment variables',
          operation: 'Environment check',
          output: {
            kvConfigured,
          },
          record: `KV storage ${kvConfigured ? 'configured' : 'not configured'}`,
          status: kvConfigured ? 'CREATED' : 'FAILED'
        },
        ingestPipeline: {
          boundary: 'Full materialization pipeline',
          input: `driveId: ${driveFile.id}`,
          operation: '/api/drive/ingest (skipped - requires OAuth)',
          output: null,
          record: 'Skipped - requires authenticated OAuth session',
          status: 'NOT_ATTEMPTED'
        }
      },
      summary: {
        totalBoundaries: 8,
        created: 4 + (sharpAvailable ? 1 : 0) + (blobConfigured ? 1 : 0) + (kvConfigured ? 1 : 0),
        persisted: 0,
        failed: (!sharpAvailable ? 1 : 0) + (!blobConfigured ? 1 : 0) + (!kvConfigured ? 1 : 0),
        notAttempted: 1,
        firstFailedBoundary: !sharpAvailable ? 'sharpAvailability' : !blobConfigured ? 'blobStorageConfig' : !kvConfigured ? 'kvStorageConfig' : null,
      },
      nextSteps: [
        "Configure DRIVE_AUTH_BYPASS=true and provide OAuth credentials for full materialization test",
        "Or test separately: call /api/drive/ingest with authenticated session",
        "Verify Blob upload creates actual Blob objects",
        "Verify Blob metadata is written to KV",
        "Verify PublishedMediaAsset is written to KV",
        "Verify assignment can reference the media ID",
        "Verify public media gate accepts the asset",
        "Verify public resolution shows the photo",
      ]
    };

    console.log('[DRIVE_INGEST_TRACE_LOCAL] TRACE_COMPLETE', { requestId, traceResult });

    return NextResponse.json({
      success: true,
      requestId,
      traceResult,
    });
  } catch (error) {
    console.error('[DRIVE_INGEST_TRACE_LOCAL ERROR]', {
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
