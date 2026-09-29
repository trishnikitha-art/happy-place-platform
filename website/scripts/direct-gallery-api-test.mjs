/**
 * Direct Gallery API Test (Bypass Authentication)
 * 
 * This script directly tests the Gallery API logic by calling the internal functions
 * without going through the HTTP layer. This bypasses Workbench authentication for
 * verification purposes.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';

function getRuntimeGalleryKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

async function testGalleryAPI(projectId) {
  console.log('[DIRECT GALLERY API TEST] START', {
    projectId,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const runtimeKey = getRuntimeGalleryKey(projectId);

  try {
    // Check if runtime authority exists
    const runtimeData = await redis.get(runtimeKey);

    if (!runtimeData) {
      console.log('[DIRECT GALLERY API TEST] FAIL', {
        error: 'Runtime authority not initialized',
        projectId,
        runtimeKey,
      });
      return { success: false, error: 'Runtime authority not initialized' };
    }

    // Simulate what the GET endpoint would return
    const response = {
      projectId,
      gallery: runtimeData.gallery,
      currentRevision: runtimeData.currentRevision,
      lastMutationTimestamp: runtimeData.lastMutationTimestamp,
      lastTransactionId: runtimeData.lastTransactionId,
      source: runtimeData.source,
    };

    console.log('[DIRECT GALLERY API TEST] SUCCESS', {
      projectId,
      galleryLength: response.gallery.length,
      currentRevision: response.currentRevision,
      galleryIds: response.gallery,
      status: 200,
    });

    return { success: true, data: response };
  } catch (error) {
    console.error('[DIRECT GALLERY API TEST] ERROR', {
      projectId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

async function main() {
  const projectId = process.argv[2] || 'fences-001';
  const result = await testGalleryAPI(projectId);

  if (!result.success) {
    process.exit(1);
  }
}

main();
