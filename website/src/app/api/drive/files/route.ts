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
import { normalizeCorpusId, isMyDrive, MY_DRIVE_CANONICAL_ID } from '@/lib/drive/corpus-normalization';

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
    // P0 FIX: Accept both driveId (legacy) and corpusId (new) for compatibility
    // corpusId is the authoritative field from the UI's corpus context preservation
    const driveId = searchParams.get('corpusId') || searchParams.get('driveId') || undefined;

    // P0 FIX: Normalize corpus identity before authorization
    // My Drive physical root IDs → canonical "root"
    // Shared Drive IDs → passed through unchanged
    const normalizedFolderId = normalizeCorpusId(folderId, driveId);
    const normalizedDriveId = driveId;

    console.log('[Drive Files API] Corpus Normalization:', {
      originalFolderId: folderId,
      normalizedFolderId,
      driveId,
      isMyDrive: isMyDrive(folderId),
    });

    console.log('[Drive Files API] Request:', { normalizedFolderId, normalizedDriveId, pageToken });

    // FORENSIC: Log Shared Drive root representation for debugging
    if (normalizedDriveId && (normalizedFolderId === normalizedDriveId || normalizedFolderId === MY_DRIVE_CANONICAL_ID)) {
      console.log('[DRIVE_FILES_FORENSIC] Shared Drive root request:', {
        normalizedFolderId,
        normalizedDriveId,
        representation: normalizedFolderId === normalizedDriveId ? 'Workbench (folderId === driveId)' : 'Legacy (folderId === root)',
      });
    }

    // P0 FIX: Verify driveId against HPP authorized corpus
    // Google OAuth access is NOT sufficient for HPP authorization
    // Shared Drives must be explicitly configured via HPP_AUTHORIZED_SHARED_DRIVES
    // NO root exemption - if driveId is supplied, it must be HPP-authorized
    // This prevents driveId + root from bypassing corpus consistency check
    // Handle both Shared Drive root representations: folderId === driveId (Workbench) and folderId === 'root' (legacy)
    if (normalizedDriveId) {
      const corpusAuth = await verifyCorpusAuthorization(normalizedFolderId, normalizedDriveId);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] DRIVE_ID_NOT_AUTHORIZED', {
          normalizedFolderId,
          requestedDriveId: normalizedDriveId,
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
        normalizedFolderId,
        normalizedDriveId,
        corpus: corpusAuth.corpus,
      });
    } else if (isMyDrive(folderId)) {
      // P0 FIX: Enforce My Drive authorization for root case
      // When folderId === 'root' or physical root ID and driveId is undefined, this is My Drive root access
      const corpusAuth = await verifyCorpusAuthorization(MY_DRIVE_CANONICAL_ID, undefined);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] MY_DRIVE_NOT_AUTHORIZED', {
          originalFolderId: folderId,
          normalizedFolderId,
          reason: corpusAuth.reason,
        });
        return NextResponse.json(
          {
            error: 'MY_DRIVE_NOT_AUTHORIZED',
            message: corpusAuth.reason || 'My Drive is not HPP-authorized',
          },
          { status: 403 }
        );
      }
      console.log('[DRIVE_AUTHORIZATION] MY_DRIVE_AUTHORIZED', {
        originalFolderId: folderId,
        normalizedFolderId,
        corpus: corpusAuth.corpus,
      });
    }

    // P0 FIX: Verify folderId is accessible to the authenticated session
    // This prevents IDOR where an authorized user could list arbitrary folder IDs
    // even if Google technically permits the object
    // Use normalized folder ID for authorization check
    if (normalizedFolderId !== MY_DRIVE_CANONICAL_ID || normalizedDriveId) {
      const folderAuth = await verifyFolderAuthorization(normalizedFolderId);
      if (!folderAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] FOLDER_NOT_AUTHORIZED', {
          originalFolderId: folderId,
          normalizedFolderId,
          normalizedDriveId,
          reason: folderAuth.reason,
        });
        return NextResponse.json(
          {
            error: 'FOLDER_NOT_AUTHORIZED',
            message: folderAuth.reason || 'Folder is not accessible to the authenticated session',
          },
          { status: 403 }
        );
      }
      console.log('[DRIVE_AUTHORIZATION] FOLDER_AUTHORIZED', {
        originalFolderId: folderId,
        normalizedFolderId,
      });
    }

    // Use normalized IDs for Drive discovery call
    const result = await driveDiscovery.listChildren({
      parentId: normalizedFolderId,
      driveId: normalizedDriveId,
    }, pageToken);

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
