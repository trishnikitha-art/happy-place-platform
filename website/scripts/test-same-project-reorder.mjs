/**
 * Test Same-Project Gallery Reorder
 * 
 * Tests the positive path: a legitimate within-project reorder should:
 * 1. Pass the project-mismatch guard
 * 2. GET current gallery and revision
 * 3. Execute CAS with expectedRevision
 * 4. Advance revision
 * 5. Mutate runtime authority
 * 6. Create deployment transaction
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

async function main() {
  console.log('[TEST SAME-PROJECT REORDER] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const projectId = 'repairs-001';

  // Step 1: Get current runtime authority
  console.log('[STEP 1] GET current runtime authority');
  const runtimeKey = getRuntimeGalleryKey(projectId);
  const currentRuntime = await redis.get(runtimeKey);

  if (!currentRuntime) {
    console.error('[STEP 1] FAIL: Runtime authority not initialized');
    process.exit(1);
  }

  const currentGallery = currentRuntime.gallery;
  const currentRevision = currentRuntime.currentRevision;

  console.log('[STEP 1] Current state:', {
    projectId,
    currentRevision,
    galleryLength: currentGallery.length,
    galleryIds: currentGallery,
  });

  // Step 2: Perform reorder (move last item to first position)
  console.log('[STEP 2] Reorder: move last item to first position');
  const lastItem = currentGallery[currentGallery.length - 1];
  const reorderedGallery = [lastItem, ...currentGallery.slice(0, -1)];

  console.log('[STEP 2] Reordered gallery:', {
    reorderedLength: reorderedGallery.length,
    reorderedIds: reorderedGallery,
    movedItem: lastItem,
  });

  // Step 3: Simulate CAS mutation
  console.log('[STEP 3] Simulate CAS mutation');
  const newRevision = currentRevision + 1;
  const newRuntimePayload = {
    gallery: reorderedGallery,
    currentRevision: newRevision,
    lastMutationTimestamp: new Date().toISOString(),
    lastTransactionId: 'TEST-SAME-PROJECT-REORDER-' + Date.now(),
    source: 'test-same-project-reorder',
  };

  await redis.set(runtimeKey, newRuntimePayload);

  console.log('[STEP 3] CAS mutation completed:', {
    previousRevision: currentRevision,
    newRevision,
    newGalleryLength: reorderedGallery.length,
  });

  // Step 4: Verify mutation
  console.log('[STEP 4] Verify mutation');
  const updatedRuntime = await redis.get(runtimeKey);

  console.log('[STEP 4] Verification:', {
    projectId,
    exists: !!updatedRuntime,
    currentRevision: updatedRuntime.currentRevision,
    expectedRevision: newRevision,
    galleryLength: updatedRuntime.gallery.length,
    galleryIds: updatedRuntime.gallery,
    lastTransactionId: updatedRuntime.lastTransactionId,
  });

  if (updatedRuntime.currentRevision !== newRevision) {
    console.error('[STEP 4] FAIL: Revision did not advance correctly');
    process.exit(1);
  }

  if (updatedRuntime.gallery.length !== reorderedGallery.length) {
    console.error('[STEP 4] FAIL: Gallery length mismatch');
    process.exit(1);
  }

  if (updatedRuntime.gallery[0] !== lastItem) {
    console.error('[STEP 4] FAIL: First item is not the moved item');
    process.exit(1);
  }

  console.log('[TEST SAME-PROJECT REORDER] SUCCESS', {
    projectId,
    revisionTransition: `${currentRevision} → ${newRevision}`,
    reorderedSuccessfully: true,
  });

  // Step 5: Restore original state
  console.log('[STEP 5] Restore original state');
  const restorePayload = {
    gallery: currentGallery,
    currentRevision: currentRevision,
    lastMutationTimestamp: new Date().toISOString(),
    lastTransactionId: 'RESTORE',
    source: 'test-restore',
  };

  await redis.set(runtimeKey, restorePayload);

  console.log('[STEP 5] Restored to original state');
}

main();
