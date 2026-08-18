import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

const PROJECTS_PATH = path.join(process.cwd(), 'src', 'config', 'projects.v1.json');

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

    // Read projects config
    const projectsContent = fs.readFileSync(PROJECTS_PATH, 'utf-8');
    const projects = JSON.parse(projectsContent);

    // Find the project
    const projectIndex = projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      console.error('[BEFORE-AFTER API] PROJECT_NOT_FOUND', { projectId });
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Update the before/after media ID
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

    // Write back to config
    fs.writeFileSync(PROJECTS_PATH, JSON.stringify(projects, null, 2), 'utf-8');

    return NextResponse.json({
      success: true,
      projectId,
      side,
      mediaId,
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
