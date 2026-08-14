/**
 * Drive Files API Route
 * 
 * Lists files in a Drive folder for browsing.
 * Automatically handles folder navigation without manual path entry.
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

    const files = await driveDiscovery.listFiles(folderId);
    return NextResponse.json({ files });
  } catch (error) {
    console.error('Drive files error:', error);
    return NextResponse.json(
      { error: 'Failed to list Drive files', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
