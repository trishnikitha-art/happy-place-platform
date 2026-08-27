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
import { getEnvironment, getKvNamespace } from '@/lib/environment';

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

function getStagingKey(transactionId: string, serviceSlug: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_STAGING_PREFIX}${transactionId}:service:${serviceSlug}`;
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

    // Initialize shared Redis client and transaction ID before branching
    const redis = getRedisClient();
    const effectiveTransactionId = transactionId || generateTransactionId();
    const isProduction = process.env.NODE_ENV === 'production';

    console.log('[SERVICES CARD] ENVIRONMENT_CHECK', {
      isProduction,
      redisAvailable: !!redis,
      NODE_ENV: process.env.NODE_ENV,
      transactionId: effectiveTransactionId
    });

    // STAGE assignment in Redis for deployment (not direct to assignment store)
    // This prevents Redis/Git split-brain - promotion happens only after Git succeeds
    if (redis) {
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:service:${serviceSlug}`;

      console.log('[SERVICES CARD] STAGING_WRITE_START', {
        serviceSlug,
        mediaId,
        stagingKey,
        transactionId: effectiveTransactionId,
        namespace: getKvNamespace(),
        environment: getEnvironment(),
        VERCEL_ENV: process.env.VERCEL_ENV,
        NODE_ENV: process.env.NODE_ENV,
      });

      await redis.set(stagingKey, mediaId);

      // CRITICAL: Verify the write succeeded with exact identity verification
      const verifyWrite = await redis.get(stagingKey);
      if (!verifyWrite) {
        console.error('[SERVICES CARD] STAGING_WRITE_VERIFICATION_FAILED', {
          stagingKey,
          reason: 'Redis SET succeeded but GET returned null - write may have failed silently'
        });
        return NextResponse.json(
          {
            error: "Staging write verification failed",
            message: "Redis SET succeeded but verification read failed",
            stagingKey,
            transactionId: effectiveTransactionId
          },
          { status: 500 }
        );
      }

      // CRITICAL: Verify exact transaction ID in staging key
      if (!stagingKey.includes(effectiveTransactionId)) {
        console.error('[SERVICES CARD] STAGING_KEY_TRANSACTION_ID_MISMATCH', {
          stagingKey,
          expectedTransactionId: effectiveTransactionId,
          reason: 'Staging key does not contain expected transaction ID'
        });
        return NextResponse.json(
          {
            error: "Staging key transaction ID mismatch",
            message: "Staging key does not contain expected transaction ID",
            stagingKey,
            expectedTransactionId: effectiveTransactionId
          },
          { status: 500 }
        );
      }

      // CRITICAL: Verify exact namespace
      const expectedNamespace = getKvNamespace();
      if (!stagingKey.startsWith(expectedNamespace)) {
        console.error('[SERVICES CARD] STAGING_KEY_NAMESPACE_MISMATCH', {
          stagingKey,
          expectedNamespace,
          actualNamespace: stagingKey.split(':')[0] + ':' + stagingKey.split(':')[1] + ':',
          reason: 'Staging key does not use expected namespace'
        });
        return NextResponse.json(
          {
            error: "Staging key namespace mismatch",
            message: "Staging key does not use expected namespace",
            stagingKey,
            expectedNamespace
          },
          { status: 500 }
        );
      }

      // CRITICAL: Verify exact payload
      if (verifyWrite !== mediaId) {
        console.error('[SERVICES CARD] STAGING_WRITE_PAYLOAD_MISMATCH', {
          stagingKey,
          expectedPayload: mediaId,
          actualPayload: verifyWrite,
          reason: 'Staging write verification returned different payload'
        });
        return NextResponse.json(
          {
            error: "Staging write payload mismatch",
            message: "Staging write verification returned different payload",
            stagingKey,
            expectedPayload: mediaId,
            actualPayload: verifyWrite
          },
          { status: 500 }
        );
      }

      console.log('[SERVICES CARD] STAGING_WRITE_VERIFIED', {
        stagingKey,
        writtenValue: verifyWrite,
        expectedValue: mediaId,
        valuesMatch: verifyWrite === mediaId,
        transactionIdMatch: stagingKey.includes(effectiveTransactionId),
        namespaceMatch: stagingKey.startsWith(expectedNamespace),
        environment: getEnvironment(),
      });

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
    } else {
      // P0 FIX: Fail-closed when Redis is unavailable in production
      // Prevents split-brain where UI accepts mutations but cannot stage them
      console.error('[SERVICES CARD] REDIS_UNAVAILABLE - FAILING_CLOSED', {
        serviceSlug,
        mediaId,
        transactionId: effectiveTransactionId,
        environment: process.env.NODE_ENV,
        reason: 'KV credentials not configured or Redis unavailable'
      });
      
      return NextResponse.json(
        { 
          error: "Redis unavailable", 
          message: "Staging storage is unavailable. Cannot accept mutations without Redis staging.",
          serviceSlug,
          transactionId: effectiveTransactionId
        },
        { status: 503 }
      );
    }
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