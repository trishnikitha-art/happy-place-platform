/**
 * Drive Reference API Route
 *
 * Creates a lightweight media record that references a Drive object directly.
 * Does not download the file; uses Drive's thumbnail and view URLs.
 * Stores in KV store for dynamic persistence (media.v1.json is static build artifact).
 *
 * SECURITY: Application-level Drive authorization
 * - Google OAuth authentication is NOT sufficient for HPP authorization
 * - Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
 * - Prevents IDOR/cross-user access even when Google technically permits the object
 *
 * POST /api/drive/reference
 * Body: { fileId: string, sharedDriveId?: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { storeMedia, getMedia } from '@/lib/media-kv-store';
import type { Media, MediaRole, MediaLifecycleState } from '@/types/media';
import crypto from 'crypto';
import { verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';

interface ReferenceRequest {
  fileId: string;
  sharedDriveId?: string;
  projectId?: string;
  roles?: MediaRole[];
}

/**
 * Drive-specific lightweight reference type
 * Distinguishes Drive metadata from fully materialized Media assets
 */
interface DriveReference {
  id: string;
  sourceIdentityHash: string; // Not contentHash - this is source identity
  source: 'google-drive';
  lifecycleState: MediaLifecycleState; // Explicit lifecycle state
  drive: {
    fileId: string;
    driveId?: string;
    name: string;
    mimeType: string;
    webViewUrl: string;
    modifiedTime: string;
  };
  filename: string;
  type: 'image' | 'document';
  thumbnailProxyUrl: string;
  projectId?: string;
  roles: MediaRole[];
  createdAt: string;
  updatedAt: string;
}

export async function POST(request: Request) {
  try {
    const body: ReferenceRequest = await request.json();
    const { fileId, sharedDriveId, projectId, roles = ['gallery'] } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // CRITICAL: Authentication bypass is DANGEROUS and should only be used with explicit consent
    // This bypass requires both NODE_ENV=development AND explicit DRIVE_AUTH_BYPASS=true
    const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
    
    if (authBypassEnabled) {
      console.warn('[DRIVE REFERENCE API] AUTHENTICATION BYPASS ENABLED - DEVELOPMENT ONLY');
    } else {
      // Check Drive authentication
      const isDriveAuthenticated = await driveSession.isAuthenticated();
      if (!isDriveAuthenticated) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Drive authentication required' },
          { status: 401 }
        );
      }

      // Check Workbench authentication
      const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
      if (!isWorkbenchAuthenticated) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'Workbench authentication required' },
          { status: 401 }
        );
      }

      // P0 FIX: Application-level Drive object authorization
      // Google OAuth authentication is NOT sufficient for HPP authorization
      // Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
      const sessionIdentity = await workbenchSession.getSessionIdentity();
      console.log('[DRIVE_AUTHORIZATION] SESSION_IDENTITY_VERIFIED', {
        sessionEmail: sessionIdentity?.email,
        operation: 'reference',
        fileId,
      });
      
      // Verify the Drive file is accessible to the authenticated session
      // This prevents IDOR where an authorized user could access arbitrary Drive IDs
      // even if Google technically permits the object
      const fileAuth = await verifyCorpusAuthorization(fileId, sharedDriveId);
      if (!fileAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] FILE_NOT_AUTHORIZED', {
          fileId,
          reason: fileAuth.reason,
        });
        return NextResponse.json(
          {
            error: 'DRIVE_FILE_NOT_AUTHORIZED',
            message: fileAuth.reason || 'Drive file is not accessible to the authenticated session',
          },
          { status: 403 }
        );
      }
      
      console.log('[DRIVE_AUTHORIZATION] FILE_ACCESS_VERIFIED', {
        fileId,
        corpus: fileAuth.corpus,
      });
    }

    // 1. Get Drive file metadata (using corrected API contract)
    // P0 FIX: Preserve corpus identity through Drive operations
    // fileId alone is not sufficient identity - must be (fileId, corpusId)
    const driveFile = await driveDiscovery.getFile(fileId, sharedDriveId);
    if (!driveFile) {
      return NextResponse.json(
        { error: 'File not found in Drive' },
        { status: 404 }
      );
    }

    console.log('[DRIVE_REFERENCE] DRIVE_METADATA_FETCHED', {
      fileId,
      sharedDriveId,
      filename: driveFile.name,
      mimeType: driveFile.mimeType,
    });

    // Construct the proxy URL for thumbnail rendering
    // P0 FIX: Use corpusId instead of driveId for canonical vocabulary
    const thumbnailProxyUrl = `/api/drive/files/${fileId}/thumbnail${sharedDriveId ? `?corpusId=${sharedDriveId}` : ''}`;

    console.log('[DRIVE_REFERENCE] THUMBNAIL_PROXY_CONSTRUCTED', {
      fileId,
      sharedDriveId,
      thumbnailUrl: thumbnailProxyUrl,
    });

    // 2. Check for existing record with matching Drive identity (idempotency)
    // Use (source, sharedDriveId, fileId) as the canonical Drive identity
    const identityString = `${fileId}${sharedDriveId || ''}`;
    const sourceIdentityHash = crypto.createHash('sha256').update(identityString).digest('hex').substring(0, 16);
    const referenceId = `drive-ref-${sourceIdentityHash}`;

    // For now, check if Media exists with this ID (future: separate DriveReference store)
    const existingAsset = await getMedia(referenceId);

    if (existingAsset) {
      console.log('[DRIVE_REFERENCE] EXISTS', {
        referenceId,
        fileId,
        sharedDriveId,
      });
      
      return NextResponse.json({
        success: true,
        media: existingAsset,
        action: 'existing',
      });
    }

    // 3. Create lightweight Drive reference (separate from fully materialized Media)
    const driveReference: DriveReference = {
      id: referenceId,
      sourceIdentityHash, // Not contentHash - this is source identity
      source: 'google-drive',
      lifecycleState: 'source_reference', // Explicit lifecycle state
      drive: {
        fileId: fileId,
        driveId: sharedDriveId,
        name: driveFile.name || '',
        mimeType: driveFile.mimeType || '',
        webViewUrl: driveFile.webViewLink || '',
        modifiedTime: driveFile.modifiedTime || '',
      },
      filename: driveFile.name || '',
      type: driveFile.mimeType?.startsWith('image/') ? 'image' : 'document',
      thumbnailProxyUrl,
      projectId,
      roles,
      createdAt: driveFile.createdTime || '',
      updatedAt: driveFile.modifiedTime || '',
    };

    // 4. Store Drive reference separately (future: use DriveReference-specific store)
    // For now, convert to Media format with proper status to pass validation
    const mediaRecord: Media = {
      id: referenceId,
      sourceIdentityHash, // Source identity hash (not content hash)
      contentHash: undefined, // No content hash until materialized
      source: 'google-drive',
      lifecycleState: 'source_reference', // Explicit lifecycle state
      drive: {
        fileId: fileId,
        driveId: sharedDriveId,
        name: driveFile.name || '',
        mimeType: driveFile.mimeType || '',
        webViewUrl: driveFile.webViewLink || '',
        modifiedTime: driveFile.modifiedTime || '',
      },
      filename: driveFile.name || '',
      type: driveFile.mimeType?.startsWith('image/') ? 'image' : 'document',
      orientation: 'landscape', // Will be determined on materialization
      dimensions: { width: 0, height: 0 }, // Placeholder for materialization
      variants: {
        thumbnail: thumbnailProxyUrl,
        web: thumbnailProxyUrl,
      },
      alt: driveFile.name || '',
      description: driveFile.description,
      projectId,
      tags: [],
      roles,
      order: 0,
      createdAt: driveFile.createdTime || '',
      updatedAt: driveFile.modifiedTime || '',
      uploadedAt: new Date().toISOString(),
      fileSize: driveFile.size || 0,
      format: driveFile.mimeType?.split('/')[1] || 'unknown',
      colorSpace: 'sRGB',
      provenance: {
        drive_canonical: true,
        current_authority: true,
        status: 'referenced', // Legacy field for compatibility
        preserved_at: new Date().toISOString(),
      },
    };

    // 5. Store in KV (dynamic persistence for Drive records)
    await storeMedia(mediaRecord);

    console.log('[DRIVE_REFERENCE] CREATED', {
      referenceId,
      fileId,
      sharedDriveId,
      thumbnailUrl: mediaRecord.variants?.thumbnail,
      status: 'referenced',
    });

    return NextResponse.json({
      success: true,
      media: mediaRecord,
      action: 'created',
      referenceId,
    });
  } catch (error) {
    console.error('[DRIVE_REFERENCE] ERROR', error);
    return NextResponse.json(
      {
        error: 'Failed to reference Drive file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
