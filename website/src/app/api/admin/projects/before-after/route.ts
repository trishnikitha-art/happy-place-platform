import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';
import { workbenchSession } from '@/lib/workbench-session';
import { getKvNamespace } from '@/lib/environment';

export const runtime = 'nodejs';

const PROJECTS_PATH = path.join(process.cwd(), 'src', 'config', 'projects.v1.json');
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

interface BeforeAfterRequest {
  projectId: string;
  side: 'before' | 'after';
  mediaId: string;
  transactionId?: string;
}

export async function POST(request: NextRequest) {
  // SECURITY: Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const body: BeforeAfterRequest = await request.json();
    const { projectId, side, mediaId, transactionId } = body;

    console.log('[BEFORE-AFTER API] REQUEST', { projectId, side, mediaId, transactionId });

    if (!projectId || !side || !mediaId) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, side, mediaId' },
        { status: 400 }
      );
    }

    if (side !== 'before' && side !== 'after') {
      return NextResponse.json(
        { error: 'Invalid side. Must be "before" or "after"' },
        { status: 400 }
      );
    }

    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Production: Use transactional staging format
      const effectiveTransactionId = transactionId || `WBDEP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const stagingKey = `${getKvNamespace()}${WORKBENCH_STAGING_PREFIX}${effectiveTransactionId}:project:${projectId}:${side}`;
      await redis.set(stagingKey, mediaId);

      // Create authoritative deployment transaction record
      const { createDeploymentTransaction } = await import('@/lib/deployment-transaction');
      await createDeploymentTransaction(
        effectiveTransactionId,
        [stagingKey],
        ['projects.v1.json'],
        `Project before/after assignment: ${projectId} (${side})`
      );

      console.log('[BEFORE-AFTER API] STAGED_IN_KV', { projectId, side, mediaId, stagingKey, transactionId: effectiveTransactionId });

      return NextResponse.json({
        success: true,
        projectId,
        side,
        mediaId,
        staged: true,
        persistence: 'kv',
        transactionId: effectiveTransactionId
      });
    }

    // P0 FIX: Fail-closed when Redis is unavailable in production
    // Prevents split-brain where UI accepts mutations but cannot stage them
    console.error('[BEFORE-AFTER API] REDIS_UNAVAILABLE - FAILING_CLOSED', {
      projectId,
      side,
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
    console.log('[BEFORE-AFTER API] DEV_MODE', { projectId, side, mediaId, transactionId });
    const projectsContent = fs.readFileSync(PROJECTS_PATH, 'utf-8');
    const projects = JSON.parse(projectsContent);

    const projectIndex = projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      console.error('[BEFORE-AFTER API] PROJECT_NOT_FOUND', { projectId });
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (!projects[projectIndex].media) {
      projects[projectIndex].media = {};
    }
    projects[projectIndex].media[side] = mediaId;

    console.log('[BEFORE-AFTER API] UPDATED_PROJECT', {
      projectId,
      side,
      mediaId,
      updatedMedia: projects[projectIndex].media,
    });

    // PRODUCTION GUARD: Block filesystem writes in production
    if (isProductionWriteBlocked()) {
      console.error('[BEFORE-AFTER API] PRODUCTION_WRITE_BLOCKED', { projectId, side, mediaId });
      return NextResponse.json(
        { error: "Filesystem writes are not allowed in production. Use the Workbench commit flow instead." },
        { status: 403 }
      );
    }

    fs.writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2), 'utf-8');
    console.log('[BEFORE-AFTER API] DEV_WRITE_SUCCESS', { projectId, side, mediaId });

    return NextResponse.json({
      success: true,
      projectId,
      side,
      mediaId,
      staged: false,
      persistence: 'filesystem',
      transactionId
    });
  } catch (error) {
    console.error('[BEFORE-AFTER API] ERROR', error);
    return NextResponse.json(
      {
        error: 'Failed to update before/after media',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
