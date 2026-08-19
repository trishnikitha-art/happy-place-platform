/**
 * Drive Reference API Route
 *
 * Creates a lightweight media record that references a Drive object directly.
 * Does not download the file; uses Drive's thumbnail and view URLs.
 * Stores in KV store for dynamic persistence (media.v1.json is static build artifact).
 *
 * POST /api/drive/reference
 * Body: { fileId: string, sharedDriveId?: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { storeMedia, getMedia } from '@/lib/media-kv-store';
import type { Media, MediaRole } from '@/types/media';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

interface ReferenceRequest {
  fileId: string;
  sharedDriveId?: string;
  projectId?: string;
  roles?: MediaRole[];
}

export async function POST(request: Request) {
  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    // Proceed without authentication
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
  }

  try {
    const body: ReferenceRequest = await request.json();
    const { fileId, sharedDriveId, projectId, roles = ['gallery'] } = body;

    if (!fileId) {
      return NextResponse.json(
        { error: 'fileId is required' },
        { status: 400 }
      );
    }

    // 1. Get Drive file metadata (using corrected API contract)
    const driveFile = await driveDiscovery.getFile(fileId, sharedDriveId);
    if (!driveFile) {
      return NextResponse.json(
        { error: 'File not found in Drive' },
        { status: 404 }
      );
    }

    console.log('[DND] DRIVE_REFERENCE_METADATA_FETCHED', {
      fileId,
      sharedDriveId,
      filename: driveFile.name,
    });

    // 2. Check for existing record with matching Drive identity (idempotency)
    // Use (source, sharedDriveId, fileId) as the canonical Drive identity
    const identityString = `${fileId}${sharedDriveId || ''}`;
    const identityHash = crypto.createHash('sha256').update(identityString).digest('hex').substring(0, 16);
    const mediaId = `drive-${identityHash}`;

    const existingAsset = await getMedia(mediaId);

    if (existingAsset) {
      console.log('[DND] DRIVE_REFERENCE_EXISTS', {
        mediaId,
        fileId,
        sharedDriveId,
      });
      
      return NextResponse.json({
        success: true,
        media: existingAsset,
        action: 'existing',
      });
    }

    // 3. Generate stable media ID from Drive identity
    const baseName = driveFile.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');

    // 4. Create lightweight Drive reference (stores in KV, not media.v1.json)
    const mediaRecord: Media = {
      id: mediaId,
      contentHash: identityHash, // Use Drive identity hash as content hash for now
      source: 'google-drive',
      drive: {
        fileId: fileId,
        driveId: sharedDriveId,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        webViewUrl: driveFile.webViewLink,
        modifiedTime: driveFile.modifiedTime,
      },
      filename: driveFile.name,
      type: driveFile.mimeType?.startsWith('image/') ? 'image' : 'document',
      orientation: 'landscape', // Will be determined on materialization
      dimensions: { width: 0, height: 0 }, // Placeholder for materialization
      variants: {
        // Drive proxy URL for lightweight rendering (will be upgraded to Blob variants later)
        thumbnail: `/api/drive/files/${fileId}/thumbnail${sharedDriveId ? `?driveId=${sharedDriveId}` : ''}`,
        web: `/api/drive/files/${fileId}/thumbnail${sharedDriveId ? `?driveId=${sharedDriveId}` : ''}`,
      },
      alt: driveFile.name,
      description: driveFile.description,
      projectId,
      tags: [],
      roles,
      order: 0,
      createdAt: driveFile.createdTime,
      updatedAt: driveFile.modifiedTime,
      uploadedAt: new Date().toISOString(),
      fileSize: driveFile.size || 0,
      format: driveFile.mimeType?.split('/')[1] || 'unknown',
      colorSpace: 'sRGB',
      provenance: {
        drive_canonical: true,
        current_authority: true,
        status: 'referenced', // Can be upgraded to 'ingested' later
        preserved_at: new Date().toISOString(),
      },
    };

    // 5. Store in KV (dynamic persistence for Drive records)
    await storeMedia(mediaRecord);

    console.log('[DND] DRIVE_REFERENCE_CREATED', {
      mediaId,
      fileId,
      sharedDriveId,
    });

    return NextResponse.json({
      success: true,
      media: mediaRecord,
      action: 'created',
    });
  } catch (error) {
    console.error('Drive reference error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reference Drive file',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
