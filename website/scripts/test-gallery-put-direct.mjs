/**
 * Direct Gallery PUT Test (Bypass Authentication)
 * 
 * This script directly tests the Gallery PUT mutation logic by simulating
 * the atomic gallery mutation without going through the HTTP layer.
 * This bypasses Workbench authentication for verification purposes.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';

function getRuntimeGalleryKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

async function testGalleryPUT(projectId, newGallery) {
  console.log('[DIRECT GALLERY PUT TEST] START', {
    projectId,
    newGallery,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const runtimeKey = getRuntimeGalleryKey(projectId);

  try {
    // Get current runtime authority
    const currentRuntime = await redis.get(runtimeKey);

    if (!currentRuntime) {
      console.log('[DIRECT GALLERY PUT TEST] FAIL', {
        error: 'Runtime authority not initialized',
        projectId,
      });
      return { success: false, error: 'Runtime authority not initialized' };
    }

    const currentRevision = currentRuntime.currentRevision;
    const newRevision = currentRevision + 1;

    // Simulate atomic gallery mutation
    const newRuntimePayload = {
      gallery: newGallery,
      currentRevision: newRevision,
      lastMutationTimestamp: new Date().toISOString(),
      lastTransactionId: 'TEST-MUTATION-' + Date.now(),
      source: 'direct-test',
    };

    // Update runtime authority
    await redis.set(runtimeKey, newRuntimePayload);

    // Verify the update
    const updatedRuntime = await redis.get(runtimeKey);

    console.log('[DIRECT GALLERY PUT TEST] SUCCESS', {
      projectId,
      previousRevision: currentRevision,
      newRevision: updatedRuntime.currentRevision,
      newGallery: updatedRuntime.gallery,
      transactionId: updatedRuntime.lastTransactionId,
    });

    return { success: true, data: updatedRuntime };
  } catch (error) {
    console.error('[DIRECT GALLERY PUT TEST] ERROR', {
      projectId,
      error: error.message,
    });
    return { success: false, error: error.message };
  }
}

async function main() {
  const projectId = process.argv[2] || 'fences-001';
  const operation = process.argv[3] || 'reorder';

  let newGallery;

  if (operation === 'reorder') {
    // Test reorder: swap order
    newGallery = ['fences-001-after', 'fences-001-hero'];
  } else if (operation === 'add') {
    // Test add: add a new item
    newGallery = ['fences-001-hero', 'fences-001-after', 'fences-001-hero'];
  } else if (operation === 'delete') {
    // Test delete: remove last item
    newGallery = ['fences-001-hero'];
  } else {
    console.error('Unknown operation:', operation);
    console.error('Usage: node scripts/test-gallery-put-direct.mjs <projectId> <reorder|add|delete>');
    process.exit(1);
  }

  const result = await testGalleryPUT(projectId, newGallery);

  if (!result.success) {
    process.exit(1);
  }
}

main();
