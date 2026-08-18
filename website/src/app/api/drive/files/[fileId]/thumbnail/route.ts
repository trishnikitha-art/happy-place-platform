/**
 * Drive Thumbnail Proxy API Route
 *
 * Fetches Drive thumbnails using server-side authentication.
 * Avoids CORS issues and short-lived URL problems.
 *
 * GET /api/drive/files/:fileId/thumbnail
 */

import { NextResponse } from 'next/server';
import { driveOAuthManager } from '@/lib/drive/oauth-manager';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    const { fileId } = await params;

    // Get Drive client with authentication
    const drive = await driveOAuthManager.getDriveClient();

    // Get file metadata including thumbnailLink
    const file = await drive.files.get({
      fileId,
      fields: 'thumbnailLink',
    });

    if (!file.data.thumbnailLink) {
      return NextResponse.json(
        { error: 'No thumbnail available' },
        { status: 404 }
      );
    }

    // Fetch thumbnail with authentication
    const thumbnailResponse = await fetch(file.data.thumbnailLink, {
      headers: {
        Authorization: `Bearer ${(await driveOAuthManager.getClient()).credentials.access_token}`,
      },
    });

    if (!thumbnailResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch thumbnail' },
        { status: thumbnailResponse.status }
      );
    }

    // Return the image
    const imageBuffer = await thumbnailResponse.arrayBuffer();

    return new NextResponse(imageBuffer, {
      headers: {
        'Content-Type': thumbnailResponse.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Drive thumbnail error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch thumbnail',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
