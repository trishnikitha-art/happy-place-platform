/**
 * Gallery Runtime Authority Bootstrap
 * POST /api/admin/projects/gallery/bootstrap
 * 
 * Initializes runtime authority from filesystem projection.
 * This is a one-time/maintenance operation to bootstrap runtime authority
 * from the deployed filesystem state (projects.v1.json).
 * 
 * After bootstrap, runtime authority becomes the sole CAS authority.
 * Filesystem is only for projection/fallback thereafter.
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
    const body = await request.json();
    const { projectId } = body;

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis unavailable", message: "Cannot bootstrap without Redis" },
        { status: 503 }
      );
    }

    // Read filesystem projection first (before Redis operation)
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    const project = projectsData.projects.find((p: any) => p.id === projectId);
    if (!project) {
      return NextResponse.json(
        { error: "Project not found in filesystem projection" },
        { status: 404 }
      );
    }

    const gallery = project.media?.gallery || [];
    const galleryRevision = project.media?.galleryRevision || 0;

    // Initialize runtime authority from filesystem projection
    const runtimePayload = {
      gallery,
      currentRevision: galleryRevision,
      lastMutationTimestamp: new Date().toISOString(),
      lastTransactionId: 'BOOTSTRAP',
      source: 'filesystem-bootstrap',
    };

    // P0 FIX: Initialize visibility authority atomically with gallery authority
    // Every initialized gallery membership authority must have a corresponding initialized visibility authority
    const visibilityPayload = {
      schemaVersion: 1,
      projectId,
      hiddenGallery: [],
      visibilityRevision: 0,
      initializedAt: new Date().toISOString(),
      lastMutationTimestamp: new Date().toISOString(),
    };

    const runtimeGalleryKey = getRuntimeGalleryKey(projectId);
    const visibilityKey = getVisibilityKey(projectId);

    // P0 FIX: Use atomic Lua script to handle all four states
    // - runtime exists + visibility exists → NO-OP
    // - runtime exists + visibility missing → CREATE visibility
    // - runtime missing + visibility exists → CREATE runtime
    // - runtime missing + visibility missing → CREATE BOTH
    const result = await redis.eval(
      ATOMIC_GALLERY_VISIBILITY_BOOTSTRAP_SCRIPT,
      [runtimeGalleryKey, visibilityKey],
      [JSON.stringify(runtimePayload), JSON.stringify(visibilityPayload)]
    ) as any[];

    const status = result[0] as string;
    const runtimeState = result[1] as string;
    const visibilityState = result[2] as string;

    if (status !== 'OK') {
      return NextResponse.json(
        { error: "Bootstrap failed", message: status },
        { status: 500 }
      );
    }

    console.log('[GALLERY BOOTSTRAP] SUCCESS', {
      projectId,
      galleryLength: gallery.length,
      currentRevision: galleryRevision,
      source: 'filesystem-bootstrap',
      runtimeState,
      visibilityState,
    });

    return NextResponse.json({
      success: true,
      projectId,
      gallery,
      galleryLength: gallery.length,
      currentRevision: galleryRevision,
      source: 'filesystem-bootstrap',
      runtimeState,
      visibilityState,
      message: "Runtime authority initialized from filesystem projection",
    });
  } catch (error) {
    console.error('[GALLERY BOOTSTRAP] ERROR', error);
    return NextResponse.json(
      { error: "Failed to bootstrap runtime authority" },
      { status: 500 }
    );
  }
}
