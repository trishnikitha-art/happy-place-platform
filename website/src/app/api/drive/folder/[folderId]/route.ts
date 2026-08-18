/**
 * Drive Folder Tree API Route
 *
 * Returns the folder tree structure with files and subfolders.
 * Used by Drive Explorer for hierarchical navigation.
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
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
    const { folderId } = await params;

    // Get folder tree with limited depth (3 levels)
    const folderTree = await driveDiscovery.getFolderTree(folderId, 3);

    return NextResponse.json(folderTree);
  } catch (error) {
    console.error('Drive folder tree error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load folder tree',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
