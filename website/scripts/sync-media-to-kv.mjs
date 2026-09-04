/**
 * Sync Media Authority from Static File to KV
 * 
 * This script reads media.v1.main.json and populates the KV media authority
 * with all records that have constitutional fields (lifecycleState, source, contentHash).
 * 
 * This is required to populate the production KV with the corrected media records.
 * 
 * CRITICAL: Uses the same namespace logic as media-kv-store.ts to ensure
 * the sync script writes to the same KV namespace that the runtime reads from.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Redis } from '@upstash/redis';

const MEDIA_MAIN_FILE = join(process.cwd(), 'src/config/media.v1.json');

/**
 * Get environment - matches media-kv-store.ts logic
 */
function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  
  // Vercel production
  if (vercelEnv === 'production') {
    return 'production';
  }
  
  // Vercel preview
  if (vercelEnv === 'preview') {
    return 'preview';
  }
  
  // Local development
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  // Test environment
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  // Default to development for sync script
  console.warn('[SYNC] Unknown environment, defaulting to development');
  return 'development';
}

/**
 * Get KV namespace prefix - matches media-kv-store.ts logic
 */
function getKvNamespace() {
  // Check for test namespace override (integration tests)
  if (process.env.TEST_NAMESPACE) {
    return process.env.TEST_NAMESPACE;
  }
  
  const env = getEnvironment();
  return `hpp:${env}:`;
}

/**
 * Apply namespace prefix to KV key - matches media-kv-store.ts logic
 */
function namespacedKey(key) {
  const namespace = getKvNamespace();
  return `${namespace}${key}`;
}

function getRedisClient() {
  let url = process.env.KV_REST_API_URL;
  let token = process.env.KV_REST_API_TOKEN;

  // Check integration-generated variables
  const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
  const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;

  // Use integration credentials if primary not set
  if (!url && integrationUrl) {
    url = integrationUrl;
  }
  if (!token && integrationToken) {
    token = integrationToken;
  }

  if (!url || !token) {
    console.error('[SYNC] KV credentials not configured');
    return null;
  }

  const redis = new Redis({ url, token });
  
  console.log('[SYNC] Redis client configured', {
    environment: getEnvironment(),
    namespace: getKvNamespace(),
  });
  
  return redis;
}

async function syncMediaToKv() {
  console.log('[SYNC] Reading media.v1.json...');
  
  const data = JSON.parse(readFileSync(MEDIA_MAIN_FILE, 'utf8'));
  
  const redis = getRedisClient();
  if (!redis) {
    console.error('[SYNC] Cannot sync: KV client not available');
    process.exit(1);
  }

  console.log('[SYNC] KV namespace configuration', {
    environment: getEnvironment(),
    namespace: getKvNamespace(),
  });

  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const media of data.media) {
    // Skip if missing constitutional fields
    if (!media.lifecycleState || !media.source || !media.contentHash) {
      skippedCount++;
      console.log(`[SYNC] SKIP: ${media.id} - missing constitutional fields`);
      continue;
    }

    // Only sync published local media
    if (media.lifecycleState !== 'published' || media.source !== 'local') {
      skippedCount++;
      console.log(`[SYNC] SKIP: ${media.id} - not published local media`);
      continue;
    }

    try {
      const key = namespacedKey(`media:${media.id}`);
      await redis.set(key, JSON.stringify(media));
      
      syncedCount++;
      console.log(`[SYNC] SYNCED: ${media.id}`);
      console.log(`  key: ${key}`);
      console.log(`  lifecycleState: ${media.lifecycleState}`);
      console.log(`  source: ${media.source}`);
      console.log(`  contentHash: ${media.contentHash}`);
      console.log(`  storage: ${media.storage || 'missing'}`);
    } catch (error) {
      errorCount++;
      console.error(`[SYNC] ERROR: ${media.id} - ${error.message}`);
    }
  }

  console.log(`[SYNC] Complete: ${syncedCount} synced, ${skippedCount} skipped, ${errorCount} errors`);
  console.log('[SYNC] KV media authority now has constitutional fields');
  console.log('[SYNC] Namespace:', getKvNamespace());
}

syncMediaToKv()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[SYNC] Fatal error:', error);
    process.exit(1);
  });
