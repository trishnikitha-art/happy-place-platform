import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const PROJECTS_PATH = path.join(process.cwd(), 'src', 'config', 'projects.v1.json');

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
}

export async function POST(request: NextRequest) {
  try {
    const body: BeforeAfterRequest = await request.json();
    const { projectId, side, mediaId } = body;

    console.log('[BEFORE-AFTER API] REQUEST', { projectId, side, mediaId });

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

    if (isProduction) {
      // Production: NEVER write to the read-only filesystem. Stage in KV.
      if (!redis) {
        return NextResponse.json(
          {
            error: 'Persistence unavailable',
            details: 'KV_REST_API_URL / KV_REST_API_TOKEN must be configured in production',
          },
          { status: 503 }
        );
      }
      const stagingKey = `workbench-staging:project:${projectId}:beforeafter`;
      const current = (await redis.get<Record<string, string | null>>(stagingKey)) || {};
      current[side] = mediaId;
      await redis.set(stagingKey, current);
      console.log('[BEFORE-AFTER API] STAGED_IN_KV', { projectId, side, mediaId, stagingKey });
      return NextResponse.json({ success: true, projectId, side, mediaId, staged: true, persistence: 'kv' });
    }

    // Development only: write to local filesystem
    console.log('[BEFORE-AFTER API] DEV_MODE', { projectId, side, mediaId });
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

    fs.writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2), 'utf-8');
    console.log('[BEFORE-AFTER API] DEV_WRITE_SUCCESS', { projectId, side, mediaId });

    return NextResponse.json({
      success: true,
      projectId,
      side,
      mediaId,
      staged: false,
      persistence: 'filesystem',
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
