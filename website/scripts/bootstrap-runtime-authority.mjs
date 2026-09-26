/**
 * Runtime Authority Bootstrap Script
 * 
 * Safely initializes runtime authority for specific projects from filesystem projection.
 * This is a maintenance script to execute the bootstrap operation for projects
 * that lack runtime authority after the P0 architecture was established.
 * 
 * Usage:
 * node scripts/bootstrap-runtime-authority.mjs <projectId>
 * 
 * Example:
 * node scripts/bootstrap-runtime-authority.mjs fences-001
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Redis } from '@upstash/redis';

// Load environment variables
const url = process.env.KV_REST_API_URL || process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API__KV_REST_API_TOKEN;

if (!url || !token) {
  console.error('ERROR: Missing required environment variables');
  console.error('Required: KV_REST_API_URL and KV_REST_API_TOKEN');
  process.exit(1);
}

const projectId = process.argv[2];
if (!projectId) {
  console.error('ERROR: projectId is required');
  console.error('Usage: node scripts/bootstrap-runtime-authority.mjs <projectId>');
  process.exit(1);
}

const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';
const WORKBENCH_VISIBILITY_PREFIX = 'workbench-visibility-gallery:';
const KV_NAMESPACE = 'hpp:production:';

function getRuntimeGalleryKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

function getVisibilityKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_VISIBILITY_PREFIX}${projectId}`;
}

async function main() {
  console.log('[BOOTSTRAP] START', {
    projectId,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url, token });
  const runtimeKey = getRuntimeGalleryKey(projectId);
  const visibilityKey = getVisibilityKey(projectId);

  try {
    // Check if runtime authority already exists
    const existingRuntime = await redis.get(runtimeKey);
    
    if (existingRuntime) {
      console.log('[BOOTSTRAP] SKIPPED', {
        projectId,
        reason: 'Runtime authority already exists',
        currentRevision: existingRuntime.currentRevision,
        lastMutationTimestamp: existingRuntime.lastMutationTimestamp,
        lastTransactionId: existingRuntime.lastTransactionId,
      });
      return;
    }

    // Read filesystem projection
    const projectsPath = join(process.cwd(), 'src/config/projects.v1.json');
    const projectsData = JSON.parse(readFileSync(projectsPath, 'utf-8'));

    const project = projectsData.projects.find((p) => p.id === projectId);
    if (!project) {
      console.error('[BOOTSTRAP] ERROR', {
        projectId,
        reason: 'Project not found in filesystem projection',
      });
      process.exit(1);
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

    // Use atomic create-if-absent for runtime authority
    const setResult = await redis.set(runtimeKey, runtimePayload, { nx: true });

    if (!setResult) {
      console.log('[BOOTSTRAP] SKIPPED', {
        projectId,
        reason: 'Runtime authority already exists (race condition)',
      });
      return;
    }

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

    // Use atomic create-if-absent for visibility as well
    const visibilitySetResult = await redis.set(visibilityKey, visibilityPayload, { nx: true });

    if (!visibilitySetResult) {
      console.log('[BOOTSTRAP] VISIBILITY_ALREADY_EXISTS', { projectId });
    } else {
      console.log('[BOOTSTRAP] VISIBILITY_INITIALIZED', { projectId });
    }

    console.log('[BOOTSTRAP] SUCCESS', {
      projectId,
      runtimeKey,
      galleryLength: gallery.length,
      currentRevision: galleryRevision,
      galleryIds: gallery,
      source: 'filesystem-bootstrap',
      visibilityInitialized: visibilitySetResult,
      timestamp: new Date().toISOString(),
    });

    console.log('[BOOTSTRAP] VERIFICATION', {
      message: 'Runtime authority initialized from filesystem projection',
      nextStep: 'Verify GET /api/admin/projects/gallery returns 200',
      visibilityNextStep: 'Verify visibility authority exists in Redis',
    });
  } catch (error) {
    console.error('[BOOTSTRAP] ERROR', {
      projectId,
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

main();
