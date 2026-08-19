/**
 * Drive Thumbnail Proxy API Route
 *
 * Fetches Drive thumbnails using server-side authentication.
 * Avoids CORS issues and short-lived URL problems.
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
    const auth = getGoogleAuth();
    const drive = google.drive({ version: 'v3', auth });

    // Get file metadata including thumbnailLink
    const getFileParams: any = {
      fileId,
      fields: 'thumbnailLink',
    };

    // Add Shared Drive support if driveId is provided
    if (driveId) {
      getFileParams.supportsAllDrives = true;
    }

    const file = await drive.files.get(getFileParams);

    if (!file.data.thumbnailLink) {
      console.log('[Drive Thumbnail] No thumbnail available for file:', fileId);
      return NextResponse.json(
        { error: 'No thumbnail available' },
        { status: 404 }
      );
    }

    console.log('[Drive Thumbnail] Fetching thumbnail from:', file.data.thumbnailLink);

    // Fetch thumbnail with authentication
    const tokenResponse = await auth.getAccessToken();
    const thumbnailResponse = await fetch(file.data.thumbnailLink, {
      headers: {
        Authorization: `Bearer ${tokenResponse.token}`,
      },
    });

    if (!thumbnailResponse.ok) {
      console.error('[Drive Thumbnail] Failed to fetch thumbnail:', thumbnailResponse.status, thumbnailResponse.statusText);
      return NextResponse.json(
        { error: 'Failed to fetch thumbnail' },
        { status: thumbnailResponse.status }
      );
    }

    // Return the image
    const imageBuffer = await thumbnailResponse.arrayBuffer();

    console.log('[Drive Thumbnail] Successfully fetched thumbnail:', {
      fileId,
      contentType: thumbnailResponse.headers.get('Content-Type'),
      size: imageBuffer.byteLength,
    });

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': thumbnailResponse.headers.get('Content-Type') || 'image/jpeg',
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
