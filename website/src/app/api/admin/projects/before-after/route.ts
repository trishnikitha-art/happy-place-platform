import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';

const PROJECTS_PATH = path.join(process.cwd(), 'src', 'config', 'projects.v1.json');
const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';

interface BeforeAfterRequest {
  projectId: string;
  side: 'before' | 'after';
  mediaId: string;
}

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

    // Use KV for production persistence to avoid EROFS errors
    const redis = getRedisClient();
    const isProduction = process.env.NODE_ENV === 'production';
    
    if (isProduction && redis) {
      // Production: Store in KV staging area
      const stagingKey = `${WORKBENCH_STAGING_PREFIX}project:${projectId}:${side}`;
      await redis.set(stagingKey, mediaId);
      console.log('[BEFORE-AFTER API] STAGED_IN_KV', { projectId, side, mediaId, stagingKey });
      
      return NextResponse.json({
        success: true,
        projectId,
        side,
        mediaId,
        staged: true,
        persistence: 'kv'
      });
    }

    // Development: Write to local filesystem
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

    console.log('[BEFORE-AFTER API] UPDATED_PROJECT', {
      projectId,
      side,
      mediaId,
      updatedMedia: projects[projectIndex].media,
    });

    fs.writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      projectId,
      side,
      mediaId,
      staged: false,
      persistence: 'filesystem'
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
