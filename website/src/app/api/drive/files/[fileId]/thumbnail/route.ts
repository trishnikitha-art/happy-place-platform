/**
 * Drive Thumbnail Proxy API Route
 *
 * Fetches Drive files using authenticated Drive API media download.
 * Uses alt: 'media' to get actual binary image content from Drive API.
 * Supports both My Drive and Shared Drive files.
 *
 * GET /api/drive/files/:fileId/thumbnail
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { driveOAuthManager } from '@/lib/drive/oauth-manager';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const { searchParams } = new URL(request.url);
  const driveId = searchParams.get('driveId') || undefined;

  console.log('[THUMBNAIL_REQUEST_STARTED]', { fileId, driveId });

  try {
    console.log('[THUMBNAIL_AUTH_RESOLVED]', { fileId, driveId, hasAuth: true });

    // Use Workbench user OAuth credentials
    const auth = await driveOAuthManager.getClient();
    const drive = google.drive({ version: 'v3', auth });

    console.log('[THUMBNAIL_DRIVE_FETCH_STARTED]', { fileId, driveId });

    // Get file metadata including mimeType
    const getFileParams: any = {
      fileId,
      fields: 'mimeType',
    };

    // Add Shared Drive support if driveId is provided
    if (driveId) {
      getFileParams.supportsAllDrives = true;
    }

    const file = await drive.files.get(getFileParams);
    const mimeType = file.data.mimeType || 'image/jpeg';

    console.log('[THUMBNAIL_DRIVE_FETCH_SUCCESS]', { 
      fileId, 
      mimeType 
    });

    // Verify it's an image type
    if (!mimeType.startsWith('image/')) {
      console.error('[THUMBNAIL_REQUEST_FAILED]', { 
        fileId, 
        reason: 'NOT_AN_IMAGE',
        mimeType 
      });
      return NextResponse.json(
        { error: 'File is not an image', mimeType },
        { status: 400 }
      );
    }

    console.log('[THUMBNAIL_MEDIA_DOWNLOAD_STARTED]', { fileId, driveId });

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

    console.log('[THUMBNAIL_MEDIA_DOWNLOAD_SUCCESS]', { 
      fileId, 
      size: imageBuffer.byteLength 
    });

    // Validate we got actual image bytes
    if (imageBuffer.byteLength === 0) {
      console.error('[THUMBNAIL_REQUEST_FAILED]', { 
        fileId, 
        reason: 'EMPTY_RESPONSE' 
      });
      return NextResponse.json(
        { error: 'Empty response from Drive' },
        { status: 500 }
      );
    }

    // Optional: Validate magic bytes for common image formats
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

    if (!isValidImage) {
      console.error('[THUMBNAIL_REQUEST_FAILED]', { 
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

    console.log('[THUMBNAIL_RESPONSE_CONTENT_TYPE]', { 
      fileId, 
      contentType: mimeType 
    });

    console.log('[THUMBNAIL_RESPONSE_BYTES]', { 
      fileId, 
      size: imageBuffer.byteLength 
    });

    console.log('[THUMBNAIL_REQUEST_SUCCESS]', { 
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
    console.error('[THUMBNAIL_REQUEST_FAILED]', {
      fileId,
      reason: error instanceof Error ? error.message : 'Unknown error'
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch thumbnail',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
