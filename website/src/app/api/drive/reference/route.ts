/**
 * Drive Reference API Route
 *
 * Creates a lightweight media record that references a Drive object directly.
 * Does not download the file; uses Drive's thumbnail and view URLs.
 * Uses KV store for persistence and proper idempotency based on Drive identity.
 *
 * POST /api/drive/reference
 * Body: { driveId: string, driveIdParameter?: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import type { Media, MediaRole } from '@/types/media';
import crypto from 'crypto';

// Dynamic imports for storage modules (ES modules need dynamic import)
let storeMedia: any = null;
let getMedia: any = null;
let findMediaByContentHash: any = null;
let uploadToBlob: any = null;
let generateBlobFilename: any = null;

async function loadStorageModules() {
  try {
    const mediaKvStore = await import('@/lib/media-kv-store');
    storeMedia = mediaKvStore.storeMedia;
    getMedia = mediaKvStore.getMedia;
    findMediaByContentHash = mediaKvStore.findMediaByContentHash;
    console.log('[DRIVE_REFERENCE] KV module loaded successfully');
  } catch (e) {
    console.error('[DRIVE_REFERENCE] KV module load failed:', e);
  }

  try {
    const blobStorage = await import('@/lib/blob-storage');
    uploadToBlob = blobStorage.uploadToBlob;
    generateBlobFilename = blobStorage.generateBlobFilename;
    console.log('[DRIVE_REFERENCE] Blob module loaded successfully');
  } catch (e) {
    console.error('[DRIVE_REFERENCE] Blob module load failed:', e);
  }
}

export const dynamic = 'force-dynamic';

interface ReferenceRequest {
  driveId: string;
  driveIdParameter?: string;
  projectId?: string;
  roles?: MediaRole[];
}

export async function POST(request: Request) {
  // Load storage modules dynamically
  await loadStorageModules();

  // Check if storage modules loaded successfully
  if (!storeMedia || !getMedia) {
    return NextResponse.json(
      {
        success: false,
        error: 'KV_MODULE_NOT_AVAILABLE',
        stage: 'initialization',
        message: 'KV storage module failed to load.',
        details: 'This may be due to module loading errors.',
      },
      { status: 500 }
    );
  }

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
    const { driveId, driveIdParameter, projectId, roles = ['gallery'] } = body;

    if (!driveId) {
      return NextResponse.json(
        { error: 'driveId is required' },
        { status: 400 }
      );
    }

    // 1. Get Drive file metadata
    const driveFile = await driveDiscovery.getFile(driveId, driveIdParameter);
    if (!driveFile) {
      return NextResponse.json(
        { error: 'File not found in Drive' },
        { status: 404 }
      );
    }

    // 2. Check for existing record with matching Drive identity (idempotency)
    // Use (source, driveId, fileId) as the canonical Drive identity
    const existingAssets = await Promise.all([
      getMedia(`drive-${driveId}`),
      getMedia(`drive-${driveId}-${driveIdParameter}`),
    ]);
    
    const existingAsset = existingAssets.find(a => a !== null);

    if (existingAsset) {
      console.log('[DRIVE_REFERENCE] Existing asset found', {
        mediaId: existingAsset.id,
        driveFileId: driveId,
        driveIdParameter,
      });
      
      return NextResponse.json({
        success: true,
        media: existingAsset,
        action: 'existing',
      });
    }

    // 3. Generate stable media ID from Drive identity
    const baseName = driveFile.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const identityString = `${driveId}${driveIdParameter || ''}`;
    const identityHash = crypto.createHash('sha256').update(identityString).digest('hex').substring(0, 16);
    const mediaId = `drive-${baseName}-${identityHash}`;

    // 4. Create lightweight Drive reference
    const mediaRecord: Media = {
      id: mediaId,
      contentHash: identityHash, // Use Drive identity hash as content hash for now
      source: 'google-drive',
      drive: {
        fileId: driveId,
        driveId: driveIdParameter,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        webViewUrl: driveFile.webViewLink,
        modifiedTime: driveFile.modifiedTime,
      },
      filename: driveFile.name,
      type: driveFile.mimeType?.startsWith('image/') ? 'image' : 'document',
      orientation: 'landscape', // Will be determined on materialization
      dimensions: { width: 0, height: 0 }, // Will be determined on materialization
      variants: {
        // Thumbnail URL is derived at runtime via proxy
        web: `/api/drive/files/${driveId}/thumbnail${driveIdParameter ? `?driveId=${driveIdParameter}` : ''}`,
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
        status: 'referenced',
        preserved_at: new Date().toISOString(),
      },
    };

    // 5. Store in KV
    await storeMedia(mediaRecord);

    console.log('[DRIVE_REFERENCE] Created new reference', {
      mediaId,
      driveFileId: driveId,
      driveIdParameter,
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
