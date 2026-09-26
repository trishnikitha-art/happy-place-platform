/**
 * Bulk Runtime Authority Bootstrap Script
 * 
 * Initializes runtime authority for all canonical projects from filesystem projection.
 * This is a maintenance script to bootstrap runtime authority for all projects
 * that lack it after the P0 architecture was established.
 * 
 * Usage:
 * node scripts/bootstrap-all-runtime-authority.mjs
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
  console.log('[BOOTSTRAP ALL] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url, token });

  // Read filesystem projection
  const projectsPath = join(process.cwd(), 'src/config/projects.v1.json');
  const projectsData = JSON.parse(readFileSync(projectsPath, 'utf-8'));

  const results = {
    totalProjects: projectsData.projects.length,
    initialized: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const project of projectsData.projects) {
    const projectId = project.id;
    const runtimeKey = getRuntimeGalleryKey(projectId);
    const visibilityKey = getVisibilityKey(projectId);

    try {
      // Check if runtime authority already exists
      const existingRuntime = await redis.get(runtimeKey);

      if (existingRuntime) {
        console.log('[BOOTSTRAP ALL] SKIPPED', {
          projectId,
          reason: 'Runtime authority already exists',
          currentRevision: existingRuntime.currentRevision,
        });
        results.skipped++;
        continue;
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
        console.log('[BOOTSTRAP ALL] SKIPPED', {
          projectId,
          reason: 'Runtime authority already exists (race condition)',
        });
        results.skipped++;
        continue;
      }

      // P0 FIX: Initialize visibility authority atomically with gallery authority
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
        console.log('[BOOTSTRAP ALL] VISIBILITY_ALREADY_EXISTS', { projectId });
      } else {
        console.log('[BOOTSTRAP ALL] VISIBILITY_INITIALIZED', { projectId });
      }

      console.log('[BOOTSTRAP ALL] INITIALIZED', {
        projectId,
        galleryLength: gallery.length,
        currentRevision: galleryRevision,
        galleryIds: gallery,
        visibilityInitialized: visibilitySetResult,
      });

      results.initialized++;
    } catch (error) {
      console.error('[BOOTSTRAP ALL] FAILED', {
        projectId,
        error: error.message,
      });
      results.failed++;
      results.errors.push({
        projectId,
        error: error.message,
      });
    }
  }

  console.log('[BOOTSTRAP ALL] COMPLETE', {
    totalProjects: results.totalProjects,
    initialized: results.initialized,
    skipped: results.skipped,
    failed: results.failed,
    errors: results.errors,
    timestamp: new Date().toISOString(),
  });

  if (results.failed > 0) {
    process.exit(1);
  }
}

main();
