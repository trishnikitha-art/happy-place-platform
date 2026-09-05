/**
 * Workbench Media Authority Audit API
 *
 * Audits KV media authority records to identify failing records.
 * Returns inventory of records that fail public media gate verification.
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
        validRecords: 0,
        failingRecords: 0,
        failingRecordIds: [] as string[],
        failureReasons: {} as Record<string, string>,
        sampleFailingRecords: [] as any[],
      };
      
      for (const mediaId of mediaIds) {
        const media = await getMediaRecordRaw(mediaId);
        if (!media) {
          continue;
        }
        
        // Verify public media authority
        const hasPublicAuthority = await verifyPublicMediaAuthority(media);
        
        if (hasPublicAuthority) {
          results.validRecords++;
        } else {
          results.failingRecords++;
          results.failingRecordIds.push(mediaId);
          results.failureReasons[mediaId] = 'Failed public media authority check';
          
          // Collect sample of failing records (first 10)
          if (results.sampleFailingRecords.length < 10) {
            results.sampleFailingRecords.push({
              id: media.id,
              filename: media.filename,
              source: media.source,
              lifecycleState: media.lifecycleState,
              storage: media.storage,
              contentHash: media.contentHash,
              reason: 'Failed public media authority check',
            });
          }
        }
      }
      
      console.log('[MEDIA_AUDIT] Audit complete:', {
        totalRecords: results.totalRecords,
        validRecords: results.validRecords,
        failingRecords: results.failingRecords,
        failureRate: `${((results.failingRecords / results.totalRecords) * 100).toFixed(2)}%`,
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
