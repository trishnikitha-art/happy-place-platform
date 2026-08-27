/**
 * Admin Project Gallery Photo API Endpoint
 * 
 * Updates a specific gallery photo mediaId for a project in projects.v1.json
 * 
 * POST /api/admin/projects/gallery
 * Body: { projectId: string, galleryIndex: number, mediaId: string, operation: 'replace' | 'add' }
 * 
 * operation:
 *   - 'replace': Replace existing gallery item at index (default)
 *   - 'add': Append new mediaId to gallery (galleryIndex ignored)
 * 
 * Requires Workbench authentication.
 * 
 * Constitutional Architecture:
 * - In development: Writes to local filesystem for testing
 * - In production: Uses KV persistence to avoid EROFS errors
 * - Deploy route commits changes to GitHub
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

    // Validate mediaId exists in authoritative KV media source
    const mediaExists = await getMediaByIdAsync(mediaId);
    if (!mediaExists) {
      console.log('[GALLERY POST] INVALID_MEDIA_ID', { mediaId });
      return NextResponse.json(
        { error: "Media ID not found in authoritative media sources" },
        { status: 400 }
      );
    }

    // Use KV for production persistence to avoid EROFS errors
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Production: Use transactional staging format
      const effectiveTransactionId = transactionId || `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const stagingKey = `${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:gallery`;
      
      // Store as array with the single mediaId at the specified index
      const galleryArray = [mediaId];
      await redis.set(stagingKey, JSON.stringify(galleryArray));
      
      // Create authoritative deployment transaction record
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [stagingKey],
        ['projects.v1.json'],
        `Project gallery assignment: ${projectId} (index ${galleryIndex})`
      );
      
      console.log('[GALLERY POST] STAGED_IN_KV', { 
        projectId, 
        operation, 
        mediaId, 
        stagingKey, 
        transactionId: effectiveTransactionId 
      });
      
      return NextResponse.json({ 
        success: true, 
        projectId, 
        operation,
        galleryIndex,
        mediaId,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId
      });
    }

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

    // Use KV for production persistence to avoid EROFS errors
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      const stagingKey = `${WORKBENCH_STAGING_PREFIX}project:${projectId}:gallery`;
      const currentGallery = await redis.get<(string | null)[]>(stagingKey) || [];
      
      if (galleryIndex < 0 || galleryIndex >= currentGallery.length) {
        return NextResponse.json(
          { error: "Gallery index out of bounds" },
          { status: 400 }
        );
      }
      
      currentGallery[galleryIndex] = null;
      await redis.set(stagingKey, currentGallery);
      console.log('[GALLERY DELETE] STAGED_IN_KV', { projectId, galleryIndex });
      
      return NextResponse.json({ 
        success: true, 
        projectId, 
        galleryIndex,
        staged: true,
        persistence: 'kv'
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
