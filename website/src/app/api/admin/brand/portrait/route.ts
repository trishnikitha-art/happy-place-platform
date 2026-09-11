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
import type { Media } from "@/types/media";
import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';

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
    const { mediaId, transactionId, slotId } = body;

    console.log('[BRAND PORTRAIT] IDENTIFIER_VALIDATION', {
      requestId,
      mediaId,
      transactionId,
      slotId,
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
    let staticMedia = null;
    
    // DEV_MODE_SKIP_KV: Fall back to static media if KV is unavailable
    if (!media) {
      console.log('[BRAND PORTRAIT] KV media not found, checking static authority', { mediaId });
      
      // Try static media authority as fallback
      const { getStaticMediaForBootstrap } = await import('@/lib/media');
      staticMedia = getStaticMediaForBootstrap(mediaId);
      
      if (staticMedia) {
        console.log('[BRAND PORTRAIT] Using static media from authority', { mediaId });
      } else {
        console.error('[BRAND PORTRAIT] Media not found in KV or static authority', { mediaId });
        return NextResponse.json(
          { error: "Media not found", message: "The specified media ID does not exist in KV or static authority" },
          { status: 404 }
        );
      }
    }
    
    const resolvedMedia = media || staticMedia;
    
    if (!resolvedMedia) {
      return NextResponse.json(
        { error: "Media not found", message: "The specified media ID does not exist" },
        { status: 404 }
      );
    }

    // REJECT: DriveReference cannot be directly assigned - must be materialized first
    if (isDriveReference(resolvedMedia)) {
      console.error('[WORKBENCH_ACCEPTANCE] REJECTED: DriveReference cannot be directly assigned', {
        requestId,
        mediaId,
        lifecycleState: resolvedMedia.lifecycleState,
      });
      return NextResponse.json(
        { 
          error: "Asset must be materialized", 
          message: "DriveReference cannot be directly assigned to public presentation. The asset must be materialized to a PublishedMediaAsset before assignment.",
          lifecycleState: resolvedMedia.lifecycleState,
          requiresMaterialization: true,
        },
        { status: 400 }
      );
    }

    // VALIDATE: Only PublishedMediaAsset can be assigned
    if (!isPublishedMediaAsset(resolvedMedia)) {
      console.error('[WORKBENCH_ACCEPTANCE] REJECTED: Media is not a PublishedMediaAsset', {
        requestId,
        mediaId,
        lifecycleState: resolvedMedia.lifecycleState,
        source: resolvedMedia.source,
      });
      return NextResponse.json(
        { 
          error: "Invalid media lifecycle state", 
          message: "Only PublishedMediaAsset can be assigned to public presentation",
          lifecycleState: resolvedMedia.lifecycleState,
          source: resolvedMedia.source,
        },
        { status: 400 }
      );
    }

    console.log('[WORKBENCH_ACCEPTANCE] APPROVED: PublishedMediaAsset can be assigned', {
      requestId,
      mediaId,
      lifecycleState: resolvedMedia.lifecycleState,
    });

    // P0 FIX: Calculate slot identity once per request, before production/development split
    // One request → one resolved slot identity → every persistence layer uses that identity
    const slotSpecificKey = slotId === 'about-owner-portrait-slot' ? 'brand-portrait-about' :
                          slotId === 'homepage-owner-portrait-slot' ? 'brand-portrait-homepage' :
                          'brand-portrait-homepage';

    // Initialize shared Redis client and transaction ID before branching
    const redis = getRedisClient();
    const effectiveTransactionId = transactionId || generateTransactionId();
    const isProduction = process.env.NODE_ENV === 'production';

    // STAGE assignment in Redis for deployment (not direct to assignment store)
    // This prevents Redis/Git split-brain - promotion happens only after Git succeeds
    if (isProduction && redis) {
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:service:${slotSpecificKey}`;

      await redis.set(stagingKey, mediaId);

      // Create authoritative deployment transaction record (single source of truth)
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [stagingKey],
        ['brand.v1.json'],
        `Brand portrait assignment`
      );

      console.log('[BRAND PORTRAIT] STAGED_IN_KV', { mediaId, stagingKey, transactionId: effectiveTransactionId });

      return NextResponse.json({
        success: true,
        mediaId,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId
      });
    }

    // P0 FIX: Fail-closed when Redis is unavailable in production
    // Prevents split-brain where UI accepts mutations but cannot stage them
    if (isProduction && !redis) {
      console.error('[BRAND PORTRAIT] REDIS_UNAVAILABLE - FAILING_CLOSED', {
        mediaId,
        transactionId: effectiveTransactionId,
        environment: process.env.NODE_ENV,
        reason: 'KV credentials not configured or Redis unavailable'
      });

      return NextResponse.json(
        {
          error: "Redis unavailable",
          message: "Staging storage is unavailable. Cannot accept mutations without Redis staging.",
          mediaId,
          transactionId: effectiveTransactionId
        },
        { status: 503 }
      );
    }

    // Development: Use assignment store directly
    const currentAssignment = await getServiceCardAssignment(slotSpecificKey, requestId);
    const expectedRevision = currentAssignment?.revision ?? 0; // Default to 0 for create

    console.log('[BRAND PORTRAIT] CAS_READ', {
      requestId,
      slotSpecificKey,
      currentRevision: expectedRevision,
      currentMediaId: currentAssignment?.mediaId,
    });

    const { storeServiceCardAssignment } = await import('@/lib/assignment-store');
    const assignment = {
      serviceSlug: slotSpecificKey,
      mediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench' as const,
    };

    // VALIDATE: static media must be a valid PublishedMediaAsset
    // DEV_MODE_SKIP_KV: We already validated that resolvedMedia is a PublishedMediaAsset above
    // Just check the static media has the required fields
    if (resolvedMedia.lifecycleState !== 'published' || resolvedMedia.source !== 'local') {
      console.error('[ASSIGNMENT_WRITE] REJECTED: static media is not a valid PublishedMediaAsset', {
        operationId: requestId,
        serviceSlug: assignment.serviceSlug,
        mediaId: assignment.mediaId,
        lifecycleState: resolvedMedia.lifecycleState,
        source: resolvedMedia.source,
      });
      throw new Error(`Media is not a valid PublishedMediaAsset: lifecycleState=${resolvedMedia.lifecycleState}, source=${resolvedMedia.source}`);
    }
    
    await storeServiceCardAssignment(assignment, expectedRevision, requestId);

    console.log('[BRAND PORTRAIT] ASSIGNMENT_STORED', {
      requestId,
      mediaId,
    });

    // CRITICAL: Also write to KV staging area for deployment API discovery
    // Deployment API expects: workbench-staging:{txId}:service:{serviceSlug}
    const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:service:${slotSpecificKey}`;
    if (redis) {
      await redis.set(stagingKey, mediaId);
      console.log('[BRAND PORTRAIT] STAGING_AREA_WRITE', {
        stagingKey,
        mediaId,
        requestId,
        transactionId: effectiveTransactionId
      });
    } else {
      console.warn('[BRAND PORTRAIT] REDIS_UNAVAILABLE - staging write skipped');
    }

    // Read back to verify
    const storedAssignment = await getServiceCardAssignment(slotSpecificKey, requestId);
    console.log('[BRAND PORTRAIT] ASSIGNMENT_VERIFICATION', {
      requestId,
      slotSpecificKey,
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
