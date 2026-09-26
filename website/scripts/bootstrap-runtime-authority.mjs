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

// Import the atomic bootstrap script
const ATOMIC_GALLERY_VISIBILITY_BOOTSTRAP_SCRIPT = `
  local runtimeGalleryKey = KEYS[1]
  local visibilityKey = KEYS[2]
  local runtimePayload = ARGV[1]
  local visibilityPayload = ARGV[2]
  
  local runtimeExists = redis.call('EXISTS', runtimeGalleryKey)
  local visibilityExists = redis.call('EXISTS', visibilityKey)
  
  local runtimeState = 'EXISTING'
  local visibilityState = 'EXISTING'
  
  -- Handle all four states
  if runtimeExists == 1 and visibilityExists == 1 then
    -- Both exist - NO-OP
    return {'OK', 'EXISTING', 'EXISTING'}
  elseif runtimeExists == 1 and visibilityExists == 0 then
    -- Runtime exists, visibility missing - CREATE visibility
    redis.call('SET', visibilityKey, visibilityPayload)
    visibilityState = 'CREATED'
    return {'OK', 'EXISTING', 'CREATED'}
  elseif runtimeExists == 0 and visibilityExists == 1 then
    -- Runtime missing, visibility exists - CREATE runtime
    redis.call('SET', runtimeGalleryKey, runtimePayload)
    runtimeState = 'CREATED'
    return {'OK', 'CREATED', 'EXISTING'}
  else
    -- Both missing - CREATE BOTH
    redis.call('SET', runtimeGalleryKey, runtimePayload)
    redis.call('SET', visibilityKey, visibilityPayload)
    runtimeState = 'CREATED'
    visibilityState = 'CREATED'
    return {'OK', 'CREATED', 'CREATED'}
  end
`;

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

// P0 FIX: Use canonical environment namespace mechanism
const env = process.env.ENVIRONMENT || 'production';
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';
const WORKBENCH_VISIBILITY_PREFIX = 'workbench-visibility-gallery:';
const KV_NAMESPACE = `hpp:${env}:`;

function getRuntimeGalleryKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

function getVisibilityKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_VISIBILITY_PREFIX}${projectId}`;
}

async function main() {
  console.log('[BOOTSTRAP] START', {
    projectId,
    environment: env,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url, token });
  const runtimeKey = getRuntimeGalleryKey(projectId);
  const visibilityKey = getVisibilityKey(projectId);

  try {
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

    // Initialize visibility authority atomically with gallery authority
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
    );

    const status = result[0];
    const runtimeState = result[1];
    const visibilityState = result[2];

    if (status !== 'OK') {
      console.error('[BOOTSTRAP] ERROR', {
        projectId,
        reason: 'Bootstrap failed',
        status,
      });
      process.exit(1);
    }

    console.log('[BOOTSTRAP] SUCCESS', {
      projectId,
      runtimeKey,
      galleryLength: gallery.length,
      currentRevision: galleryRevision,
      galleryIds: gallery,
      source: 'filesystem-bootstrap',
      runtimeState,
      visibilityState,
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
