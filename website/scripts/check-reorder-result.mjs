/**
 * Check Gallery Reorder Result
 * 
 * Inspects runtime authority after a reorder operation.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const WORKBENCH_RUNTIME_PREFIX = 'workbench-runtime-gallery:';

function getRuntimeGalleryKey(projectId) {
  return `${KV_NAMESPACE}${WORKBENCH_RUNTIME_PREFIX}${projectId}`;
}

async function main() {
  console.log('[CHECK REORDER RESULT] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  const sourceProjectId = 'repairs-001';
  const targetProjectId = 'fences-001';

  console.log('[CHECK] Inspecting source project:', sourceProjectId);
  const sourceKey = getRuntimeGalleryKey(sourceProjectId);
  const sourceData = await redis.get(sourceKey);
  console.log('[CHECK] Source runtime authority:', {
    exists: !!sourceData,
    currentRevision: sourceData?.currentRevision,
    galleryLength: sourceData?.gallery?.length,
    galleryIds: sourceData?.gallery,
    lastTransactionId: sourceData?.lastTransactionId,
    lastMutationTimestamp: sourceData?.lastMutationTimestamp,
  });

  console.log('[CHECK] Inspecting target project:', targetProjectId);
  const targetKey = getRuntimeGalleryKey(targetProjectId);
  const targetData = await redis.get(targetKey);
  console.log('[CHECK] Target runtime authority:', {
    exists: !!targetData,
    currentRevision: targetData?.currentRevision,
    galleryLength: targetData?.gallery?.length,
    galleryIds: targetData?.gallery,
    lastTransactionId: targetData?.lastTransactionId,
    lastMutationTimestamp: targetData?.lastMutationTimestamp,
  });

  console.log('[CHECK REORDER RESULT] COMPLETE');
}

main();
