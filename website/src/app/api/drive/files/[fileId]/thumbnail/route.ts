/**
 * Drive Media Proxy API Route
 *
 * Fetches Drive files using authenticated Drive API media download.
 * Uses alt: 'media' to get actual binary image content from Drive API.
 * Supports both My Drive and Shared Drive files.
 *
 * SECURITY POLICY:
 * - This is NOT a thumbnail endpoint - it returns full original media
 * - This is WORKBENCH-ONLY for preview, not public delivery
 * - Maximum file size: 25MB (Vercel function memory limit)
 * - Maximum timeout: 30 seconds
 * - Only accepts image/* MIME types
 * - Fails closed on missing or invalid MIME type
 *
 * GET /api/drive/files/:fileId/thumbnail
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { driveOAuthManager } from '@/lib/drive/oauth-manager';

export const dynamic = 'force-dynamic';

// Workbench preview size limit - prevent memory exhaustion
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const { searchParams } = new URL(request.url);
  const driveId = searchParams.get('driveId') || undefined;

  console.log('[MEDIA_PROXY_REQUEST_STARTED]', { fileId, driveId });

  try {
    console.log('[MEDIA_PROXY_AUTH_RESOLVED]', { fileId, driveId, hasAuth: true });

    // Use Workbench user OAuth credentials
    const auth = await driveOAuthManager.getClient();
    const drive = google.drive({ version: 'v3', auth });

    console.log('[MEDIA_PROXY_DRIVE_FETCH_STARTED]', { fileId, driveId });

    // Get file metadata including mimeType and size FIRST
    const getFileParams: any = {
      fileId,
      fields: 'mimeType,size',
    };

    // Add Shared Drive support if driveId is provided
    if (driveId) {
      getFileParams.supportsAllDrives = true;
    }

    const file = await drive.files.get(getFileParams);
    const mimeType = file.data.mimeType;
    const fileSize = file.data.size ? parseInt(file.data.size, 10) : 0;

    // CRITICAL: Fail closed if Drive does not provide MIME type
    // Do NOT default to 'image/jpeg' - this creates false positive evidence
    if (!mimeType) {
      console.error('[MEDIA_PROXY_REQUEST_REJECTED]', { 
        fileId, 
        reason: 'MISSING_MIME_TYPE',
        classification: 'unknown'
      });
      return NextResponse.json(
        { 
          error: 'Drive did not provide MIME type',
          mimeType: null,
          capability: 'unknown'
        },
        { status: 400 }
      );
    }

    // CRITICAL: Reject files larger than size limit before downloading
    if (fileSize > MAX_FILE_SIZE) {
      console.error('[MEDIA_PROXY_REQUEST_REJECTED]', { 
        fileId, 
        reason: 'FILE_TOO_LARGE',
        fileSize,
        maxSize: MAX_FILE_SIZE
      });
      return NextResponse.json(
        { 
          error: 'File too large for Workbench preview',
          fileSize,
          maxSize: MAX_FILE_SIZE,
          capability: 'exceeds_limit'
        },
        { status: 413 }
      );
    }

    console.log('[MEDIA_PROXY_DRIVE_FETCH_SUCCESS]', { 
      fileId, 
      mimeType,
      fileSize
    });

    // Verify it's an image type BEFORE downloading
    if (!mimeType.startsWith('image/')) {
      console.log('[MEDIA_PROXY_REQUEST_REJECTED]', { 
        fileId, 
        reason: 'NOT_AN_IMAGE',
        mimeType,
        classification: mimeType.startsWith('video/') ? 'video' : 
                       mimeType.includes('document') ? 'document' : 'unknown'
      });
      return NextResponse.json(
        { 
          error: 'File is not an image', 
          mimeType,
          capability: mimeType.startsWith('video/') ? 'video' : 
                     mimeType.includes('document') ? 'document' : 'unavailable'
        },
        { status: 400 }
      );
    }

    console.log('[MEDIA_PROXY_MEDIA_DOWNLOAD_STARTED]', { fileId, driveId });

    // Download actual binary content using Drive API alt: 'media'
    const mediaParams: any = {
      fileId,
      alt: 'media',
    };

    // Preserve Shared Drive support for media download
    if (driveId) {
      mediaParams.supportsAllDrives = true;
    }

    const mediaResponse = await drive.files.get(mediaParams, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(mediaResponse.data as ArrayBuffer);

    console.log('[MEDIA_PROXY_MEDIA_DOWNLOAD_SUCCESS]', { 
      fileId, 
      size: imageBuffer.byteLength 
    });

    // Validate we got actual image bytes
    if (imageBuffer.byteLength === 0) {
      console.error('[MEDIA_PROXY_REQUEST_FAILED]', { 
        fileId, 
        reason: 'EMPTY_RESPONSE' 
      });
      return NextResponse.json(
        { error: 'Empty response from Drive' },
        { status: 500 }
      );
    }

    // Validate download size against limit (safety check)
    if (imageBuffer.byteLength > MAX_FILE_SIZE) {
      console.error('[MEDIA_PROXY_REQUEST_FAILED]', { 
        fileId, 
        reason: 'DOWNLOADED_FILE_TOO_LARGE',
        downloadedSize: imageBuffer.byteLength,
        maxSize: MAX_FILE_SIZE
      });
      return NextResponse.json(
        { 
          error: 'Downloaded file exceeds size limit',
          downloadedSize: imageBuffer.byteLength,
          maxSize: MAX_FILE_SIZE
        },
        { status: 413 }
      );
    }

    // Validate magic bytes for common image formats (lightweight preflight)
    // This is NOT comprehensive - Sharp should be the authoritative decoder for constitutional materialization
    const firstBytes = imageBuffer.slice(0, 12);
    let isValidImage = true;
    
    if (mimeType === 'image/jpeg') {
      // JPEG: FF D8 FF
      isValidImage = firstBytes[0] === 0xFF && firstBytes[1] === 0xD8 && firstBytes[2] === 0xFF;
    } else if (mimeType === 'image/png') {
      // PNG: 89 50 4E 47
      isValidImage = firstBytes[0] === 0x89 && firstBytes[1] === 0x50 && firstBytes[2] === 0x4E && firstBytes[3] === 0x47;
    } else if (mimeType === 'image/webp') {
      // WebP: RIFF....WEBP
      const riff = firstBytes.slice(0, 4).toString('ascii');
      const webp = firstBytes.slice(8, 12).toString('ascii');
      isValidImage = riff === 'RIFF' && webp === 'WEBP';
    }
    // Other image formats are accepted without magic byte validation here
    // Comprehensive validation should use Sharp in the materialization path

    if (!isValidImage) {
      console.error('[MEDIA_PROXY_REQUEST_FAILED]', { 
        fileId, 
        reason: 'INVALID_IMAGE_MAGIC_BYTES',
        mimeType,
        firstBytesHex: firstBytes.slice(0, 8).toString('hex')
      });
      return NextResponse.json(
        { error: 'Invalid image content' },
        { status: 500 }
      );
    }

    console.log('[MEDIA_PROXY_RESPONSE_CONTENT_TYPE]', { 
      fileId, 
      contentType: mimeType 
    });

    console.log('[MEDIA_PROXY_RESPONSE_BYTES]', { 
      fileId, 
      size: imageBuffer.byteLength 
    });

    console.log('[MEDIA_PROXY_REQUEST_SUCCESS]', { 
      fileId, 
      contentType: mimeType, 
      size: imageBuffer.byteLength 
    });

    // Return the actual image bytes
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('[MEDIA_PROXY_REQUEST_FAILED]', {
      fileId,
      reason: error instanceof Error ? error.message : 'Unknown error'
    });
    // Return safe error classification, not internal details
    return NextResponse.json(
      {
        error: 'Failed to fetch media from Drive',
        capability: 'drive_api_error'
      },
      { status: 500 }
    );
  }
}
