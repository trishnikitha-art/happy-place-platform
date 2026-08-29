import { NextResponse } from "next/server";
import { Redis } from '@upstash/redis';
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";
import { getKvNamespace } from '@/lib/environment';

export const runtime = 'nodejs';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';

// PRODUCTION GUARD: Prevent runtime writes to read-only Vercel filesystem
function isProductionWriteBlocked(): boolean {
  // Block writes in Vercel production environment
  return process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
}

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
    const { projectId, mediaId, transactionId } = body;

    if (!projectId || !mediaId) {
      return NextResponse.json(
        { error: "projectId and mediaId are required" },
        { status: 400 }
      );
    }

<<<<<<< HEAD
    console.log('[CARD UPDATE] REQUEST_RECEIVED', { projectId, mediaId, transactionId });
=======
    console.log('[DND SERVER 1] REQUEST_RECEIVED', { projectId, mediaId });
    console.log('[DND SERVER 2] IDENTIFIER_VALIDATION', { projectId, mediaId });

    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Production: Store in KV staging area with transaction ID
      // Use provided transaction ID or generate new one for compatibility
      const effectiveTransactionId = transactionId || `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:hero`;
      await redis.set(stagingKey, mediaId);

      // Create authoritative deployment transaction record (single source of truth)
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [stagingKey],
        ['projects.v1.json'],
        `Project card assignment: ${projectId}`
      );

      console.log('[CARD UPDATE] STAGED_IN_KV', { projectId, mediaId, stagingKey, transactionId: effectiveTransactionId });

      return NextResponse.json({
        success: true,
        projectId,
        mediaId,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId
      });
    }

    // P0 FIX: Fail-closed when Redis is unavailable in production
    // Prevents split-brain where UI accepts mutations but cannot stage them
    console.error('[CARD UPDATE] REDIS_UNAVAILABLE - FAILING_CLOSED', {
      projectId,
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

    projectsData.projects[projectIndex].media = projectsData.projects[projectIndex].media || {};
    projectsData.projects[projectIndex].media.hero = mediaId;
    projectsData.generatedAt = new Date().toISOString();

    // PRODUCTION GUARD: Block filesystem writes in production
    if (isProductionWriteBlocked()) {
      console.error('[CARD UPDATE] PRODUCTION_WRITE_BLOCKED', { projectId, mediaId });
      return NextResponse.json(
        { error: "Filesystem writes are not allowed in production. Use the Workbench commit flow instead." },
        { status: 403 }
      );
    }

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
