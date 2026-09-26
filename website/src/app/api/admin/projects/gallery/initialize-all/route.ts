/**
 * Gallery Runtime Authority Bulk Initialization
 * POST /api/admin/projects/gallery/initialize-all
 * 
 * Initializes runtime authority for all canonical projects that lack it.
 * This is a controlled, authenticated maintenance operation.
 * 
 * For each project in projects.v1.json:
 * - Use atomic create-if-absent semantics (SET with NX)
 * - If authority exists: skip (preserve existing revision/state)
 * - If authority absent: initialize from filesystem projection
 * 
 * P0 ARCHITECTURAL GUARDRAILS:
 * - Runtime authority remains sole CAS authority
 * - Never overwrites existing runtime state
 * - Never resets revisions or replaces newer Redis state with filesystem state
 * - Never runs as part of ordinary GET (requires explicit POST)
 * - Never reintroduces filesystem CAS fallback
 * - Atomic create-if-absent prevents race conditions
 * - Idempotent: safe to retry
 * 
 * SECURITY: Requires Workbench authentication
 */

import { NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";
import { Redis } from '@upstash/redis';
import { getKvNamespace } from '@/lib/environment';
import { getRedisClient } from '@/lib/deployment-transaction';
import { ATOMIC_GALLERY_VISIBILITY_BOOTSTRAP_SCRIPT } from '@/lib/deployment-transaction';

export const runtime = 'nodejs';

const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';
const WORKBENCH_VISIBILITY_PREFIX = 'workbench-visibility-gallery:';

function getRuntimeGalleryKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

function getVisibilityKey(projectId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${WORKBENCH_VISIBILITY_PREFIX}${projectId}`;
}

export async function POST(request: Request) {
  // SECURITY: Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis unavailable", message: "Cannot initialize without Redis" },
        { status: 503 }
      );
    }

    // Read filesystem projection
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const results = {
      totalProjects: projectsData.projects.length,
      initialized: 0,
      skipped: 0,
      failed: 0,
      errors: [] as Array<{ projectId: string; error: string }>,
    };

    console.log('[GALLERY INITIALIZE-ALL] START', {
      totalProjects: results.totalProjects,
      timestamp: new Date().toISOString(),
    });

    for (const project of projectsData.projects) {
      const projectId = project.id;
      const runtimeKey = getRuntimeGalleryKey(projectId);
      const visibilityKey = getVisibilityKey(projectId);

      try {
        // Prepare runtime payload from filesystem projection
        const gallery = project.media?.gallery || [];
        const galleryRevision = project.media?.galleryRevision || 0;

        const runtimePayload = {
          gallery,
          currentRevision: galleryRevision,
          lastMutationTimestamp: new Date().toISOString(),
          lastTransactionId: 'BOOTSTRAP',
          source: 'filesystem-bootstrap',
        };

        // P0 FIX: Initialize visibility authority atomically with gallery authority
        const visibilityPayload = {
          schemaVersion: 1,
          projectId,
          hiddenGallery: [],
          visibilityRevision: 0,
          initializedAt: new Date().toISOString(),
          lastMutationTimestamp: new Date().toISOString(),
        };

        // P0 FIX: Use atomic Lua script to handle all four states
        const result = await redis.eval(
          ATOMIC_GALLERY_VISIBILITY_BOOTSTRAP_SCRIPT,
          [runtimeKey, visibilityKey],
          [JSON.stringify(runtimePayload), JSON.stringify(visibilityPayload)]
        ) as any[];

        const status = result[0] as string;
        const runtimeState = result[1] as string;
        const visibilityState = result[2] as string;

        if (status !== 'OK') {
          console.error('[GALLERY INITIALIZE-ALL] PROJECT_FAILED', {
            projectId,
            reason: 'Bootstrap failed',
            status,
          });
          results.failed++;
          results.errors.push({
            projectId,
            error: 'Bootstrap failed',
          });
          continue;
        }

        if (runtimeState === 'EXISTING' && visibilityState === 'EXISTING') {
          console.log('[GALLERY INITIALIZE-ALL] SKIPPED', {
            projectId,
            reason: 'Both authorities already exist',
          });
          results.skipped++;
        } else {
          console.log('[GALLERY INITIALIZE-ALL] INITIALIZED', {
            projectId,
            galleryLength: gallery.length,
            currentRevision: galleryRevision,
            runtimeState,
            visibilityState,
          });
          results.initialized++;
        }
      } catch (error) {
        console.error('[GALLERY INITIALIZE-ALL] PROJECT_FAILED', {
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
        results.failed++;
        results.errors.push({
          projectId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log('[GALLERY INITIALIZE-ALL] COMPLETE', {
      totalProjects: results.totalProjects,
      initialized: results.initialized,
      skipped: results.skipped,
      failed: results.failed,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      results,
      message: `Initialized ${results.initialized} projects, skipped ${results.skipped} (already initialized), failed ${results.failed}`,
    });
  } catch (error) {
    console.error('[GALLERY INITIALIZE-ALL] ERROR', error);
    return NextResponse.json(
      { error: "Failed to initialize runtime authority for all projects" },
      { status: 500 }
    );
  }
}
