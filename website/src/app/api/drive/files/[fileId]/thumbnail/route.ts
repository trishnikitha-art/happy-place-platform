/**
 * Drive Thumbnail Proxy API Route
 *
 * Fetches Drive files using Workbench user OAuth credentials.
 * Uses webContentLink to download actual image content.
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

    console.log('[THUMBNAIL_AUTH_RESOLVED]', { fileId, driveId, hasAuth: true });

    // Use Workbench user OAuth credentials
    const auth = await driveOAuthManager.getClient();
    const drive = google.drive({ version: 'v3', auth });

    console.log('[THUMBNAIL_DRIVE_FETCH_STARTED]', { fileId, driveId });

    // Get file metadata including webContentLink and mimeType
    const getFileParams: any = {
      fileId,
      fields: 'webContentLink,mimeType',
    };

    // Add Shared Drive support if driveId is provided
    if (driveId) {
      getFileParams.supportsAllDrives = true;
    }

    const file = await drive.files.get(getFileParams);
    const webContentLink = file.data.webContentLink;
    const mimeType = file.data.mimeType || 'image/jpeg';

    console.log('[THUMBNAIL_DRIVE_FETCH_SUCCESS]', { 
      fileId, 
      hasWebContentLink: !!webContentLink,
      mimeType 
    });

    if (!webContentLink) {
      console.error('[THUMBNAIL_REQUEST_FAILED]', { fileId, reason: 'no webContentLink' });
      return NextResponse.json(
        { error: 'File does not have webContentLink' },
        { status: 500 }
      );
    }

    console.log('[THUMBNAIL_DRIVE_FETCH_STARTED]', { fileId, webContentLink });

    // Download the actual file using webContentLink
    const tokenResponse = await auth.getAccessToken();
    const mediaResponse = await fetch(webContentLink, {
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
      },
    });

    console.log('[THUMBNAIL_RESPONSE_STATUS]', { 
      fileId, 
      status: mediaResponse.status, 
      statusText: mediaResponse.statusText 
    });

    if (!mediaResponse.ok) {
      console.error('[THUMBNAIL_REQUEST_FAILED]', { 
        fileId, 
        status: mediaResponse.status, 
        reason: 'Drive fetch failed' 
      });
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: mediaResponse.status }
      );
    }

    const imageBuffer = Buffer.from(await mediaResponse.arrayBuffer());
    const contentType = mediaResponse.headers.get('Content-Type') || mimeType;

    console.log('[THUMBNAIL_RESPONSE_CONTENT_TYPE]', { 
      fileId, 
      contentType,
      expectedContentType: mimeType 
    });

    console.log('[THUMBNAIL_RESPONSE_BYTES]', { 
      fileId, 
      size: imageBuffer.byteLength 
    });

    console.log('[THUMBNAIL_REQUEST_SUCCESS]', { fileId, contentType, size: imageBuffer.byteLength });

    // Return the image
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
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
