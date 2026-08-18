/**
 * Drive Reference API Route
 *
 * Creates a media record that references a Drive object directly.
 * Does not download the file; uses Drive's thumbnail and view URLs.
 *
 * POST /api/drive/reference
 * Body: { driveId: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import type { Media, MediaRole } from '@/types/media';

export const dynamic = 'force-dynamic';

interface ReferenceRequest {
  driveId: string;
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
    const { driveId, projectId, roles = ['gallery'] } = body;

    if (!driveId) {
      return NextResponse.json(
        { error: 'driveId is required' },
        { status: 400 }
      );
    }

    // 1. Get Drive file metadata
    const driveFile = await driveDiscovery.getFile(driveId);
    if (!driveFile) {
      return NextResponse.json(
        { error: 'File not found in Drive' },
        { status: 404 }
      );
    }

    // 2. Load media.v1.json
    const mediaPath = join(process.cwd(), 'src/config/media.v1.json');
    const mediaData = JSON.parse(readFileSync(mediaPath, 'utf-8'));

    // 3. Check for existing record with matching driveId
    const existingIndex = mediaData.media.findIndex((m: Media) => m.driveId === driveId);

    const mediaRecord: Media = {
      id: existingIndex >= 0 ? mediaData.media[existingIndex].id : generateMediaId(driveFile.name),
      source: 'google-drive' as any, // New field for Drive-referenced assets
      driveId,
      driveMimeType: driveFile.mimeType,
      driveName: driveFile.name,
      driveThumbnailUrl: driveFile.thumbnailLink,
      driveWebViewUrl: driveFile.webViewLink,
      driveModifiedTime: driveFile.modifiedTime,
      filename: driveFile.name,
      type: driveFile.mimeType?.startsWith('image/') ? 'image' : 'document',
      orientation: determineOrientation(driveFile.mimeType),
      dimensions: { width: 0, height: 0 },
      variants: {
        // Use Drive thumbnail as the web variant for now
        web: driveFile.thumbnailLink || '',
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
      fileSize: driveFile.size,
      provenance: {
        drive_canonical: true,
        current_authority: true,
        status: 'referenced',
        preserved_at: new Date().toISOString(),
      },
    };

    // 4. Update or insert record
    if (existingIndex >= 0) {
      // Update existing record (preserve id)
      mediaData.media[existingIndex] = { ...mediaData.media[existingIndex], ...mediaRecord, id: mediaData.media[existingIndex].id };
    } else {
      // Insert new record
      mediaData.media.push(mediaRecord);
    }

    mediaData.generatedAt = new Date().toISOString();

    // 5. Write back to media.v1.json
    writeFileSync(mediaPath, JSON.stringify(mediaData, null, 2));

    return NextResponse.json({
      success: true,
      media: mediaRecord,
      action: existingIndex >= 0 ? 'updated' : 'created',
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

/**
 * Generate a stable media ID from filename
 */
function generateMediaId(filename: string): string {
  const base = filename
    .replace(/\.[^/.]+$/, '') // Remove extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-');
  return `${base}-${Date.now()}`;
}

/**
 * Determine orientation from mime type
 */
function determineOrientation(mimeType?: string): 'landscape' | 'portrait' | 'square' {
  // TODO: Parse actual image dimensions for accurate orientation
  return 'landscape';
}
