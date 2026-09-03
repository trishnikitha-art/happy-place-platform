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
import { getMediaByIdAsync } from "@/lib/media";
import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';

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

/**
 * GET /api/admin/projects/gallery?projectId={projectId}
 * 
 * Retrieve current gallery state for a project.
 * Returns the complete ordered gallery array for use in atomic mutations.
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

    // Load from authoritative projects.v1.json
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const project = projectsData.projects.find((p: any) => p.id === projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const gallery = project.media?.gallery || [];
    const currentRevision = project.media?.galleryRevision || 0;

    console.log('[GALLERY GET] SUCCESS', { projectId, galleryLength: gallery.length, currentRevision });

    return NextResponse.json({
      success: true,
      projectId,
      gallery,
      galleryLength: gallery.length,
      currentRevision
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

    // Validate all mediaIds exist in authoritative KV media source
    const mediaValidationResults = await Promise.all(
      gallery.map(async (mediaId) => {
        const mediaExists = await getMediaByIdAsync(mediaId);
        return { mediaId, valid: !!mediaExists };
      })
    );

    const invalidMediaIds = mediaValidationResults.filter(r => !r.valid);
    if (invalidMediaIds.length > 0) {
      console.error('[GALLERY V2 PUT] INVALID_MEDIA_IDS', { invalidMediaIds });
      return NextResponse.json(
        { 
          error: "Invalid media IDs provided", 
          invalidMediaIds,
          message: "All media IDs must exist in authoritative media sources"
        },
        { status: 400 }
      );
    }

    // P0: Revision/concurrency barrier - read current state
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));
    const project = projectsData.projects.find((p: any) => p.id === projectId);
    
    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const currentGallery = project.media?.gallery || [];
    const currentRevision = project.media?.galleryRevision || 0;
    
    console.log('[GALLERY V2 PUT] CONCURRENCY_CHECK', {
      projectId,
      currentGalleryLength: currentGallery.length,
      newGalleryLength: gallery.length,
      currentRevision,
      expectedRevision
    });
    
    // CAS: Compare current revision with expected revision (only if expectedRevision is provided)
    if (expectedRevision !== undefined && expectedRevision !== currentRevision) {
      console.error('[GALLERY V2 PUT] CAS_FAILURE', {
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

    // SIMPLIFIED DEVELOPMENT MODE: Direct filesystem write
    // This bypasses the complex KV staging → deployment transaction → Git commit pipeline
    // for development testing and verification of the basic drag → save → reload round-trip
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    if (isDevelopment) {
      console.log('[GALLERY V2 PUT] DEV_MODE - Direct filesystem write', { projectId, galleryLength: gallery.length });
      
      // Find project index for direct write
      const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
      if (projectIndex === -1) {
        return NextResponse.json(
          { error: "Project not found" },
          { status: 404 }
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
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Production: Use transactional staging format
      const effectiveTransactionId = transactionId || `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:gallery`;

      // Store the complete ordered gallery array with revision metadata
      const newRevision = currentRevision + 1;
      const galleryPayload = {
        gallery,
        currentRevision: newRevision,
        previousGallery: currentGallery,
        mutationTimestamp: new Date().toISOString()
      };
      await redis.set(stagingKey, JSON.stringify(galleryPayload));

      // Create authoritative deployment transaction record
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
        transactionId: effectiveTransactionId,
        currentRevision,
        previousGalleryLength: currentGallery.length
      });

      return NextResponse.json({
        success: true,
        projectId,
        gallery,
        galleryLength: gallery.length,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId,
        currentRevision
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
 * LEGACY POST - Single-item gallery mutation (DEPRECATED)
 * 
 * Replaced by PUT /api/admin/projects/gallery for atomic ordered gallery authority.
 * Maintained for backward compatibility during migration.
 * 
 * POST /api/admin/projects/gallery
 * Body: { projectId: string, galleryIndex: number, mediaId: string, operation: 'replace' | 'add' }
 * 
 * operation:
 *   - 'replace': Replace existing gallery item at index (default)
 *   - 'add': Append new mediaId to gallery (galleryIndex ignored)
 * 
 * DEPRECATED: Use PUT /api/admin/projects/gallery with complete ordered array instead.
 */
export async function POST(request: Request) {
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
    const { projectId, galleryIndex, mediaId, operation = 'replace', transactionId } = body;

    if (!projectId || !mediaId) {
      return NextResponse.json(
        { error: "projectId and mediaId are required" },
        { status: 400 }
      );
    }

    if (operation === 'replace' && galleryIndex === undefined) {
      return NextResponse.json(
        { error: "galleryIndex is required for replace operation" },
        { status: 400 }
      );
    }

    console.log('[GALLERY POST] REQUEST_RECEIVED', { projectId, galleryIndex, mediaId, operation, transactionId });

    // DEPRECATION WARNING
    console.warn('[GALLERY POST] DEPRECATED_ENDPOINT', {
      warning: 'POST endpoint is deprecated. Use PUT /api/admin/projects/gallery with complete ordered array instead.',
      currentOperation: operation,
      recommendedOperation: 'PUT with complete gallery array'
    });

    // Validate mediaId exists in authoritative KV media source
    const mediaExists = await getMediaByIdAsync(mediaId);
    if (!mediaExists) {
      console.log('[GALLERY POST] INVALID_MEDIA_ID', { mediaId });
      return NextResponse.json(
        { error: "Media ID not found in authoritative media sources" },
        { status: 400 }
      );
    }

    // For 'add' operation, prepend to beginning of existing gallery
    // For 'replace' operation, we would need to load existing gallery first
    // Since this is deprecated, we stage the single mediaId as before
    
    // Use KV for production persistence to avoid EROFS errors
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Production: Use transactional staging format
      const effectiveTransactionId = transactionId || `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:gallery`;

      // DEPRECATED: Stage single mediaId (NOT recommended for production use)
      const galleryArray = [mediaId];
      await redis.set(stagingKey, JSON.stringify(galleryArray));

      // Create authoritative deployment transaction record
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [stagingKey],
        ['projects.v1.json'],
        `DEPRECATED gallery mutation: ${projectId} (index ${galleryIndex})`
      );

      console.log('[GALLERY POST] STAGED_IN_KV', {
        projectId,
        operation,
        mediaId,
        stagingKey,
        transactionId: effectiveTransactionId,
        deprecation: true
      });

      return NextResponse.json({
        success: true,
        projectId,
        operation,
        galleryIndex,
        mediaId,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId,
        deprecation: true
      });
    }

    // P0 FIX: Fail-closed when Redis is unavailable in production
    // Prevents split-brain where UI accepts mutations but cannot stage them
    console.error('[GALLERY POST] REDIS_UNAVAILABLE - FAILING_CLOSED', {
      projectId,
      operation,
      mediaId,
      transactionId,
      environment: process.env.NODE_ENV,
      reason: 'KV credentials not configured or Redis unavailable'
    });

    return NextResponse.json(
      {
        error: "Redis unavailable",
        message: "Staging storage is unavailable. Cannot accept mutations without Redis staging.",
        projectId,
        mediaId,
        transactionId
      },
      { status: 503 }
    );

    // Development: Write to local filesystem
    console.log('[GALLERY POST] DEV_MODE', { projectId, operation, mediaId });

    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!projectsData.projects[projectIndex].media) {
      projectsData.projects[projectIndex].media = {};
    }
    if (!projectsData.projects[projectIndex].media.gallery) {
      projectsData.projects[projectIndex].media.gallery = [];
    }

    const gallery = projectsData.projects[projectIndex].media.gallery;

    if (operation === 'add') {
      gallery.push(mediaId);
    } else {
      if (galleryIndex < 0 || galleryIndex >= gallery.length) {
        return NextResponse.json(
          { error: "Gallery index out of bounds" },
          { status: 400 }
        );
      }
      gallery[galleryIndex] = mediaId;
    }

    projectsData.generatedAt = new Date().toISOString();
    
    // PRODUCTION GUARD: Block filesystem writes in production
    if (isProductionWriteBlocked()) {
      console.error('[GALLERY POST] PRODUCTION_WRITE_BLOCKED', { projectId, operation, mediaId });
      return NextResponse.json(
        { error: "Filesystem writes are not allowed in production. Use the Workbench commit flow instead." },
        { status: 403 }
      );
    }
    
    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

    console.log('[GALLERY POST] DEV_WRITE_SUCCESS', { projectId, operation, mediaId, transactionId });

    return NextResponse.json({ 
      success: true, 
      projectId, 
      operation,
      galleryIndex: operation === 'add' ? gallery.length - 1 : galleryIndex,
      mediaId,
      galleryLength: gallery.length,
      staged: false,
      persistence: 'filesystem',
      transactionId
    });
  } catch (error) {
    console.error('[GALLERY POST] ERROR', error);
    return NextResponse.json(
      { error: "Failed to update project gallery photo" },
      { status: 500 }
    );
  }
}

/**
 * LEGACY DELETE - Gallery item deletion (DEPRECATED)
 * 
 * Replaced by PUT /api/admin/projects/gallery with complete ordered array.
 * Maintained for backward compatibility during migration.
 * 
 * DELETE /api/admin/projects/gallery
 * Body: { projectId: string, galleryIndex: number }
 * 
 * DEPRECATED: Use PUT /api/admin/projects/gallery with complete ordered array (minus deleted item) instead.
 */
export async function DELETE(request: Request) {
  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    // Proceed without authentication
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Workbench authentication required" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json();
    const { projectId, galleryIndex } = body;

    if (!projectId || galleryIndex === undefined) {
      return NextResponse.json(
        { error: "projectId and galleryIndex are required" },
        { status: 400 }
      );
    }

    console.log('[GALLERY DELETE] REQUEST_RECEIVED', { projectId, galleryIndex });

    // DEPRECATION WARNING
    console.warn('[GALLERY DELETE] DEPRECATED_ENDPOINT', {
      warning: 'DELETE endpoint is deprecated. Use PUT /api/admin/projects/gallery with complete ordered array (minus deleted item) instead.',
      currentOperation: 'delete',
      recommendedOperation: 'PUT with complete gallery array'
    });

    // Use KV for production persistence to avoid EROFS errors
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // DEPRECATED: Use non-transactional staging key (old protocol)
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}project:${projectId}:gallery`;
      const currentGallery = await redis.get<(string | null)[]>(stagingKey) || [];
      
      if (galleryIndex < 0 || galleryIndex >= currentGallery.length) {
        return NextResponse.json(
          { error: "Gallery index out of bounds" },
          { status: 400 }
        );
      }
      
      // DEPRECATED: Creates null hole instead of removing item
      currentGallery[galleryIndex] = null;
      await redis.set(stagingKey, currentGallery);
      console.log('[GALLERY DELETE] STAGED_IN_KV', { projectId, galleryIndex, deprecation: true });
      
      return NextResponse.json({ 
        success: true, 
        projectId, 
        galleryIndex,
        staged: true,
        persistence: 'kv',
        deprecation: true
      });
    }

    // Development: Write to local filesystem
    console.log('[GALLERY DELETE] DEV_MODE', { projectId, galleryIndex });

    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!projectsData.projects[projectIndex].media?.gallery) {
      return NextResponse.json(
        { error: "Project has no gallery" },
        { status: 400 }
      );
    }

    if (galleryIndex < 0 || galleryIndex >= projectsData.projects[projectIndex].media.gallery.length) {
      return NextResponse.json(
        { error: "Gallery index out of bounds" },
        { status: 400 }
      );
    }

    projectsData.projects[projectIndex].media.gallery[galleryIndex] = null;
    projectsData.generatedAt = new Date().toISOString();
    
    // PRODUCTION GUARD: Block filesystem writes in production
    if (isProductionWriteBlocked()) {
      console.error('[GALLERY DELETE] PRODUCTION_WRITE_BLOCKED', { projectId, galleryIndex });
      return NextResponse.json(
        { error: "Filesystem writes are not allowed in production. Use the Workbench commit flow instead." },
        { status: 403 }
      );
    }
    
    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

    console.log('[GALLERY DELETE] DEV_WRITE_SUCCESS', { projectId, galleryIndex });

    return NextResponse.json({ 
      success: true, 
      projectId, 
      galleryIndex,
      staged: false,
      persistence: 'filesystem'
    });
  } catch (error) {
    console.error('[GALLERY DELETE] ERROR', error);
    return NextResponse.json(
      { error: "Failed to delete project gallery photo" },
      { status: 500 }
    );
  }
}
