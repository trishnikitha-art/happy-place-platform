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

/**
 * P0 FIX: Runtime Lua script for atomic gallery CAS with runtime authority
 *
 * This script atomically:
 * 1. Reads runtime authority (effective gallery + revision)
 * 2. Reads current staged transaction (if any)
 * 3. Compares expectedRevision with current runtime revision
 * 4. If match, writes new gallery with incremented revision
 * 5. Updates runtime authority atomically
 * 6. Updates project-level transaction pointer
 * 7. Returns the new revision
 *
 * KEYS[1]: runtimeGalleryKey - effective gallery/revision authority
 * KEYS[2]: projectStagingKey - project-level current transaction pointer
 * KEYS[3]: specificStagingKey - new transaction's gallery staging key
 * KEYS[4]: currentSpecificStagingKey - current transaction's gallery staging key (if any)
 *
 * ARGV[1]: expectedRevision - the revision the client expects
 * ARGV[2]: newGalleryJson - JSON string of the new gallery array
 * ARGV[3]: transactionId - the new transaction ID
 * ARGV[4]: deployedRevision - the deployed revision from filesystem (used as fallback)
 * ARGV[5]: mutationTimestamp - ISO timestamp for the mutation
 *
 * Returns indexed array for proper RESP2 serialization:
 * [status, newRevision, transactionId, actualRevision] on success
 * ['ERR', errorCode, expectedRevision, actualRevision] on failure
 */
const ATOMIC_GALLERY_CAS_SCRIPT = `
  local runtimeGalleryKey = KEYS[1]
  local projectStagingKey = KEYS[2]
  local specificStagingKey = KEYS[3]
  local currentSpecificStagingKey = KEYS[4]
  
  local expectedRevision = tonumber(ARGV[1])
  local newGalleryJson = ARGV[2]
  local transactionId = ARGV[3]
  local deployedRevision = tonumber(ARGV[4])
  local mutationTimestamp = ARGV[5]
  
  -- Read runtime authority first (effective gallery + revision)
  local runtimeData = redis.call('GET', runtimeGalleryKey)
  local currentGallery = nil
  local currentRevision = deployedRevision or 0
  
  if runtimeData then
    -- Upstash may return object or string
    local parsed
    if type(runtimeData) == 'string' then
      parsed = cjson.decode(runtimeData)
    elseif type(runtimeData) == 'table' then
      parsed = runtimeData
    else
      -- Invalid data type, CAS fails
      return {'ERR', 'INVALID_RUNTIME_DATA_TYPE', expectedRevision, currentRevision}
    end
    
    if parsed then
      currentGallery = parsed.gallery
      currentRevision = tonumber(parsed.currentRevision) or currentRevision
    end
  end
  
  -- Read current staged transaction (if any)
  local currentStagedTransactionId = redis.call('GET', projectStagingKey)
  
  if currentStagedTransactionId and currentStagedTransactionId ~= '' then
    -- Load the current staged gallery
    local stagedData = redis.call('GET', currentSpecificStagingKey)
    
    if stagedData then
      local parsed
      if type(stagedData) == 'string' then
        parsed = cjson.decode(stagedData)
      elseif type(stagedData) == 'table' then
        parsed = stagedData
      else
        -- Invalid data type, CAS fails
        return {'ERR', 'INVALID_STAGED_DATA_TYPE', expectedRevision, currentRevision}
      end
      
      if parsed then
        currentGallery = parsed.gallery
        currentRevision = tonumber(parsed.currentRevision) or currentRevision
      end
    end
  end
  
  -- CAS: Compare current revision with expected revision
  if currentRevision ~= expectedRevision then
    return {'ERR', 'CAS_FAILURE', expectedRevision, currentRevision}
  end
  
  -- Write new gallery with incremented revision
  local newGallery = cjson.decode(newGalleryJson)
  local newRevision = currentRevision + 1
  local galleryPayload = {
    gallery = newGallery,
    currentRevision = newRevision,
    previousGallery = currentGallery or {},
    mutationTimestamp = mutationTimestamp
  }
  
  -- Write the specific staging key
  redis.call('SET', specificStagingKey, cjson.encode(galleryPayload))
  
  -- Update the project-level transaction pointer
  redis.call('SET', projectStagingKey, transactionId)
  
  -- P0 FIX: Atomically update runtime authority
  local runtimePayload = {
    gallery = newGallery,
    currentRevision = newRevision,
    lastMutationTimestamp = mutationTimestamp,
    lastTransactionId = transactionId
  }
  redis.call('SET', runtimeGalleryKey, cjson.encode(runtimePayload))
  
  -- Return indexed array for proper RESP2 serialization
  return {'OK', newRevision, transactionId, currentRevision}
`;

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
      
      // P0 FIX: Use deterministic staged authority - store project-level current staged transaction ID
      // Instead of scanning arbitrary keys, use an explicit project → current staged transaction index
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
            stagedGallery = parsed.gallery;
            transactionId = currentStagedTransactionId;
            console.log('[GALLERY GET] STAGED_STATE_FOUND', {
              projectId,
              stagingKey: specificStagingKey,
              transactionId,
              galleryLength: stagedGallery.length,
              stagedRevision: parsed.currentRevision
            });
          }
        }
      }
    }

    // Load from authoritative projects.v1.json (deployed state) - used as fallback
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

    // P0 FIX: Use runtime authority first, then staged, then deployed
    // This ensures stale Vercel deployments don't override live Redis state
    const effectiveGallery = runtimeGallery || stagedGallery || deployedGallery;
    let effectiveRevision = runtimeRevision;
    
    if (!effectiveRevision && stagedGallery && transactionId && redis) {
      // Fallback to staged revision if runtime not set
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${transactionId}:project:${projectId}:gallery`;
      const stagedData = await redis.get(stagingKey);
      if (stagedData) {
        let parsed: any;
        if (typeof stagedData === 'string') {
          parsed = JSON.parse(stagedData);
        } else if (typeof stagedData === 'object') {
          parsed = stagedData;
        }
        effectiveRevision = parsed?.currentRevision;
      }
    }
    
    if (!effectiveRevision) {
      effectiveRevision = deployedRevision;
    }
    
    const state = runtimeGallery ? 'runtime' : (stagedGallery ? 'staged' : 'deployed');

    console.log('[GALLERY GET] SUCCESS', { 
      projectId, 
      galleryLength: effectiveGallery.length, 
      currentRevision: effectiveRevision,
      state,
      hasStagedChanges: !!stagedGallery,
      transactionId
    });

    return NextResponse.json({
      success: true,
      projectId,
      gallery: effectiveGallery,
      galleryLength: effectiveGallery.length,
      currentRevision: effectiveRevision,
      state,
      hasStagedChanges: !!stagedGallery,
      transactionId,
      deployedGallery: deployedGallery,
      deployedRevision
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
      // P0 FIX: Read deployed revision from filesystem for initial CAS check
      const deployedRevision = project.media?.galleryRevision || 0;

      // P0 FIX: Create deployment transaction BEFORE mutation to prevent split-brain
      // If CAS fails, transaction exists but has no staging keys (safe failure state)
      const effectiveTransactionId = transactionId || `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const namespace = getKvNamespace();
      const galleryJson = JSON.stringify(gallery || []);
      const mutationTimestamp = new Date().toISOString();

      // Build Redis keys for KEYS array (per Redis contract)
      const runtimeGalleryKey = `${namespace}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
      const projectStagingKey = `${namespace}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;
      const specificStagingKey = `${namespace}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:gallery`;

      // Read current staged transaction to build currentSpecificStagingKey
      const currentStagedTransactionId = await redis.get(projectStagingKey);
      const currentSpecificStagingKey = currentStagedTransactionId
        ? `${namespace}${WORKBENCH_STAGING_PREFIX}${currentStagedTransactionId}:project:${projectId}:gallery`
        : projectStagingKey; // Fallback if no staged state

      console.log('[GALLERY V2 PUT] ATOMIC_CAS_EXECUTING', {
        projectId,
        expectedRevision,
        deployedRevision,
        galleryLength: gallery?.length || 0,
        transactionId: effectiveTransactionId,
        hasStagedState: !!currentStagedTransactionId,
        currentStagedTransactionId,
        runtimeGalleryKey,
      });

      // Create deployment transaction with empty staging keys before CAS
      // If CAS fails, transaction exists but has no staging keys (safe failure state)
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [], // Empty staging keys initially
        ['projects.v1.json'],
        `Gallery order mutation: ${projectId} (${gallery.length} items)`
      );

      // Execute atomic CAS Lua script with KEYS array
      const casResult = await redis.eval(
        ATOMIC_GALLERY_CAS_SCRIPT,
        [runtimeGalleryKey, projectStagingKey, specificStagingKey, currentSpecificStagingKey], // KEYS array
        [expectedRevision.toString(), galleryJson, effectiveTransactionId, deployedRevision.toString(), mutationTimestamp] // ARGV array
      );

      // Parse indexed array return format: ['OK', newRevision, transactionId, actualRevision] or ['ERR', errorCode, expectedRevision, actualRevision]
      if (!Array.isArray(casResult) || casResult.length < 2) {
        console.error('[GALLERY V2 PUT] ATOMIC_CAS_INVALID_RETURN', {
          projectId,
          casResult,
          reason: 'Lua script did not return indexed array'
        });
        return NextResponse.json(
          {
            error: "Gallery mutation failed",
            message: "Invalid response from atomic CAS operation"
          },
          { status: 500 }
        );
      }

      const status = casResult[0];
      if (status === 'ERR') {
        const errorCode = casResult[1];
        const actualRevision = casResult[3];
        console.error('[GALLERY V2 PUT] ATOMIC_CAS_FAILURE', {
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
      const newRevision = casResult[1];
      const actualRevision = casResult[3];

      console.log('[GALLERY V2 PUT] ATOMIC_CAS_SUCCESS', {
        projectId,
        galleryLength: gallery?.length || 0,
        newRevision,
        transactionId: effectiveTransactionId,
        actualRevision
      });

      // Merge staging keys into existing transaction after successful CAS
      await createDeploymentTransaction(
        effectiveTransactionId,
        [specificStagingKey], // Add staging keys now that CAS succeeded
        ['projects.v1.json'],
        `Gallery order mutation: ${projectId} (${gallery.length} items)`
      );

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
