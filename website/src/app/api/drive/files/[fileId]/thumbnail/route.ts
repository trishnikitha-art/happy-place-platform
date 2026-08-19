/**
 * Drive Thumbnail Proxy API Route
 *
 * Fetches Drive files using server-side authentication.
 * Uses webContentLink to download actual image content.
 * Supports both My Drive and Shared Drive files.
 *
 * GET /api/drive/files/:fileId/thumbnail
 */

import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getGoogleAuth } from '@/lib/google';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;
    const { searchParams } = new URL(request.url);
    const driveId = searchParams.get('driveId') || undefined;

    console.log('[Drive Thumbnail] Request:', { fileId, driveId });

    // Use server-side OAuth credentials for public access
    let auth;
    try {
      auth = getGoogleAuth();
    } catch (error) {
      console.error('[Drive Thumbnail] Google auth credentials not configured:', error);
      return NextResponse.json(
        { 
          error: 'Google credentials not configured',
          message: 'GOOGLE_REFRESH_TOKEN environment variable is required for Drive thumbnail access'
        },
        { status: 500 }
      );
    }

    const drive = google.drive({ version: 'v3', auth });

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

    if (!webContentLink) {
      console.error('[Drive Thumbnail] File does not have webContentLink:', fileId);
      return NextResponse.json(
        { error: 'File does not have webContentLink' },
        { status: 500 }
      );
    }

    console.log('[Drive Thumbnail] Downloading file from webContentLink:', {
      fileId,
      mimeType,
    });

    // Download the actual file using webContentLink
    const tokenResponse = await auth.getAccessToken();
    const mediaResponse = await fetch(webContentLink, {
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
      },
    });

    if (!mediaResponse.ok) {
      console.error('[Drive Thumbnail] Failed to download file:', mediaResponse.status, mediaResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to download file' },
        { status: mediaResponse.status }
      );
    }

    const imageBuffer = Buffer.from(await mediaResponse.arrayBuffer());
    const contentType = mediaResponse.headers.get('Content-Type') || mimeType;

    console.log('[Drive Thumbnail] Successfully downloaded file:', {
      fileId,
      contentType,
      size: imageBuffer.byteLength,
    });

    // Return the image
    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('[Drive Thumbnail] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch thumbnail',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
