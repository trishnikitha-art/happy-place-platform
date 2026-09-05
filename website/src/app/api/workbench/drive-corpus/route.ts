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
 * 
 * CRITICAL: Respects corpus authorization - only exposes authorized Drive contexts
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getAuthorizedCorpora } from '@/lib/drive/corpus-authorization';

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
      // P0 FIX: Verify authorized corpora before returning discovery
      const authorizedCorpora = await getAuthorizedCorpora();
      
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
      
      // P0 FIX: Apply corpus authorization filtering
      // Only expose authorized My Drive and Shared Drives
      const myDriveAuthorized = authorizedCorpora.some(c => c.type === 'my_drive' && c.authorized);
      
      const filteredStructure = {
        ...structure,
        myDrive: myDriveAuthorized ? structure.myDrive : null,
        sharedDrives: structure.sharedDrives?.filter((drive: any) => 
          authorizedCorpora.some(c => c.id === drive.id && c.authorized)
        ) || [],
      };
      
      console.log('[WORKBENCH_DRIVE_CORPUS] Drive structure loaded:', {
        hasMyDrive: !!filteredStructure.myDrive,
        sharedDriveCount: filteredStructure.sharedDrives?.length || 0,
        myDriveAuthorized,
        authorizedCorpora: authorizedCorpora.map(c => ({ id: c.id, type: c.type, authorized: c.authorized })),
      });

      return NextResponse.json({
        success: true,
        structure: filteredStructure,
      });
    }

    if (action === 'getFiles') {
      const { folderId, driveId, pageToken } = body;
      
      // P0 FIX: Verify corpus authorization before returning files
      const authorizedCorpora = await getAuthorizedCorpora();
      
      // If driveId is provided, verify it's authorized
      if (driveId) {
        const isAuthorized = authorizedCorpora.some(c => c.id === driveId && c.authorized);
        if (!isAuthorized) {
          console.error('[WORKBENCH_DRIVE_CORPUS] Unauthorized Shared Drive access attempt:', { driveId });
          return NextResponse.json(
            { 
              error: 'UNAUTHORIZED_CORPUS',
              message: 'Shared Drive not authorized',
            },
            { status: 403 }
          );
        }
      }
      
      // If no driveId (My Drive), verify My Drive is authorized
      if (!driveId) {
        const myDriveAuthorized = authorizedCorpora.some(c => c.type === 'my_drive' && c.authorized);
        if (!myDriveAuthorized) {
          console.error('[WORKBENCH_DRIVE_CORPUS] Unauthorized My Drive access attempt');
          return NextResponse.json(
            { 
              error: 'UNAUTHORIZED_CORPUS',
              message: 'My Drive not authorized',
            },
            { status: 403 }
          );
        }
      }

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
        folderId,
        driveId,
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
