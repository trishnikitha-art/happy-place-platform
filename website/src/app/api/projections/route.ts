/**
 * Projections API Route
 *
 * Returns media authority records as projections.
 * For Happy Place Carpentry, static media records are the projections.
 *
 * GET /api/projections
 */

import { NextResponse } from 'next/server';
import { loadMediaManifest } from '@/lib/media';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    const manifest = loadMediaManifest();

    // Transform media records to projection format
    const projections = manifest.media.map(media => ({
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
    }));

    // Filter by type if specified
    const filtered = type 
      ? projections.filter(p => p.type === type)
      : projections;

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('[PROJECTIONS] Failed to load projections:', error);
    return NextResponse.json(
      { error: 'Failed to load projections', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
