/**
 * Workbench Media Authority Audit API
 *
 * Audits KV media authority records to identify failing records.
 * Returns classification of records by type and failure reason.
 *
 * POST /api/workbench/media-audit
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { listMediaIds, getMediaRecordRaw, verifyPublicMediaAuthority } from '@/lib/media-kv-store';

export const dynamic = 'force-dynamic';

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

    if (action === 'auditPublicGate') {
      console.log('[MEDIA_AUDIT] Starting public media gate audit');
      
      const mediaIds = await listMediaIds();
      const results = {
        totalRecords: mediaIds.length,
        validPublished: 0,
        // P0 FIX: Classify records instead of merely rejecting them
        sourceReferences: 0,
        materializing: 0,
        stale: 0,
        malformedPublished: 0,
        missingStorage: 0,
        missingBlob: 0,
        unknown: 0,
        sampleRecords: [] as any[],
      };
      
      for (const mediaId of mediaIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) {
          continue;
        }
        
        // P0 FIX: Classify by lifecycle state and characteristics
        if (media.lifecycleState === 'source_reference') {
          // Legitimate DriveReference - should fail public gate by design
          results.sourceReferences++;
        } else if (media.lifecycleState === 'materializing') {
          // Intermediate materialization state
          results.materializing++;
        } else if (media.lifecycleState === 'stale') {
          // Stale record requiring refresh
          results.stale++;
        } else if (media.lifecycleState === 'published') {
          // Check if published asset is actually valid
          const hasPublicAuthority = await verifyPublicMediaAuthority(media);
          if (hasPublicAuthority) {
            results.validPublished++;
          } else {
            // Published asset that fails public gate - classify specific failure
            if (!media.storage) {
              results.missingStorage++;
            } else if (media.storage === 'blob' && !media.contentHash) {
              // Blob storage without content hash indicates incomplete materialization
              results.missingBlob++;
            } else {
              results.malformedPublished++;
            }
          }
        } else {
          // Unknown lifecycle state
          results.unknown++;
        }
        
        // Collect sample records (first 10)
        if (results.sampleRecords.length < 10) {
          results.sampleRecords.push({
            id: media.id,
            filename: media.filename,
            source: media.source,
            lifecycleState: media.lifecycleState,
            storage: media.storage,
            contentHash: media.contentHash,
          });
        }
      }
      
      console.log('[MEDIA_AUDIT] Audit complete:', {
        totalRecords: results.totalRecords,
        validPublished: results.validPublished,
        sourceReferences: results.sourceReferences,
        materializing: results.materializing,
        stale: results.stale,
        malformedPublished: results.malformedPublished,
        missingStorage: results.missingStorage,
        missingBlob: results.missingBlob,
      });
      
      return NextResponse.json({
        audit: results,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Unknown action', action },
      { status: 400 }
    );
  } catch (error) {
    console.error('[MEDIA_AUDIT] Error:', error);
    return NextResponse.json(
      { 
        error: 'Media audit failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
