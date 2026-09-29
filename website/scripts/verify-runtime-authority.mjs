/**
 * Verify Runtime Authority Structure
 * 
 * Directly reads runtime authority from Redis to verify it's correctly structured.
 * This bypasses Workbench authentication for verification purposes.
 */

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

import { Redis } from '@upstash/redis';

async function main() {
  console.log('[VERIFY RUNTIME AUTHORITY] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const prefix = 'hpp:production:workbench-runtime-gallery:';

  const projectIds = [
    'fences-001',
    'pergolas-001',
    'builtins-001',
    'repairs-001',
    'exterior-painting-001',
    'bathroom-remodeling-001',
    'davis-bathroom-remodel-001',
    'johnson-cedar-fence-001',
    'martinez-pergola-001',
    'smith-built-ins-001',
    'wilson-home-repairs-001',
  ];

  for (const projectId of projectIds) {
    const key = `${prefix}${projectId}`;
    const data = await redis.get(key);

    console.log(`[VERIFY] ${projectId}:`, {
      exists: !!data,
      currentRevision: data?.currentRevision,
      galleryLength: data?.gallery?.length,
      galleryIds: data?.gallery,
      lastTransactionId: data?.lastTransactionId,
      source: data?.source,
    });
  }

  console.log('[VERIFY RUNTIME AUTHORITY] COMPLETE');
}

main();
