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

/**
 * Atomic Lua script for gallery CAS (Compare-And-Set) mutation
 * 
 * This script atomically:
 * 1. Reads the current gallery state (staged or deployed)
 * 2. Compares the revision with expectedRevision
 * 3. If match, writes the new gallery with incremented revision
 * 4. Updates the project-level transaction pointer
 * 5. Returns the new revision
 * 
 * Prevents race conditions where concurrent gallery mutations could
 * corrupt the revision counter or overwrite each other's changes.
 */
const ATOMIC_GALLERY_CAS_SCRIPT = `
  local namespace = ARGV[1]
  local projectId = ARGV[2]
  local expectedRevision = tonumber(ARGV[3])
  local newGalleryJson = ARGV[4]
  local transactionId = ARGV[5]
  
  -- Build keys
  local projectStagingKey = namespace .. 'workbench-staging:project:' .. projectId .. ':current-transaction'
  local specificStagingKey = namespace .. 'workbench-staging:' .. transactionId .. ':project:' .. projectId .. ':gallery'
  
  -- Read current staged transaction (if any)
  local currentStagedTransactionId = redis.call('GET', projectStagingKey)
  local currentGallery = nil
  local currentRevision = 0
  
  if currentStagedTransactionId and currentStagedTransactionId ~= '' then
    -- Load the current staged gallery
    local currentSpecificStagingKey = namespace .. 'workbench-staging:' .. currentStagedTransactionId .. ':project:' .. projectId .. ':gallery'
    local stagedData = redis.call('GET', currentSpecificStagingKey)
    
    if stagedData then
      -- Upstash may return object or string
      local parsed
      if type(stagedData) == 'string' then
        parsed = cjson.decode(stagedData)
      elseif type(stagedData) == 'table' then
        parsed = stagedData
      else
        -- Invalid data type, CAS fails
        return {err = 'INVALID_STAGED_DATA_TYPE', dataType = type(stagedData)}
      end
      
      if parsed then
        currentGallery = parsed.gallery
        currentRevision = tonumber(parsed.currentRevision) or 0
      end
    end
  end
  
  -- CAS: Compare current revision with expected revision
  if currentRevision ~= expectedRevision then
    return {err = 'CAS_FAILURE', expectedRevision = expectedRevision, actualRevision = currentRevision}
  end
  
  -- Write new gallery with incremented revision
  local newGallery = cjson.decode(newGalleryJson)
  local newRevision = currentRevision + 1
  local galleryPayload = {
    gallery = newGallery,
    currentRevision = newRevision,
    previousGallery = currentGallery or {},
    mutationTimestamp = ARGV[6]
  }
  
  -- Write the specific staging key
  redis.call('SET', specificStagingKey, cjson.encode(galleryPayload))
  
  -- Update the project-level transaction pointer
  redis.call('SET', projectStagingKey, transactionId)
  
  return {ok = 'GALLERY_UPDATED', newRevision = newRevision, transactionId = transactionId}
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
    
    if (isProduction && redis) {
      // P0 FIX: Use deterministic staged authority - store project-level current staged transaction ID
      // Instead of scanning arbitrary keys, use an explicit project → current staged transaction index
      const projectStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;
      const currentStagedTransactionId = await redis.get(projectStagingKey);
      
      if (currentStagedTransactionId && typeof currentStagedTransactionId === 'string') {
        // Load the specific staged transaction
        const specificStagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${currentStagedTransactionId}:project:${projectId}:gallery`;
        const stagedData = await redis.get(specificStagingKey);
        
        if (stagedData && typeof stagedData === 'string') {
          const parsed = JSON.parse(stagedData);
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

    // Load from authoritative projects.v1.json (deployed state)
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

    // P0 FIX: Return staged state if available, otherwise deployed state
    // For staged state, use the actual currentRevision from the transaction data (not synthetic +1)
    // This enables multiple edits of staged state without CAS failure
    const effectiveGallery = stagedGallery || deployedGallery;
    let effectiveRevision = deployedRevision;
    
    if (stagedGallery && transactionId && redis) {
      // The GET must return the revision from the staged transaction data
      // so PUT can compare against it for subsequent edits
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${transactionId}:project:${projectId}:gallery`;
      const stagedData = await redis.get(stagingKey);
      if (stagedData) {
        // P0 FIX: Upstash automatically deserializes JSON objects
        // Accept both string (needs JSON.parse) and object (already parsed)
        let parsed: any;
        if (typeof stagedData === 'string') {
          parsed = JSON.parse(stagedData);
        } else if (typeof stagedData === 'object') {
          parsed = stagedData;
        } else {
          effectiveRevision = deployedRevision + 1;
        }
        effectiveRevision = parsed?.currentRevision || deployedRevision + 1;
      } else {
        effectiveRevision = deployedRevision + 1;
      }
    } else if (stagedGallery && transactionId) {
      // Fallback if Redis check failed but we have staged state info
      effectiveRevision = deployedRevision + 1;
    }
    
    const state = stagedGallery ? 'staged' : 'deployed';

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

  try {
    const body = await request.json();
    const { projectId, gallery, transactionId, expectedRevision } = body;

    if (!projectId || !Array.isArray(gallery)) {
      return NextResponse.json(
        { error: "projectId and gallery array are required" },
        { status: 400 }
      );
    }

    console.log('[GALLERY V2 PUT] REQUEST_RECEIVED', { projectId, galleryLength: gallery.length, transactionId });

    // P0: Input validation - gallery must be array
    if (!Array.isArray(gallery)) {
      return NextResponse.json(
        { error: "gallery must be an array" },
        { status: 400 }
      );
    }

    // P0: Input validation - no duplicate media IDs
    const uniqueMediaIds = new Set(gallery);
    if (uniqueMediaIds.size !== gallery.length) {
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
    if (gallery.some(id => id === null || id === undefined)) {
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
    if (gallery.some(id => typeof id === 'string' && id.trim() === '')) {
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
      gallery.map(async (mediaId) => {
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
    const redis = getRedisClient();
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
      console.log('[GALLERY V2 PUT] DEV_MODE - Direct filesystem write', { projectId, galleryLength: gallery.length });

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
      projectsData.projects[projectIndex].media.gallery = gallery;
      projectsData.projects[projectIndex].media.galleryRevision = newRevision;
      projectsData.generatedAt = new Date().toISOString();

      writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

      console.log('[GALLERY V2 PUT] DEV_WRITE_SUCCESS', {
        projectId,
        galleryLength: gallery.length,
        newRevision
      });

      return NextResponse.json({
        success: true,
        projectId,
        gallery,
        galleryLength: gallery.length,
        currentRevision: newRevision,
        staged: false,
        persistence: 'filesystem',
        mode: 'development'
      });
    }

    // Use KV for production persistence to avoid EROFS errors
    if (isProduction && redis) {
      // P0 FIX: Use atomic Lua script for CAS (Compare-And-Set) gallery mutation
      // This prevents race conditions where concurrent mutations could corrupt the revision counter
      const effectiveTransactionId = transactionId || `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const namespace = getKvNamespace();
      const galleryJson = JSON.stringify(gallery);
      const mutationTimestamp = new Date().toISOString();

      console.log('[GALLERY V2 PUT] ATOMIC_CAS_EXECUTING', {
        projectId,
        expectedRevision,
        galleryLength: gallery.length,
        transactionId: effectiveTransactionId,
        namespace
      });

      // Execute atomic CAS Lua script
      const casResult = await redis.eval(
        ATOMIC_GALLERY_CAS_SCRIPT,
        [], // No keys needed for this script
        [namespace, projectId, expectedRevision.toString(), galleryJson, effectiveTransactionId, mutationTimestamp]
      );

      // Check for CAS failure
      if (casResult && typeof casResult === 'object' && 'err' in casResult) {
        const errorResult = casResult as { err: string; expectedRevision?: number; actualRevision?: number };
        console.error('[GALLERY V2 PUT] ATOMIC_CAS_FAILURE', {
          projectId,
          error: errorResult.err,
          expectedRevision: errorResult.expectedRevision,
          actualRevision: errorResult.actualRevision
        });

        if (errorResult.err === 'CAS_FAILURE') {
          return NextResponse.json(
            {
              error: "Concurrent modification detected",
              message: "Gallery has been modified by another operation. Please reload and try again.",
              currentRevision: errorResult.actualRevision,
              expectedRevision: errorResult.expectedRevision
            },
            { status: 409 }
          );
        } else {
          return NextResponse.json(
            {
              error: "Gallery mutation failed",
              message: errorResult.err
            },
            { status: 500 }
          );
        }
      }

      // Extract new revision from successful CAS result
      const successResult = casResult as { ok: string; newRevision: number; transactionId: string };
      const newRevision = successResult.newRevision;
      const stagingKey = `${namespace}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:gallery`;
      const projectStagingKey = `${namespace}${WORKBENCH_STAGING_PREFIX}project:${projectId}:current-transaction`;

      console.log('[GALLERY V2 PUT] ATOMIC_CAS_SUCCESS', {
        projectId,
        galleryLength: gallery.length,
        newRevision,
        transactionId: effectiveTransactionId,
        stagingKey,
        projectStagingKey
      });

      // Create authoritative deployment transaction record after atomic write succeeds
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [stagingKey],
        ['projects.v1.json'],
        `Gallery order mutation: ${projectId} (${gallery.length} items)`
      );

      console.log('[GALLERY V2 PUT] STAGED_IN_KV', {
        projectId,
        galleryLength: gallery.length,
        stagingKey,
        projectStagingKey,
        transactionId: effectiveTransactionId,
        newRevision
      });

      return NextResponse.json({
        success: true,
        projectId,
        gallery,
        galleryLength: gallery.length,
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
    console.error('[GALLERY V2 PUT] ERROR', error);
    return NextResponse.json(
      { error: "Failed to update project gallery order" },
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
