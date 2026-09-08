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
import { normalizeCorpusId, isMyDrive, MY_DRIVE_CANONICAL_ID, MY_DRIVE_PHYSICAL_ROOT_IDS } from '@/lib/drive/corpus-normalization';

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

    // P0 FIX: Normalize corpus identity for authorization
    // My Drive physical root IDs → canonical "root"
    // Shared Drive IDs → passed through unchanged
    // This normalized ID is for AUTHORIZATION only, not for Drive API calls
    const normalizedCorpusId = normalizeCorpusId(folderId, driveId);
    
    // P0 FIX: Preserve actual folder ID for Drive API calls
    // Only normalize folderId for My Drive physical root case
    // Shared Drive folder IDs must remain exactly as provided
    let actualFolderId = folderId;
    if (!driveId && MY_DRIVE_PHYSICAL_ROOT_IDS.has(folderId)) {
      actualFolderId = MY_DRIVE_CANONICAL_ID;
    }

    console.log('[Drive Files API] Identity Separation:', {
      originalFolderId: folderId,
      actualFolderId,
      normalizedCorpusId,
      driveId,
      isMyDrive: isMyDrive(folderId),
    });

    console.log('[Drive Files API] Request:', { actualFolderId, normalizedCorpusId, driveId, pageToken });

    // FORENSIC: Log Shared Drive root representation for debugging
    if (driveId && (actualFolderId === driveId || actualFolderId === MY_DRIVE_CANONICAL_ID)) {
      console.log('[DRIVE_FILES_FORENSIC] Shared Drive root request:', {
        actualFolderId,
        normalizedCorpusId,
        driveId,
        representation: actualFolderId === driveId ? 'Workbench (folderId === driveId)' : 'Legacy (folderId === root)',
      });
    }

    // P0 FIX: Verify driveId against HPP authorized corpus
    // Google OAuth access is NOT sufficient for HPP authorization
    // Shared Drives must be explicitly configured via HPP_AUTHORIZED_SHARED_DRIVES
    // NO root exemption - if driveId is supplied, it must be HPP-authorized
    // This prevents driveId + root from bypassing corpus consistency check
    // Handle both Shared Drive root representations: folderId === driveId (Workbench) and folderId === 'root' (legacy)
    if (driveId) {
      const corpusAuth = await verifyCorpusAuthorization(normalizedCorpusId, driveId);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] DRIVE_ID_NOT_AUTHORIZED', {
          actualFolderId,
          normalizedCorpusId,
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
        actualFolderId,
        normalizedCorpusId,
        driveId,
        corpus: corpusAuth.corpus,
      });
    } else if (isMyDrive(folderId)) {
      // P0 FIX: Enforce My Drive authorization for root case
      // When folderId === 'root' or physical root ID and driveId is undefined, this is My Drive root access
      const corpusAuth = await verifyCorpusAuthorization(MY_DRIVE_CANONICAL_ID, undefined);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] MY_DRIVE_NOT_AUTHORIZED', {
          originalFolderId: folderId,
          actualFolderId,
          normalizedCorpusId,
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
        actualFolderId,
        normalizedCorpusId,
        corpus: corpusAuth.corpus,
      });
    }

    // P0 FIX: Verify folderId is accessible to the authenticated session
    // This prevents IDOR where an authorized user could list arbitrary folder IDs
    // even if Google technically permits the object
    // Use normalized corpus ID for authorization check
    if (normalizedCorpusId !== MY_DRIVE_CANONICAL_ID || driveId) {
      const folderAuth = await verifyFolderAuthorization(normalizedCorpusId);
      if (!folderAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] FOLDER_NOT_AUTHORIZED', {
          originalFolderId: folderId,
          actualFolderId,
          normalizedCorpusId,
          driveId,
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
        actualFolderId,
        normalizedCorpusId,
      });
    }

    // P0 FIX: Use actual folder ID for Drive API calls
    // Preserve folder identity throughout navigation
    // Use driveId for corpus context only
    const result = await driveDiscovery.listChildren({
      parentId: actualFolderId,
      driveId,
    }, pageToken);

    console.log('[Drive Files API] Result:', {
      itemCount: result.items.length,
      folderCount: result.items.filter((i: any) => i.type === 'folder').length,
      fileCount: result.items.filter((i: any) => i.type !== 'folder').length,
      nextPageToken: result.nextPageToken,
      actualFolderId,
      driveId,
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
