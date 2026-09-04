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
import { verifyFolderAuthorization, verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';

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

    // P0 FIX: Verify driveId against HPP authorized corpus
    // Google OAuth access is NOT sufficient for HPP authorization
    // Shared Drives must be explicitly configured via HPP_AUTHORIZED_SHARED_DRIVES
    // NO root exemption - if driveId is supplied, it must be HPP-authorized
    // This prevents driveId + root from bypassing corpus consistency check
    if (driveId) {
      const corpusAuth = await verifyCorpusAuthorization(folderId, driveId);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] DRIVE_ID_NOT_AUTHORIZED', {
          folderId,
          requestedDriveId: driveId,
          reason: corpusAuth.reason,
        });
        return NextResponse.json(
          {
            error: 'DRIVE_ID_NOT_AUTHORIZED',
            message: corpusAuth.reason || 'Shared Drive is not HPP-authorized (check HPP_AUTHORIZED_SHARED_DRIVES)',
          },
          { status: 403 }
        );
      }
      console.log('[DRIVE_AUTHORIZATION] DRIVE_ID_AUTHORIZED', {
        folderId,
        driveId,
        corpus: corpusAuth.corpus,
      });
    }

    // P0 FIX: Verify folderId is accessible to the authenticated session
    // This prevents IDOR where an authorized user could list arbitrary folder IDs
    // even if Google technically permits the object
    // CRITICAL: Shared Drive root (folderId === driveId) must also be authorized
    // The folderId !== 'root' check is insufficient for Shared Drive context
    if (folderId !== 'root' || driveId) {
      const folderAuth = await verifyFolderAuthorization(folderId);
      if (!folderAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] FOLDER_NOT_AUTHORIZED', {
          folderId,
          driveId,
          reason: folderAuth.reason,
        });
        return NextResponse.json(
          {
            error: 'DRIVE_FOLDER_NOT_AUTHORIZED',
            message: folderAuth.reason || 'Drive folder is not accessible to the authenticated session',
          },
          { status: 403 }
        );
      }
      
      console.log('[DRIVE_AUTHORIZATION] FOLDER_ACCESS_VERIFIED', {
        folderId,
        driveId,
        corpus: folderAuth.corpus,
      });
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
