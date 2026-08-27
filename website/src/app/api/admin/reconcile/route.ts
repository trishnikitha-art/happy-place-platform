/**
 * Authority Reconciliation API Route
 *
 * Production-safe authority reconciliation that:
 * - Reads actual runtime KV state
 * - Inspects current assignment
 * - Inspects current media record
 * - Verifies media authority (lifecycle, source, content hash, Blob metadata)
 * - Verifies physical Blob byte/hash identity
 * - Performs surgical CAS-based assignment migration
 * - Re-reads assignment to verify change
 * - Reports complete chain of evidence
 *
 * POST /api/admin/reconcile
 * Body: { serviceSlug: string, targetMediaId: string }
 *
 * SECURITY: Admin-only (Workbench authentication)
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getServiceCardAssignment, storeServiceCardAssignment, type ServiceCardAssignment } from '@/lib/assignment-store';
import { getMedia, getMediaRecordRaw } from '@/lib/media-kv-store';
import { verifyBlobHash } from '@/lib/blob-storage';

export const dynamic = 'force-dynamic';

interface ReconciliationRequest {
  serviceSlug: string;
  targetMediaId: string;
}

interface ReconciliationEvidence {
  stage: string;
  result: string;
  data?: Record<string, unknown>;
  error?: string;
}

interface ReconciliationReport {
  success: boolean;
  serviceSlug: string;
  evidence: ReconciliationEvidence[];
  finalAssignment: {
    serviceSlug: string;
    mediaId: string | null;
    revision: number | null;
  } | null;
}

export async function POST(request: Request) {
  try {
    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

    // ADMIN AUTHORIZATION NOTE:
    // Workbench authentication currently provides administrative access.
    // This assumes Workbench sessions are only granted to trusted administrators.
    // Reconciliation is a sensitive operation that should only be performed by admins.

    const body: ReconciliationRequest = await request.json();
    const { serviceSlug, targetMediaId } = body;

    if (!serviceSlug || !targetMediaId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'serviceSlug and targetMediaId are required' },
        { status: 400 }
      );
    }

    console.log('[RECONCILIATION] Starting authority reconciliation', {
      serviceSlug,
      targetMediaId,
    });

    const evidence: ReconciliationEvidence[] = [];

    // STAGE 1: Read current runtime assignment
    evidence.push({ stage: 'READ_CURRENT_ASSIGNMENT', result: 'started' });
    const currentAssignment = await getServiceCardAssignment(serviceSlug, 'reconciliation');
    evidence.push({
      stage: 'READ_CURRENT_ASSIGNMENT',
      result: 'completed',
      data: {
        currentMediaId: currentAssignment?.mediaId || null,
        currentRevision: currentAssignment?.revision || null,
      },
    });

    // STAGE 2: Read target media record through authoritative KV
    evidence.push({ stage: 'READ_TARGET_MEDIA', result: 'started' });
    const targetMedia = await getMedia(targetMediaId);
    evidence.push({
      stage: 'READ_TARGET_MEDIA',
      result: targetMedia ? 'completed' : 'not_found',
      data: targetMedia ? {
        mediaId: targetMedia.id,
        lifecycleState: targetMedia.lifecycleState,
        source: targetMedia.source,
        contentHash: targetMedia.contentHash,
        hasOriginalVariant: !!targetMedia.variants?.original,
      } as Record<string, unknown> : undefined,
    });

    if (!targetMedia) {
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Target media record not found in KV',
      });
    }

    // STAGE 3: Verify media authority (lifecycle, source, content hash)
    evidence.push({ stage: 'VERIFY_MEDIA_AUTHORITY', result: 'started' });
    
    // Check lifecycle state
    if (targetMedia.lifecycleState !== 'published') {
      evidence.push({
        stage: 'VERIFY_MEDIA_AUTHORITY',
        result: 'rejected',
        error: `Target media has lifecycleState: ${targetMedia.lifecycleState} (must be published)`,
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Target media is not in published state',
      });
    }

    // Check source
    if (targetMedia.source !== 'local') {
      evidence.push({
        stage: 'VERIFY_MEDIA_AUTHORITY',
        result: 'rejected',
        error: `Target media has source: ${targetMedia.source} (must be local)`,
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Target media is not local source',
      });
    }

    // Check content hash
    if (!targetMedia.contentHash) {
      evidence.push({
        stage: 'VERIFY_MEDIA_AUTHORITY',
        result: 'rejected',
        error: 'Target media missing content hash',
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Target media missing content hash',
      });
    }

    evidence.push({
      stage: 'VERIFY_MEDIA_AUTHORITY',
      result: 'completed',
      data: {
        lifecycleState: targetMedia.lifecycleState,
        source: targetMedia.source,
        contentHash: targetMedia.contentHash,
      },
    });

    // STAGE 4: Verify Blob metadata exists in KV
    evidence.push({ stage: 'VERIFY_BLOB_METADATA', result: 'started' });
    
    const { Redis } = await import('@upstash/redis');
    const redis = new Redis({
      url: process.env.KV_REST_API_URL,
      token: process.env.KV_REST_API_TOKEN,
    });
    
    const blobMetadataKey = `hpp:${process.env.VERCEL_ENV || 'development'}:blob_metadata:${targetMedia.contentHash}`;
    const blobMetadata = await redis.get(blobMetadataKey);
    
    if (!blobMetadata) {
      evidence.push({
        stage: 'VERIFY_BLOB_METADATA',
        result: 'rejected',
        error: 'Blob metadata not found in KV',
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Target media missing Blob metadata in KV',
      });
    }

    evidence.push({
      stage: 'VERIFY_BLOB_METADATA',
      result: 'completed',
      data: { blobMetadataExists: true },
    });

    // STAGE 5: Verify physical Blob byte/hash identity
    evidence.push({ stage: 'VERIFY_BLOB_BYTES', result: 'started' });
    
    const blobUrl = targetMedia.variants?.original;
    if (!blobUrl) {
      evidence.push({
        stage: 'VERIFY_BLOB_BYTES',
        result: 'rejected',
        error: 'Target media missing original variant URL',
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Target media missing original variant URL',
      });
    }

    const hashMatches = await verifyBlobHash(blobUrl, targetMedia.contentHash);
    
    if (!hashMatches) {
      evidence.push({
        stage: 'VERIFY_BLOB_BYTES',
        result: 'rejected',
        error: 'Physical Blob bytes do not match content hash',
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Blob hash verification failed',
      });
    }

    evidence.push({
      stage: 'VERIFY_BLOB_BYTES',
      result: 'completed',
      data: { hashVerified: true },
    });

    // STAGE 6: CAS-based assignment migration
    evidence.push({ stage: 'CAS_ASSIGNMENT_MIGRATION', result: 'started' });
    
    const expectedRevision = currentAssignment?.revision;
    const newAssignment: ServiceCardAssignment = {
      serviceSlug,
      mediaId: targetMediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench',
      revision: expectedRevision ? expectedRevision + 1 : 1,
    };
    
    await storeServiceCardAssignment(newAssignment, expectedRevision, 'reconciliation');
    
    evidence.push({
      stage: 'CAS_ASSIGNMENT_MIGRATION',
      result: 'completed',
      data: {
        fromMediaId: currentAssignment?.mediaId || null,
        toMediaId: targetMediaId,
        expectedRevision,
      },
    });

    // STAGE 7: Re-read assignment to verify change
    evidence.push({ stage: 'VERIFY_ASSIGNMENT_UPDATE', result: 'started' });
    
    const updatedAssignment = await getServiceCardAssignment(serviceSlug, 'reconciliation');
    
    evidence.push({
      stage: 'VERIFY_ASSIGNMENT_UPDATE',
      result: 'completed',
      data: {
        updatedMediaId: updatedAssignment?.mediaId || null,
        updatedRevision: updatedAssignment?.revision || null,
      },
    });

    if (updatedAssignment?.mediaId !== targetMediaId) {
      evidence.push({
        stage: 'VERIFY_ASSIGNMENT_UPDATE',
        result: 'failed',
        error: 'Assignment update did not persist',
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Assignment update verification failed',
      });
    }

    // STAGE 8: Verify public media gate would accept the new assignment
    evidence.push({ stage: 'VERIFY_PUBLIC_MEDIA_GATE', result: 'started' });
    
    const { resolvePublicMedia } = await import('@/lib/media');
    const resolvedMedia = await resolvePublicMedia(targetMediaId);
    
    if (!resolvedMedia) {
      evidence.push({
        stage: 'VERIFY_PUBLIC_MEDIA_GATE',
        result: 'rejected',
        error: 'Public media gate rejected target media',
      });
      return NextResponse.json({
        success: false,
        serviceSlug,
        evidence,
        error: 'Public media gate rejected target media',
      });
    }

    evidence.push({
      stage: 'VERIFY_PUBLIC_MEDIA_GATE',
      result: 'completed',
      data: { publicMediaGatePassed: true },
    });

    const report: ReconciliationReport = {
      success: true,
      serviceSlug,
      evidence,
      finalAssignment: updatedAssignment ? {
        serviceSlug,
        mediaId: updatedAssignment.mediaId || null,
        revision: updatedAssignment.revision || null,
      } : null,
    };

    console.log('[RECONCILIATION] Authority reconciliation completed successfully', {
      serviceSlug,
      targetMediaId,
      finalMediaId: report.finalAssignment?.mediaId,
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error('[RECONCILIATION] Reconciliation failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'RECONCILIATION_FAILED',
        message: 'Authority reconciliation failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
