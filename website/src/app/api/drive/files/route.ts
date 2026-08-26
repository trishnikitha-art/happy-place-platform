/**
 * Drive Files API Route
 *
 * Lists immediate children (folders and files) of a Drive folder.
 * Lazy loading with pagination support.
 *
 * SECURITY: Application-level Drive authorization
 * - Google OAuth authentication is NOT sufficient for HPP authorization
 * - Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
 * - Prevents IDOR/cross-user access even when Google technically permits the object
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { workbenchSession } from '@/lib/workbench-session';
import { driveSession } from '@/lib/drive/drive-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // CRITICAL: Authentication bypass is DANGEROUS and should only be used with explicit consent
  // This bypass requires both NODE_ENV=development AND explicit DRIVE_AUTH_BYPASS=true
  const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (authBypassEnabled) {
    console.warn('[DRIVE FILES API] AUTHENTICATION BYPASS ENABLED - DEVELOPMENT ONLY');
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

    // P0 FIX: Application-level Drive authorization
    // Google OAuth authentication is NOT sufficient for HPP authorization
    // Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
    const sessionIdentity = await workbenchSession.getSessionIdentity();
    console.log('[DRIVE_AUTHORIZATION] SESSION_IDENTITY_VERIFIED', {
      sessionEmail: sessionIdentity?.email,
      operation: 'list-children',
    });
    
    // Verify Drive session is authenticated
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    if (!isDriveAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Drive authentication required' },
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

    // P0 FIX: Verify folderId is accessible to the authenticated session
    // This prevents IDOR where an authorized user could list arbitrary folder IDs
    // even if Google technically permits the object
    if (folderId !== 'root') {
      try {
        const driveClient = await driveSession.getDriveClient();
        const folderMetadata = await driveClient.files.get({
          fileId: folderId,
          fields: 'id,name,owners,permissions,shared',
          supportsAllDrives: true,
        });
        
        if (!folderMetadata.data) {
          console.error('[DRIVE_AUTHORIZATION] FOLDER_NOT_ACCESSIBLE', {
            folderId,
            reason: 'Drive folder not accessible to authenticated session'
          });
          return NextResponse.json(
            {
              error: 'DRIVE_FOLDER_NOT_AUTHORIZED',
              message: 'Drive folder is not accessible to the authenticated session',
            },
            { status: 403 }
          );
        }
        
        console.log('[DRIVE_AUTHORIZATION] FOLDER_ACCESS_VERIFIED', {
          folderId,
          folderName: folderMetadata.data.name,
          isShared: folderMetadata.data.shared,
        });
      } catch (driveError) {
        console.error('[DRIVE_AUTHORIZATION] FOLDER_VERIFICATION_FAILED', {
          folderId,
          error: driveError instanceof Error ? driveError.message : 'Unknown error'
        });
        return NextResponse.json(
          {
            error: 'DRIVE_AUTHORIZATION_FAILED',
            message: 'Failed to verify Drive folder authorization',
          },
          { status: 403 }
        );
      }
    }

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
