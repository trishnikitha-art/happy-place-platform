/**
 * Admin Brand Portrait API Endpoint
 * 
 * Updates the owner portrait mediaId using persistent assignment store
 * 
 * POST /api/admin/brand/portrait
 * Body: { mediaId: string }
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { getServiceCardAssignment } from "@/lib/assignment-store";
import { getMediaByIdAsync } from "@/lib/media";
import { isDriveReference, isPublishedMediaAsset } from "@/types/media";
import { Redis } from '@upstash/redis';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';

function getRedisClient(): Redis | null {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

function generateTransactionId(): string {
  return `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export async function POST(request: Request) {
  const requestId = `portrait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[BRAND PORTRAIT] REQUEST_RECEIVED', { requestId });

  // SECURITY: Require authentication in production
  // Development bypass requires explicit DRIVE_AUTH_BYPASS=true
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (process.env.NODE_ENV !== 'development' || !isDevBypass) {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Workbench authentication required" },
        { status: 401 }
      );
    }
  } else {
    console.warn('[BRAND PORTRAIT] DEV_MODE_BYPASS_ACTIVE', { 
      reason: 'DRIVE_AUTH_BYPASS=true',
      securityNote: 'This bypass is for development only'
    });
  }

  try {
    const body = await request.json();
    const { mediaId } = body;

    console.log('[BRAND PORTRAIT] IDENTIFIER_VALIDATION', {
      requestId,
      mediaId,
    });

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    // WORKBENCH ACCEPTANCE CONTRACT: DriveReference must be materialized before assignment
    // Check if mediaId is a DriveReference
    const media = await getMediaByIdAsync(mediaId);
    if (!media) {
      return NextResponse.json(
        { error: "Media not found", message: "The specified media ID does not exist" },
        { status: 404 }
      );
    }

    // REJECT: DriveReference cannot be directly assigned - must be materialized first
    if (isDriveReference(media)) {
      console.error('[WORKBENCH_ACCEPTANCE] REJECTED: DriveReference cannot be directly assigned', {
        requestId,
        mediaId,
        lifecycleState: media.lifecycleState,
      });
      return NextResponse.json(
        { 
          error: "Asset must be materialized", 
          message: "DriveReference cannot be directly assigned to public presentation. The asset must be materialized to a PublishedMediaAsset before assignment.",
          lifecycleState: media.lifecycleState,
          requiresMaterialization: true,
        },
        { status: 400 }
      );
    }

    // VALIDATE: Only PublishedMediaAsset can be assigned
    if (!isPublishedMediaAsset(media)) {
      console.error('[WORKBENCH_ACCEPTANCE] REJECTED: Media is not a PublishedMediaAsset', {
        requestId,
        mediaId,
        lifecycleState: media.lifecycleState,
        source: media.source,
      });
      return NextResponse.json(
        { 
          error: "Invalid media lifecycle state", 
          message: "Only PublishedMediaAsset can be assigned to public presentation",
          lifecycleState: media.lifecycleState,
          source: media.source,
        },
        { status: 400 }
      );
    }

    console.log('[WORKBENCH_ACCEPTANCE] APPROVED: PublishedMediaAsset can be assigned', {
      requestId,
      mediaId,
      lifecycleState: media.lifecycleState,
    });

    // STAGE assignment in Redis for deployment (not direct to assignment store)
    // This prevents Redis/Git split-brain - promotion happens only after Git succeeds
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      const transactionId = generateTransactionId();
      const stagingKey = `${WORKBENCH_STAGING_PREFIX}${transactionId}:service:brand-portrait`;
      
      await redis.set(stagingKey, mediaId);
      
      // Create authoritative deployment transaction record (single source of truth)
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        transactionId,
        [stagingKey],
        ['brand.v1.json'],
        `Brand portrait assignment`
      );
      
      console.log('[BRAND PORTRAIT] STAGED_IN_KV', { mediaId, stagingKey, transactionId });
      
      return NextResponse.json({ 
        success: true, 
        mediaId,
        staged: true,
        persistence: 'kv',
        transactionId
      });
    }

    // Development: Use assignment store directly
    const currentAssignment = await getServiceCardAssignment('brand-portrait', requestId);
    const expectedRevision = currentAssignment?.revision;
    
    console.log('[BRAND PORTRAIT] CAS_READ', {
      requestId,
      currentRevision: expectedRevision,
      currentMediaId: currentAssignment?.mediaId,
    });

    const { storeServiceCardAssignment } = await import('@/lib/assignment-store');
    const assignment = {
      serviceSlug: 'brand-portrait',
      mediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench' as const,
    };

    await storeServiceCardAssignment(assignment, expectedRevision, requestId);

    console.log('[BRAND PORTRAIT] ASSIGNMENT_STORED', {
      requestId,
      mediaId,
    });

    // Read back to verify
    const storedAssignment = await getServiceCardAssignment('brand-portrait', requestId);
    console.log('[BRAND PORTRAIT] ASSIGNMENT_VERIFICATION', {
      requestId,
      storedMediaId: storedAssignment?.mediaId,
      matchesExpected: storedAssignment?.mediaId === mediaId,
    });

    console.log('[BRAND PORTRAIT] RESPONSE', {
      requestId,
      success: true,
      mediaId,
    });

    return NextResponse.json({ 
      success: true, 
      mediaId,
      assignment,
      requestId,
      operationId: requestId 
    });
  } catch (error) {
    console.error('[BRAND PORTRAIT ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { 
        error: "Failed to update brand portrait", 
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        operationId: requestId 
      },
      { status: 500 }
    );
  }
}
