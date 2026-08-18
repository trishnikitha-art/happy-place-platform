/**
 * Drive Children API Route
 *
 * Returns immediate children (folders and files) of a Drive folder.
 * Lazy loading with pagination support.
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
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;
    const driveId = searchParams.get('driveId') || undefined;

    const result = await driveDiscovery.listChildren(
      { parentId: folderId, driveId },
      pageToken
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Drive children error:', error);
    return NextResponse.json(
      {
        error: 'Failed to load folder children',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
