/**
 * Admin Project Gallery API Endpoint
 * 
 * Gallery Management v2 - Atomic Ordered Gallery Authority
 * 
 * PUT /api/admin/projects/gallery
 * Body: { projectId: string, gallery: string[], transactionId?: string }
 * 
 * Atomic gallery mutation with complete ordered array.
 * Replaces current gallery with the complete desired order in one operation.
 * Supports: reorder, prepend, append, delete, multi-photo changes with one operation.
 * 
 * POST /api/admin/projects/gallery (LEGACY - DEPRECATED)
 * Body: { projectId: string, galleryIndex: number, mediaId: string, operation: 'replace' | 'add' }
 * 
 * Legacy endpoint maintained for backward compatibility during migration.
 * 
 * DELETE /api/admin/projects/gallery (LEGACY - DEPRECATED)
 * Body: { projectId: string, galleryIndex: number }
 * 
 * Legacy endpoint maintained for backward compatibility during migration.
 * 
 * Constitutional Architecture:
 * - Gallery order is human editorial state (not deterministic projection)
 * - One atomic mutation contains the complete desired ordered media-ID sequence
 * - Media identity remains immutable, only ordering changes
 * - Gallery membership/order is mutable presentation authority
 * - Workbench is the human control surface for ordered assignment
 * - Public site consumes the resulting authoritative ordered list
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";

// PRODUCTION GUARD: Prevent runtime writes to read-only Vercel filesystem
function isProductionWriteBlocked(): boolean {
  // Block writes in Vercel production environment
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";
import { getMediaByIdAsync, resolvePublicMedia } from "@/lib/media";
import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';
import { 
  ATOMIC_GALLERY_MUTATION_SCRIPT,
  getRedisClient as getDeploymentRedisClient
} from '@/lib/deployment-transaction';

export const runtime = 'nodejs';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';

/**
 * P0 FIX: Runtime gallery authority Redis key
 * Stores the effective gallery + revision as the live runtime authority
 * This solves the stale Vercel deployment problem where bundled projects.v1.json
 * contains an old revision while Redis staging state has a newer revision
 */
function getRuntimeGalleryKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

function getRedisClient(): Redis | null {
  return getDeploymentRedisClient();
}

/**
 * GET /api/admin/projects/gallery?projectId={projectId}
 * 
 * Retrieve current gallery state for a project.
 * Returns the complete ordered gallery array for use in atomic mutations.
 * 
 * P0 FIX: Authority Unification
 * - Check for staged gallery state in Redis (production)
 * - If staged state exists, return that as the effective current state
 * - If no staged state, return filesystem state
 * - Distinguish between deployed/current state and staged/pending state
 * - Prevent stale reads after staging mutations
 */
export async function GET(request: Request) {
  // SECURITY: Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    console.log('[GALLERY GET] REQUEST_RECEIVED', { projectId });

    // P0 FIX: Check for staged gallery state in Redis (production)
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    let stagedGallery = null;
    let stagingKey = null;
    let transactionId = null;
    
    // P0 FIX: Read runtime authority first (effective gallery + revision)
    // This solves the stale Vercel deployment problem
    let runtimeGallery = null;
    let runtimeRevision = null;
    let pendingDeployment = null;
    
    if (isProduction && redis) {
      const runtimeKey = getRuntimeGalleryKey(projectId);
      const runtimeData = await redis.get(runtimeKey);
      
      if (runtimeData) {
        let parsed: any;
        if (typeof runtimeData === 'string') {
          parsed = JSON.parse(runtimeData);
        } else if (typeof runtimeData === 'object') {
          parsed = runtimeData;
        }
        
        if (parsed && parsed.gallery) {
          runtimeGallery = parsed.gallery;
          runtimeRevision = parsed.currentRevision;
          console.log('[GALLERY GET] RUNTIME_AUTHORITY_FOUND', {
            projectId,
            runtimeKey,
            galleryLength: runtimeGallery.length,
            runtimeRevision,
          });
        }
      }
      
      // P0 FIX: Read staged state separately as pending deployment
      // Staged state is NOT substituted for current gallery
      const projectStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;
      const currentStagedTransactionId = await redis.get(projectStagingKey);
      
      if (currentStagedTransactionId && typeof currentStagedTransactionId === 'string') {
        // Load the specific staged transaction
        const specificStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${currentStagedTransactionId}:project:${projectId}:gallery`;
        const stagedData = await redis.get(specificStagingKey);

        // P0 FIX: Accept both string and object (Upstash may return either)
        if (stagedData) {
          let parsed: any;
          if (typeof stagedData === 'string') {
            parsed = JSON.parse(stagedData);
          } else if (typeof stagedData === 'object') {
            parsed = stagedData;
          } else {
            console.warn('[GALLERY GET] STAGED_DATA_INVALID_TYPE', {
              projectId,
              dataType: typeof stagedData
            });
          }

          if (parsed && parsed.gallery) {
            pendingDeployment = {
              gallery: parsed.gallery,
              currentRevision: parsed.currentRevision,
              transactionId: currentStagedTransactionId,
            };
            console.log('[GALLERY GET] PENDING_DEPLOYMENT_FOUND', {
              projectId,
              stagingKey: specificStagingKey,
              transactionId: currentStagedTransactionId,
              galleryLength: parsed.gallery.length,
              stagedRevision: parsed.currentRevision
            });
          }
        }
      }
    }

    // P0 FIX: If runtime authority exists, return it as current gallery
    // Do not substitute staged state for current gallery
    if (runtimeGallery && runtimeRevision !== null) {
      return NextResponse.json({
        success: true,
        projectId,
        gallery: runtimeGallery,
        galleryLength: runtimeGallery.length,
        currentRevision: runtimeRevision,
        state: 'runtime',
        hasStagedChanges: !!pendingDeployment,
        pendingDeployment,
        source: 'runtime-authority',
      });
    }

    // P0 FIX: If runtime authority doesn't exist, fail closed with specific project ID
    // Filesystem is only for projection/fallback, not runtime authority
    if (isProduction) {
      console.error('[GALLERY GET] RUNTIME_AUTHORITY_NOT_INITIALIZED', {
        projectId,
        message: 'Gallery runtime authority has not been initialized for this project',
        suggestion: 'Use POST /api/admin/projects/gallery/initialize-all to initialize runtime authority for all projects',
        timestamp: new Date().toISOString(),
      });
      
      return NextResponse.json(
        {
          error: "Runtime authority not initialized",
          message: `Gallery runtime authority has not been initialized for project: ${projectId}. Please contact administrator to initialize runtime authority.`,
          projectId,
          suggestion: 'Use POST /api/admin/projects/gallery/initialize-all to initialize runtime authority for all projects',
        },
        { status: 503 }
      );
    }

    // Development mode: use filesystem as bootstrap
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const project = projectsData.projects.find((p: any) => p.id === projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const deployedGallery = project.media?.gallery || [];
    const deployedRevision = project.media?.galleryRevision || 0;

    console.log('[GALLERY GET] SUCCESS', { 
      projectId, 
      galleryLength: deployedGallery.length, 
      currentRevision: deployedRevision,
      state: 'deployed',
      hasStagedChanges: false,
    });

    return NextResponse.json({
      success: true,
      projectId,
      gallery: deployedGallery,
      galleryLength: deployedGallery.length,
      currentRevision: deployedRevision,
      state: 'deployed',
      hasStagedChanges: false,
      source: 'filesystem-bootstrap',
    });
  } catch (error) {
    console.error('[GALLERY GET] ERROR', error);
    return NextResponse.json(
      { error: "Failed to retrieve project gallery" },
      { status: 500 }
    );
  }
}

/**
 * NEW V2: Atomic Gallery Mutation
 * PUT /api/admin/projects/gallery
 * 
 * Atomic replacement of entire gallery with complete ordered array.
 * This is the canonical gallery authority operation.
 */
export async function PUT(request: Request) {
  // SECURITY: Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  // Declare variables outside try block for error logging
  let projectId: string | null = null;
  let gallery: string[] | null = null;
  let redis: Redis | null = null;

  try {
    const body = await request.json();
    const { projectId: _projectId, gallery: _gallery, transactionId, expectedRevision } = body;
    projectId = _projectId;
    gallery = _gallery;

    if (!projectId || !Array.isArray(gallery)) {
      return NextResponse.json(
        { error: "projectId and gallery array are required" },
        { status: 400 }
      );
    }

    console.log('[GALLERY V2 PUT] REQUEST_RECEIVED', { projectId, galleryLength: gallery?.length || 0, transactionId });

    // P0: Input validation - gallery must be array
    if (!gallery || !Array.isArray(gallery)) {
      return NextResponse.json(
        { error: "gallery must be an array" },
        { status: 400 }
      );
    }

    // P0: Input validation - no duplicate media IDs
    const uniqueMediaIds = new Set(gallery || []);
    if (uniqueMediaIds.size !== (gallery?.length || 0)) {
      console.error('[GALLERY V2 PUT] DUPLICATE_MEDIA_IDS', { 
        galleryLength: gallery.length, 
        uniqueCount: uniqueMediaIds.size 
      });
      return NextResponse.json(
        { 
          error: "Gallery contains duplicate media IDs",
          message: "Each media ID must appear exactly once in the gallery"
        },
        { status: 400 }
      );
    }

    // P0: Input validation - no null/undefined values
    if (gallery && gallery.some(id => id === null || id === undefined)) {
      console.error('[GALLERY V2 PUT] NULL_OR_UNDEFINED_MEDIA_IDS');
      return NextResponse.json(
        { 
          error: "Gallery contains null or undefined values",
          message: "All gallery items must be valid media IDs"
        },
        { status: 400 }
      );
    }

    // P0: Input validation - no empty strings
    if (gallery && gallery.some(id => typeof id === 'string' && id.trim() === '')) {
      console.error('[GALLERY V2 PUT] EMPTY_STRING_MEDIA_IDS');
      return NextResponse.json(
        { 
          error: "Gallery contains empty string values",
          message: "All gallery items must be non-empty media IDs"
        },
        { status: 400 }
      );
    }

    // Validate all mediaIds pass the public media gate
    // This ensures gallery mutations only accept media that is publicly eligible
    const mediaValidationResults = await Promise.all(
      (gallery || []).map(async (mediaId) => {
        // Use resolvePublicMedia to enforce the public media gate
        const publicMedia = await resolvePublicMedia(mediaId);
        return { mediaId, valid: !!publicMedia };
      })
    );

    const invalidMediaIds = mediaValidationResults.filter(r => !r.valid);
    if (invalidMediaIds.length > 0) {
      console.error('[GALLERY V2 PUT] INVALID_MEDIA_IDS - PUBLIC_GATE_FAILURE', { invalidMediaIds });
      return NextResponse.json(
        {
          error: "Invalid media IDs provided",
          invalidMediaIds,
          message: "All media IDs must pass the public media gate (PublishedMediaAsset contract). Drive references, materializing assets, or non-published media cannot be added to galleries."
        },
        { status: 400 }
      );
    }

    // P0: Load project data for development mode filesystem write
    // Production mode uses atomic Lua script which reads state directly from KV
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));
    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);

    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const project = projectsData.projects[projectIndex];
    redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';

    // CAS: expectedRevision is REQUIRED for production safety
    // The atomic Lua script will perform the actual CAS check and state read
    if (expectedRevision === undefined) {
      console.error('[GALLERY V2 PUT] CAS_REQUIRED', {
        projectId,
        environment: process.env.NODE_ENV,
        reason: 'expectedRevision is required for production safety'
      });
      return NextResponse.json(
        {
          error: "Missing expectedRevision",
          message: "expectedRevision parameter is required for production safety. Please read the current gallery state and provide the revision number."
        },
        { status: 400 }
      );
    }

    // SIMPLIFIED DEVELOPMENT MODE: Direct filesystem write
    // This bypasses the complex KV staging → deployment transaction → Git commit pipeline
    // for development testing and verification of the basic drag → save → reload round-trip
    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment) {
      console.log('[GALLERY V2 PUT] DEV_MODE - Direct filesystem write', { projectId, galleryLength: gallery?.length || 0 });

      // Read current revision from filesystem for CAS check
      const currentRevision = project.media?.galleryRevision || 0;

      // CAS check in development mode
      if (expectedRevision !== currentRevision) {
        console.error('[GALLERY V2 PUT] DEV_CAS_FAILURE', {
          projectId,
          expectedRevision,
          currentRevision,
          reason: 'Gallery has been modified by another operation'
        });
        return NextResponse.json(
          {
            error: "Concurrent modification detected",
            message: "Gallery has been modified by another operation. Please reload and try again.",
            currentRevision,
            expectedRevision
          },
          { status: 409 }
        );
      }

      // Directly write to projects.v1.json in development mode
      if (!projectsData.projects[projectIndex].media) {
        projectsData.projects[projectIndex].media = {};
      }

      const newRevision = currentRevision + 1;
      if (!projectsData.projects[projectIndex].media) {
        projectsData.projects[projectIndex].media = {};
      }
      projectsData.projects[projectIndex].media.gallery = gallery || [];
      projectsData.projects[projectIndex].media.galleryRevision = newRevision;
      projectsData.generatedAt = new Date().toISOString();

      writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

      console.log('[GALLERY V2 PUT] DEV_WRITE_SUCCESS', {
        projectId,
        galleryLength: gallery?.length || 0,
        newRevision
      });

      return NextResponse.json({
        success: true,
        projectId,
        gallery: gallery || [],
        galleryLength: gallery?.length || 0,
        currentRevision: newRevision,
        staged: false,
        persistence: 'filesystem',
        mode: 'development'
      });
    }

    // Use KV for production persistence to avoid EROFS errors
    if (isProduction && redis) {
      // P0 FIX: Server-generated transaction ID (no client-provided transactionId)
      const effectiveTransactionId = `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const namespace = getKvNamespace();
      const galleryJson = JSON.stringify(gallery || []);
      const mutationTimestamp = new Date().toISOString();

      // Build Redis keys for KEYS array (per Redis contract)
      const runtimeGalleryKey = `${namespace}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
      const projectStagingKey = `${namespace}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;
      const specificStagingKey = `${namespace}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:gallery`;
      const transactionKey = `${namespace}deployment-transaction:${effectiveTransactionId}`;

      // P0 FIX: Build transaction record for atomic mutation
      const transactionRecord = {
        transactionId: effectiveTransactionId,
        state: 'prepared',
        stagingKeys: [specificStagingKey],
        files: ['projects.v1.json'],
        description: `Gallery order mutation: ${projectId} (${gallery.length} items)`,
        createdAt: mutationTimestamp,
        updatedAt: mutationTimestamp,
      };

      console.log('[GALLERY V2 PUT] ATOMIC_MUTATION_EXECUTING', {
        projectId,
        expectedRevision,
        galleryLength: gallery?.length || 0,
        transactionId: effectiveTransactionId,
        runtimeGalleryKey,
      });

      // P0 FIX: Execute ONE atomic mutation (CAS + transaction + staging + runtime update)
      const mutationResult = await redis.eval(
        ATOMIC_GALLERY_MUTATION_SCRIPT,
        [runtimeGalleryKey, projectStagingKey, specificStagingKey, transactionKey], // KEYS array
        [expectedRevision.toString(), galleryJson, effectiveTransactionId, mutationTimestamp, JSON.stringify(transactionRecord)] // ARGV array
      );

      // Parse indexed array return format: ['OK', newRevision, transactionId, actualRevision] or ['ERR', errorCode, expectedRevision, actualRevision]
      if (!Array.isArray(mutationResult) || mutationResult.length < 2) {
        console.error('[GALLERY V2 PUT] ATOMIC_MUTATION_INVALID_RETURN', {
          projectId,
          mutationResult,
          reason: 'Lua script did not return indexed array'
        });
        return NextResponse.json(
          {
            error: "Gallery mutation failed",
            message: "Invalid response from atomic mutation operation"
          },
          { status: 500 }
        );
      }

      const status = mutationResult[0];
      if (status === 'ERR') {
        const errorCode = mutationResult[1];
        const actualRevision = mutationResult[3];
        console.error('[GALLERY V2 PUT] ATOMIC_MUTATION_FAILURE', {
          projectId,
          errorCode,
          expectedRevision,
          actualRevision
        });

        if (errorCode === 'CAS_FAILURE') {
          return NextResponse.json(
            {
              error: "Concurrent modification detected",
              message: "Gallery has been modified by another operation. Please reload and try again.",
              currentRevision: actualRevision,
              expectedRevision
            },
            { status: 409 }
          );
        } else if (errorCode === 'RUNTIME_AUTHORITY_NOT_INITIALIZED') {
          return NextResponse.json(
            {
              error: "Runtime authority not initialized",
              message: "Gallery runtime authority has not been initialized. Please contact administrator.",
              currentRevision: actualRevision,
              expectedRevision
            },
            { status: 503 }
          );
        } else {
          return NextResponse.json(
            {
              error: "Gallery mutation failed",
              message: errorCode
            },
            { status: 500 }
          );
        }
      }

      // Success: ['OK', newRevision, transactionId, actualRevision]
      const newRevision = mutationResult[1];
      const actualRevision = mutationResult[3];

      console.log('[GALLERY V2 PUT] ATOMIC_MUTATION_SUCCESS', {
        projectId,
        galleryLength: gallery?.length || 0,
        newRevision,
        transactionId: effectiveTransactionId,
        actualRevision
      });

      // P0 FIX: Transaction already created atomically by the mutation script
      // No separate transaction creation step needed
      console.log('[GALLERY V2 PUT] STAGED_IN_KV', {
        projectId,
        galleryLength: gallery?.length || 0,
        stagingKey: specificStagingKey,
        projectStagingKey,
        transactionId: effectiveTransactionId,
        newRevision
      });

      return NextResponse.json({
        success: true,
        projectId,
        gallery: gallery || [],
        galleryLength: gallery?.length || 0,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId,
        currentRevision: newRevision
      });
    }

    // P0 FIX: Fail-closed when Redis is unavailable in production
    console.error('[GALLERY V2 PUT] REDIS_UNAVAILABLE - FAILING_CLOSED', {
      projectId,
      galleryLength: gallery.length,
      transactionId,
      environment: process.env.NODE_ENV,
      reason: 'KV credentials not configured or Redis unavailable'
    });

    return NextResponse.json(
      {
        error: "Redis unavailable",
        message: "Staging storage is unavailable. Cannot accept mutations without Redis staging.",
        projectId,
        galleryLength: gallery.length,
        transactionId
      },
      { status: 503 }
    );
  } catch (error) {
    console.error('[GALLERY V2 PUT] ERROR', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      projectId,
      galleryLength: gallery?.length || 0,
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      hasRedis: !!redis,
      kvUrlConfigured: !!process.env.KV_REST_API_URL,
      kvTokenConfigured: !!process.env.KV_REST_API_TOKEN,
    });
    
    // Client response - minimal information only (do not leak internal state)
    return NextResponse.json(
      { 
        error: "Failed to update project gallery order",
      },
      { status: 500 }
    );
  }
}

/**
 * LEGACY POST - Single-item gallery mutation (DEPRECATED - REMOVED)
 * 
 * This endpoint has been removed to eliminate competing mutation authorities.
 * All gallery mutations must use PUT /api/admin/projects/gallery with complete ordered array.
 */
export async function POST(request: Request) {
  return NextResponse.json(
    { 
      error: "DEPRECATED_ENDPOINT_REMOVED", 
      message: "POST endpoint is deprecated and removed. Use PUT /api/admin/projects/gallery with complete ordered array instead." 
    },
    { status: 410 }
  );
}

/**
 * LEGACY DELETE - Gallery item deletion (DEPRECATED - REMOVED)
 * 
 * This endpoint has been removed to eliminate competing mutation authorities.
 * All gallery deletions must use PUT /api/admin/projects/gallery with complete ordered array (minus deleted item).
 */
export async function DELETE(request: Request) {
  return NextResponse.json(
    { 
      error: "DEPRECATED_ENDPOINT_REMOVED", 
      message: "DELETE endpoint is deprecated and removed. Use PUT /api/admin/projects/gallery with complete ordered array (minus deleted item) instead." 
    },
    { status: 410 }
  );
}
