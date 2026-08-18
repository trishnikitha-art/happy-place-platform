/**
 * Drive Files API Route
 *
 * Lists immediate children (folders and files) of a Drive folder.
 * Lazy loading with pagination support.
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    // Proceed without authentication
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }
  }

  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId') || 'root';
    const pageToken = searchParams.get('pageToken') || undefined;
    const driveId = searchParams.get('driveId') || undefined;

    console.log('[Drive Files API] Request:', { folderId, driveId, pageToken });

    const result = await driveDiscovery.listChildren(
      { parentId: folderId, driveId },
      pageToken
    );

    console.log('[Drive Files API] Result:', {
      itemCount: result.items.length,
      folderCount: result.items.filter((i: any) => i.type === 'folder').length,
      fileCount: result.items.filter((i: any) => i.type !== 'folder').length,
      nextPageToken: result.nextPageToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Drive Files API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to list Drive files', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
