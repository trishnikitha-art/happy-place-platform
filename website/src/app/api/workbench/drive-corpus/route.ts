/**
 * Workbench Drive Corpus API Route
 *
 * Exposes Drive corpus (My Drive + Shared Drives) to the Workbench for browsing and selection.
 * 
 * This provides the Workbench with direct access to Drive source material before materialization.
 * 
 * The intended architecture:
 * Drive = source material
 * PING90/HPP media authority = canonical authority
 * Workbench = human control surface
 * 
 * POST /api/workbench/drive-corpus - Returns Drive structure and files
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Verify Workbench authentication before exposing Drive data
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { 
        error: 'WORKBENCH_AUTH_REQUIRED',
        message: 'Workbench authentication required',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'getStructure') {
      // Forward to Drive discovery to get My Drive and Shared Drives
      const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/discovery`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Forward the session cookie for Drive authentication
          'Cookie': request.headers.get('cookie') || '',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WORKBENCH_DRIVE_CORPUS] Drive discovery failed:', {
          status: response.status,
          error: errorText,
        });
        return NextResponse.json(
          { 
            error: 'DRIVE_DISCOVERY_FAILED',
            message: errorText || 'Failed to discover Drive structure',
          },
          { status: response.status }
        );
      }

      const structure = await response.json();
      console.log('[WORKBENCH_DRIVE_CORPUS] Drive structure loaded:', {
        hasMyDrive: !!structure.myDrive,
        sharedDriveCount: structure.sharedDrives?.length || 0,
      });

      return NextResponse.json({
        success: true,
        structure,
      });
    }

    if (action === 'getFiles') {
      const { folderId, driveId, pageToken } = body;

      // Forward to Drive files API with corpus context
      const params = new URLSearchParams({ folderId });
      if (pageToken) params.append('pageToken', pageToken);
      if (driveId) params.append('driveId', driveId);

      const response = await fetch(`${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/files?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': request.headers.get('cookie') || '',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[WORKBENCH_DRIVE_CORPUS] Drive files failed:', {
          status: response.status,
          error: errorText,
        });
        return NextResponse.json(
          { 
            error: 'DRIVE_FILES_FAILED',
            message: errorText || 'Failed to load Drive files',
          },
          { status: response.status }
        );
      }

      const data = await response.json();
      console.log('[WORKBENCH_DRIVE_CORPUS] Drive files loaded:', {
        itemCount: data.items?.length || 0,
        hasNextPage: !!data.nextPageToken,
      });

      return NextResponse.json({
        success: true,
        items: data.items,
        nextPageToken: data.nextPageToken,
      });
    }

    return NextResponse.json(
      { error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    console.error('[WORKBENCH_DRIVE_CORPUS] Error:', error);
    return NextResponse.json(
      { 
        error: 'Drive corpus query failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
