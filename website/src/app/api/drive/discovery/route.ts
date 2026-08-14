/**
 * Drive Discovery API Route
 * 
 * Exposes automatic Drive discovery to the Media Runtime.
 * Returns My Drive, Shared Drives, HPP folders, and recent folders.
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET() {
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
    const structure = await driveDiscovery.discoverStructure();
    return NextResponse.json(structure);
  } catch (error) {
    console.error('Drive discovery error:', error);
    return NextResponse.json(
      { error: 'Failed to discover Drive structure', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
