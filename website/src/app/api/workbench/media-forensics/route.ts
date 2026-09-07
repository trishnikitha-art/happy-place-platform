/**
 * Workbench Media Forensics API Endpoint
 * 
 * Returns detailed forensic information for ALL media records in KV.
 * Used for comprehensive production state classification.
 * 
 * POST /api/workbench/media-forensics
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw } from '@/lib/media-kv-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  // Require Workbench authentication for security
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { 
        error: 'WORKBENCH_AUTH_REQUIRED',
        message: 'Workbench authentication required',
      },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'forensicClassification') {
      console.log('[MEDIA_FORENSICS] Starting forensic classification of all KV media records');
      
      const mediaIds = await listMediaIds();
      const results = {
        totalRecords: mediaIds.length,
        records: [] as any[],
      };
      
      for (const mediaId of mediaIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) {
          continue;
        }
        
        // Collect complete forensic details for each record
        results.records.push({
          mediaId: media.id,
          filename: media.filename,
          lifecycleState: media.lifecycleState,
          source: media.source,
          storage: media.storage,
          contentHash: media.contentHash,
          dimensions: media.dimensions,
          variants: {
            original: media.variants?.original,
            web: media.variants?.web,
            webp: media.variants?.webp,
            avif: media.variants?.avif,
            thumbnail: media.variants?.thumbnail,
          },
          provenance: {
            driveFileId: media.provenance?.driveFileId,
            sharedDriveId: media.provenance?.sharedDriveId,
          },
          drive: media.drive, // Legacy field for detection
          projectId: media.projectId,
          fileSize: media.fileSize,
          format: media.format,
        });
      }
      
      console.log('[MEDIA_FORENSICS] Forensic classification complete:', {
        totalRecords: results.totalRecords,
      });
      
      return NextResponse.json({
        forensics: results,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MEDIA_FORENSICS] Error:', error);
    return NextResponse.json(
      { 
        error: 'Media forensics failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
