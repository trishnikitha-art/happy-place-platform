/**
 * Drive Children API Route
 *
 * Returns immediate children (folders and files) of a Drive folder.
 * Lazy loading with pagination support.
 *
 * SECURITY: Application-level Drive authorization
 * - Google OAuth authentication is NOT sufficient for HPP authorization
 * - Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
 * - Prevents IDOR/cross-corpus access even when Google technically permits the object
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { workbenchSession } from '@/lib/workbench-session';
import { driveSession } from '@/lib/drive/drive-session';
import { verifyFolderAuthorization, verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  // CRITICAL: Authentication bypass is DANGEROUS and should only be used with explicit consent
  // This bypass requires both NODE_ENV=development AND explicit DRIVE_AUTH_BYPASS=true
  const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (authBypassEnabled) {
    console.warn('[DRIVE FOLDER API] AUTHENTICATION BYPASS ENABLED - DEVELOPMENT ONLY');
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

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
    const { folderId } = await params;
    const { searchParams } = new URL(request.url);
    const pageToken = searchParams.get('pageToken') || undefined;
    const driveId = searchParams.get('driveId') || undefined;

    console.log('[DRIVE FOLDER API] Request:', { folderId, driveId, pageToken });

    // CRITICAL: Verify driveId and folderId consistency
    // If driveId is supplied, verify the folder actually belongs to that corpus
    // CRITICAL: Shared Drive root (folderId === driveId) must also be authorized
    // The folderId !== 'root' check is insufficient for Shared Drive context
    if (driveId && (folderId !== 'root' || folderId === driveId)) {
      const corpusAuth = await verifyCorpusAuthorization(folderId, driveId);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] DRIVE_ID_FOLDER_ID_MISMATCH', {
          folderId,
          requestedDriveId: driveId,
          reason: corpusAuth.reason,
        });
        return NextResponse.json(
          {
            error: 'DRIVE_ID_FOLDER_ID_MISMATCH',
            message: corpusAuth.reason || 'Folder does not belong to the requested Drive corpus',
          },
          { status: 403 }
        );
      }
      console.log('[DRIVE_AUTHORIZATION] DRIVE_ID_FOLDER_ID_CONSISTENT', {
        folderId,
        driveId,
        corpus: corpusAuth.corpus,
      });
    }

    // Verify folder authorization
    const folderAuth = await verifyFolderAuthorization(folderId);
    if (!folderAuth.authorized) {
      console.error('[DRIVE_AUTHORIZATION] FOLDER_NOT_AUTHORIZED', {
        folderId,
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
      corpus: folderAuth.corpus,
    });

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
