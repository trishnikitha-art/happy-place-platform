import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";

export const runtime = 'nodejs';

// Shared KV client factory. Returns null (never throws) when credentials are absent,
// so callers can branch on presence instead of crashing.
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

    console.log('[DND SERVER 1] REQUEST_RECEIVED', { projectId, mediaId });
    console.log('[DND SERVER 2] IDENTIFIER_VALIDATION', { projectId, mediaId });

    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';

    if (isProduction) {
      // Production: NEVER write to the read-only filesystem. Stage in KV.
      if (!redis) {
        return NextResponse.json(
          {
            error: "Persistence unavailable",
            details: "KV_REST_API_URL / KV_REST_API_TOKEN must be configured in production",
          },
          { status: 503 }
        );
      }
      const stagingKey = `workbench-staging:project:${projectId}:card`;
      await redis.set(stagingKey, mediaId);
      console.log('[DND SERVER] STAGED_IN_KV', { projectId, mediaId, stagingKey });
      return NextResponse.json({ success: true, projectId, mediaId, staged: true, persistence: 'kv' });
    }

    // Development only: write to local filesystem
    console.log('[DND SERVER] DEV_MODE', { projectId, mediaId });
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    projectsData.projects[projectIndex].media = projectsData.projects[projectIndex].media || {};
    projectsData.projects[projectIndex].media.hero = mediaId;
    projectsData.generatedAt = new Date().toISOString();

    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));
    console.log('[DND SERVER] DEV_WRITE_SUCCESS', { projectId, mediaId });

    return NextResponse.json({ success: true, projectId, mediaId, staged: false, persistence: 'filesystem' });
  } catch (error) {
    console.error("Error updating project card:", error);
    return NextResponse.json(
      { error: "Failed to update project card" },
      { status: 500 }
    );
  }
}
