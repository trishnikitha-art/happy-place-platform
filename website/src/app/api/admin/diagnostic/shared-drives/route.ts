/**
 * Diagnostic Endpoint: Discover Shared Drive IDs
 * 
 * TEMPORARY: This endpoint is for production configuration discovery only.
 * Returns Google-accessible Shared Drive IDs without HPP authorization filtering.
 * This allows determining the actual Shared Drive ID to configure HPP_AUTHORIZED_SHARED_DRIVES.
 * 
 * SECURITY: This endpoint requires Workbench authentication.
 * Remove this endpoint after HPP_AUTHORIZED_SHARED_DRIVES is configured.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getDriveClient } from '@/lib/drive/oauth-manager';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  try {
    // Check Drive authentication
    const { isAuthenticated: isDriveAuthenticated } = await import('@/lib/drive/oauth-manager');
    if (!await isDriveAuthenticated()) {
      return NextResponse.json(
        { error: 'Not authenticated with Drive', message: 'Please authenticate with Google Drive first' },
        { status: 401 }
      );
    }

    // Get Drive client (canonical path through oauth-manager)
    const driveClient = await getDriveClient();

    // List all Google-accessible Shared Drives
    const drivesResponse = await driveClient.drives.list({
      pageSize: 100,
    });

    const sharedDrives = drivesResponse.data.drives?.map((drive: any) => ({
      id: drive.id,
      name: drive.name,
    })) || [];

    console.log('[DIAGNOSTIC] Google-accessible Shared Drives:', sharedDrives);

    return NextResponse.json({
      message: 'Google-accessible Shared Drives (diagnostic)',
      sharedDrives,
      instruction: 'Configure HPP_AUTHORIZED_SHARED_DRIVES environment variable with the desired Shared Drive ID(s)',
    });
  } catch (error) {
    console.error('[DIAGNOSTIC] Failed to list Shared Drives:', error);
    return NextResponse.json(
      { error: 'Failed to list Shared Drives', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
