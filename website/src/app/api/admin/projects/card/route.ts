/**
 * Admin Project Card API Endpoint
 * 
 * Updates the hero mediaId for a project in projects.v1.json
 * 
 * POST /api/admin/projects/card
 * Body: { projectId: string, mediaId: string }
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
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";
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
    const { projectId, mediaId } = body;

    if (!projectId || !mediaId) {
      return NextResponse.json(
        { error: "projectId and mediaId are required" },
        { status: 400 }
      );
    }

    console.log('[CARD UPDATE] REQUEST_RECEIVED', { projectId, mediaId });

    // Use KV for production persistence to avoid EROFS errors
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Production: Store in KV staging area
      const stagingKey = `${WORKBENCH_STAGING_PREFIX}project:${projectId}:hero`;
      await redis.set(stagingKey, mediaId);
      console.log('[CARD UPDATE] STAGED_IN_KV', { projectId, mediaId, stagingKey });
      
      return NextResponse.json({ 
        success: true, 
        projectId, 
        mediaId,
        staged: true,
        persistence: 'kv'
      });
    }

    // Development: Write to local filesystem
    console.log('[CARD UPDATE] DEV_MODE', { projectId, mediaId });

    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    projectsData.projects[projectIndex].media.hero = mediaId;
    projectsData.generatedAt = new Date().toISOString();

    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

    console.log('[CARD UPDATE] DEV_WRITE_SUCCESS', { projectId, mediaId });

    return NextResponse.json({ 
      success: true, 
      projectId, 
      mediaId,
      staged: false,
      persistence: 'filesystem'
    });
  } catch (error) {
    console.error('[CARD UPDATE] ERROR', error);
    return NextResponse.json(
      { error: "Failed to update project card" },
      { status: 500 }
    );
  }
}
