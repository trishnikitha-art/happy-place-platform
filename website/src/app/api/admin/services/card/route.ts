/**
 * Admin Services Card API Endpoint
 * 
 * Updates the service card mediaId using persistent assignment store
 * 
 * POST /api/admin/services/card
 * Body: { serviceSlug: string, mediaId: string }
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { storeServiceCardAssignment, getServiceCardAssignment } from "@/lib/assignment-store";
import { getAllServices } from "@/lib/registries";
import { getMediaByIdAsync } from "@/lib/media";
import { isDriveReference, isPublishedMediaAsset } from "@/types/media";
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';

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
  console.log('[DND SERVER 1] REQUEST_RECEIVED');

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
    console.warn('[SERVICES CARD] DEV_MODE_BYPASS_ACTIVE', { 
      reason: 'DRIVE_AUTH_BYPASS=true',
      securityNote: 'This bypass is for development only'
    });
  }

  try {
    const body = await request.json();
    const { serviceSlug, mediaId, transactionId } = body;

    console.log('[DND SERVER 2] IDENTIFIER_VALIDATION', {
      serviceSlug,
      mediaId,
      transactionId,
    });

    if (!serviceSlug) {
      return NextResponse.json(
        { error: "serviceSlug is required" },
        { status: 400 }
      );
    }

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    // Verify the service exists in static configuration
    const services = getAllServices();
    const service = services.find(s => s.slug === serviceSlug);
    
    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    console.log('[DND SERVER 3] SERVICE_VERIFIED', {
      serviceSlug,
      serviceExists: true,
    });

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
        serviceSlug,
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
        serviceSlug,
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
      serviceSlug,
      mediaId,
      lifecycleState: media.lifecycleState,
    });

    // STAGE assignment in Redis for deployment (not direct to assignment store)
    // This prevents Redis/Git split-brain - promotion happens only after Git succeeds
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Use provided transaction ID or generate new one for compatibility
      const effectiveTransactionId = transactionId || generateTransactionId();
      const stagingKey = `${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:service:${serviceSlug}`;
      
      await redis.set(stagingKey, mediaId);
      
      // Create authoritative deployment transaction record (single source of truth)
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [stagingKey],
        ['services.v1.json'],
        `Service card assignment: ${serviceSlug}`
      );
      
      console.log('[SERVICES CARD] STAGED_IN_KV', { serviceSlug, mediaId, stagingKey, transactionId: effectiveTransactionId });
      
      return NextResponse.json({ 
        success: true, 
        serviceSlug, 
        mediaId,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId
      });
    }

    // CAS ENFORCEMENT: Read current assignment to obtain expected revision
    const currentAssignment = await getServiceCardAssignment(serviceSlug);
    const expectedRevision = currentAssignment?.revision;
    
    console.log('[SERVICES CARD] CAS_READ', {
      serviceSlug,
      currentRevision: expectedRevision,
      currentMediaId: currentAssignment?.mediaId,
    });

    // Store assignment in persistent store
    const assignment = {
      serviceSlug,
      mediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench' as const,
    };

    await storeServiceCardAssignment(assignment, expectedRevision);

    console.log('[DND SERVER 4] ASSIGNMENT_STORED', {
      serviceSlug,
      mediaId,
    });

    // CRITICAL: Also write to KV staging area for deployment API discovery
    // Deployment API expects: workbench-staging:{txId}:service:{serviceSlug}
    const stagingKey = `workbench-staging:${effectiveTransactionId}:service:${serviceSlug}`;
    const redis = getRedisClient();
    if (redis) {
      await redis.set(stagingKey, mediaId);
      console.log('[SERVICES CARD] STAGING_AREA_WRITE', {
        stagingKey,
        mediaId,
        transactionId: effectiveTransactionId
      });
    } else {
      console.warn('[SERVICES CARD] REDIS_UNAVAILABLE - staging write skipped');
    }

    // Read back to verify
    const storedAssignment = await getServiceCardAssignment(serviceSlug);
    console.log('[DND SERVER 5] ASSIGNMENT_VERIFICATION', {
      serviceSlug,
      storedMediaId: storedAssignment?.mediaId,
      matchesExpected: storedAssignment?.mediaId === mediaId,
    });

    console.log('[DND SERVER 6] RESPONSE', {
      success: true,
      serviceSlug,
      mediaId,
    });

    return NextResponse.json({ 
      success: true, 
      serviceSlug, 
      mediaId,
      assignment 
    });
  } catch (error) {
    console.error('[DND SERVER ERROR]', error);
    return NextResponse.json(
      { 
        error: "Failed to update service card", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}