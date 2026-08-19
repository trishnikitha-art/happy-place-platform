/**
 * Drive Reference API Route
 *
 * Creates a lightweight media record that references a Drive object directly.
 * Does not download the file; uses Drive's thumbnail and view URLs.
 * Writes to media.v1.json for consistency with existing HPP media lifecycle.
 *
 * POST /api/drive/reference
 * Body: { fileId: string, sharedDriveId?: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
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

    console.log('[DND] DRIVE_REFERENCE_METATADA_FETCHED', {
      fileId,
      sharedDriveId,
      filename: driveFile.name,
    });

    // 2. Load media.v1.json (canonical media authority)
    const mediaPath = join(process.cwd(), 'src/config/media.v1.json');
    const mediaData = JSON.parse(readFileSync(mediaPath, 'utf-8'));

    // 3. Check for existing record with matching Drive identity (idempotency)
    // Use (source, sharedDriveId, fileId) as the canonical Drive identity
    const identityString = `${fileId}${sharedDriveId || ''}`;
    const identityHash = crypto.createHash('sha256').update(identityString).digest('hex').substring(0, 16);
    const mediaId = `drive-${identityHash}`;

    const existingIndex = mediaData.media.findIndex((m: Media) => m.id === mediaId);

    if (existingIndex >= 0) {
      console.log('[DND] DRIVE_REFERENCE_EXISTS', {
        mediaId,
        fileId,
        sharedDriveId,
      });
      
      return NextResponse.json({
        success: true,
        media: mediaData.media[existingIndex],
        action: 'existing',
      });
    }

    // 4. Generate stable media ID from Drive identity
    const baseName = driveFile.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');

    // 5. Create lightweight Drive reference (no dimensions, no fabricated data)
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
        // Thumbnail URL is derived at runtime via proxy
        web: `/api/drive/files/${fileId}/thumbnail${sharedDriveId ? `?driveId=${sharedDriveId}` : ''}`,
      },
      alt: driveFile.name,
      description: driveFile.description,
      projectId,
      tags: [],
      roles,
      order: mediaData.media.length,
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

    // 6. Insert new record into media.v1.json
    mediaData.media.push(mediaRecord);
    mediaData.generatedAt = new Date().toISOString();

    // 7. Write back to media.v1.json
    writeFileSync(mediaPath, JSON.stringify(mediaData, null, 2));

    console.log('[DND] DRIVE_REFERENCE_CREATED', {
      mediaId,
      fileId,
      sharedDriveId,
      totalMediaRecords: mediaData.media.length,
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
