/**
 * Projections API Route - Single Projection
 *
 * Returns a single media authority record as a projection.
 *
 * GET /api/projections/:id
 */

import { NextResponse } from 'next/server';
import { loadMediaManifest } from '@/lib/media';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const manifest = loadMediaManifest();
    const media = manifest.media.find(m => m.id === id);

    if (!media) {
      return NextResponse.json(
        { error: 'Projection not found' },
        { status: 404 }
      );
    }

    // Transform media record to projection format
    const projection = {
      id: media.id,
      type: media.type || 'image',
      name: media.filename || media.id,
      status: media.lifecycleState || 'published',
      health: media.source === 'local' ? 'healthy' : 'unknown',
      lastActivity: media.updatedAt || media.createdAt,
      summary: {
        service: media.service,
        city: media.city,
        state: media.state,
        projectId: media.projectId,
        roles: media.roles,
        featured: media.featured,
      },
    };

    return NextResponse.json(projection);
  } catch (error) {
    console.error('[PROJECTIONS] Failed to load projection:', error);
    return NextResponse.json(
      { error: 'Failed to load projection', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
