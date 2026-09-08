/**
 * Effective Gallery Diagnostic Endpoint
 *
 * Traces the effective gallery resolution to identify why valid KV records
 * aren't showing up in the Gallery projection.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getEffectiveProjectGallery } from '@/lib/effective-project-gallery';
import { loadProjectsManifest } from '@/lib/projects';
import { getEnvironment } from '@/lib/environment';

export async function GET() {
  // Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required for effective gallery diagnostic' },
      { status: 401 }
    );
  }

  const auditId = `effective-gallery-${Date.now()}`;
  const results: any[] = [];

  try {
    const manifest = loadProjectsManifest();
    const environment = getEnvironment();
    const nodeEnv = process.env.NODE_ENV;
    const vercelEnv = process.env.VERCEL_ENV;

    console.log('[EFFECTIVE_GALLERY_DIAGNOSTIC] START', {
      auditId,
      environment,
      nodeEnv,
      vercelEnv,
      totalProjects: manifest.projects.length
    });

    for (const project of manifest.projects) {
      const baselineGallery = project.media?.gallery || [];
      const baselineRevision = project.media?.galleryRevision || 0;
      const effectiveGallery = await getEffectiveProjectGallery(project.id);

      results.push({
        projectId: project.id,
        projectTitle: project.title,
        baselineGalleryLength: baselineGallery.length,
        baselineGalleryIds: baselineGallery,
        baselineRevision,
        effectiveGalleryLength: effectiveGallery.length,
        effectiveGalleryIds: effectiveGallery,
        match: JSON.stringify(baselineGallery) === JSON.stringify(effectiveGallery),
        environment,
        nodeEnv,
        vercelEnv
      });
    }

    return NextResponse.json({
      success: true,
      auditId,
      performedAt: new Date().toISOString(),
      environment: {
        environment,
        nodeEnv,
        vercelEnv
      },
      projects: results,
      summary: {
        totalProjects: results.length,
        projectsWithBaselineGallery: results.filter(r => r.baselineGalleryLength > 0).length,
        projectsWithEffectiveGallery: results.filter(r => r.effectiveGalleryLength > 0).length,
        projectsMismatched: results.filter(r => !r.match).length
      }
    });
  } catch (error) {
    console.error('[EFFECTIVE_GALLERY_DIAGNOSTIC] ERROR', {
      auditId,
      error: error instanceof Error ? error.message : String(error)
    });

    return NextResponse.json(
      {
        success: false,
        auditId,
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
