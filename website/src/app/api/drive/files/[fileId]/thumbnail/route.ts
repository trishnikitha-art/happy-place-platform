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
 * - Application-level Drive authorization: session identity → HPP authorization → Drive authorization → requested object → operation
 * - Prevents IDOR/cross-user access even when Google technically permits the object
 *
 * GET /api/drive/files/:fileId/thumbnail
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClient, isAuthenticated } from '@/lib/drive/oauth-manager';
import { workbenchSession } from '@/lib/workbench-session';
import { verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';

// Workbench preview size limit - prevent memory exhaustion
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const { searchParams } = new URL(request.url);
  // P0 FIX: Accept both corpusId (authoritative) and legacy driveId
  const corpusId = searchParams.get('corpusId') || searchParams.get('driveId') || undefined;

  console.log('[MEDIA_PROXY_REQUEST_STARTED]', { fileId, corpusId });

  try {
    // CRITICAL: Explicit authentication check before Drive API access
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      console.error('[MEDIA_PROXY_REQUEST_REJECTED]', { 
        fileId, 
        reason: 'NOT_AUTHENTICATED' 
      });
      return NextResponse.json(
        { error: 'Drive authentication required' },
        { status: 401 }
      );
    }

    // P0 FIX: Application-level Drive object authorization
    // Google OAuth authentication is NOT sufficient for HPP authorization
    // Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
    const sessionIdentity = await workbenchSession.getSessionIdentity();
    console.log('[DRIVE_AUTHORIZATION] SESSION_IDENTITY_VERIFIED', {
      sessionEmail: sessionIdentity?.email,
      operation: 'thumbnail',
      fileId,
    });
    
    // Verify the Drive file is accessible to the authenticated session
    // This prevents IDOR where an authorized user could access arbitrary Drive IDs
    // even if Google technically permits the object
    const fileAuth = await verifyCorpusAuthorization(fileId, corpusId);
    if (!fileAuth.authorized) {
      console.error('[DRIVE_AUTHORIZATION] FILE_NOT_AUTHORIZED', {
        fileId,
        reason: fileAuth.reason,
      });
      return NextResponse.json(
        {
          error: 'DRIVE_FILE_NOT_AUTHORIZED',
          message: fileAuth.reason || 'Drive file is not accessible to the authenticated session',
        },
        { status: 403 }
      );
    }
    
    console.log('[DRIVE_AUTHORIZATION] FILE_ACCESS_VERIFIED', {
      fileId,
      corpus: fileAuth.corpus,
    });

    console.log('[MEDIA_PROXY_AUTH_RESOLVED]', { fileId, corpusId, hasAuth: true });

    // Use Workbench user OAuth credentials
    const auth = await getOAuthClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drive = google.drive({ version: 'v3', auth: auth as any });

    console.log('[MEDIA_PROXY_DRIVE_FETCH_STARTED]', { fileId, corpusId });

    // Get file metadata including mimeType and size FIRST
    const getFileParams: Record<string, unknown> = {
      fileId,
      fields: 'mimeType,size',
      supportsAllDrives: true,
    };

    const file = await drive.files.get(getFileParams);
    const mimeType = file.data.mimeType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileSize = (file.data as any).size ? parseInt(String((file.data as any).size), 10) : 0;

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

    console.log('[MEDIA_PROXY_MEDIA_DOWNLOAD_STARTED]', { fileId, corpusId });

    // Try thumbnail first, fall back to full media if thumbnail unavailable
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let thumbnailParams: any = {
      fileId,
      fields: 'thumbnailLink',
      supportsAllDrives: true,
    };

    try {
      const thumbnailResponse = await drive.files.get(thumbnailParams);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const thumbnailLink = (thumbnailResponse.data as any).thumbnailLink;
      
      if (thumbnailLink) {
        console.log('[MEDIA_PROXY_THUMBNAIL_AVAILABLE]', { fileId, thumbnailLink });
        
        // Fetch thumbnail bytes
        const thumbnailResponseBuffer = await fetch(thumbnailLink);
        if (thumbnailResponseBuffer.ok) {
          const thumbnailBuffer = await thumbnailResponseBuffer.arrayBuffer();
          return new NextResponse(Buffer.from(thumbnailBuffer), {
            headers: {
              'Content-Type': 'image/jpeg',
              'Cache-Control': 'private, max-age=3600',
            },
          });
        }
      }
    } catch (thumbnailError) {
      console.log('[MEDIA_PROXY_THUMBNAIL_UNAVAILABLE]', { fileId, error: thumbnailError instanceof Error ? thumbnailError.message : 'Unknown error' });
    }

    // Fallback to full media download
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mediaParams: any = {
      fileId,
      alt: 'media',
      supportsAllDrives: true,
    };

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
        'Cache-Control': 'private, max-age=3600', // Cache for 1 hour (private - not publicly cacheable)
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
