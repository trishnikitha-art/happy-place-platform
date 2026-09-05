/**
 * Inspect KV Media Records for Storage Field
 *
 * This script inspects existing KV media records to identify
 * which records lack the storage field or have invalid storage values.
 *
 * This is diagnostic only - it does not modify KV.
 *
 * Usage:
 *   node scripts/inspect-kv-media-storage.mjs
 */

import { Redis } from '@upstash/redis';

/**
 * Get environment - matches media-kv-store.ts logic
 */
function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  
  if (vercelEnv === 'production') {
    return 'production';
  }
  
  if (vercelEnv === 'preview') {
    return 'preview';
  }
  
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  console.warn('[INSPECT] Unknown environment, defaulting to development');
  return 'development';
}

/**
 * Get KV namespace prefix - matches media-kv-store.ts logic
 */
function getKvNamespace() {
  if (process.env.TEST_NAMESPACE) {
    return process.env.TEST_NAMESPACE;
  }
  
  const env = getEnvironment();
  return `hpp:${env}:`;
}

/**
 * Apply namespace prefix to KV key
 */
function namespacedKey(key) {
  const namespace = getKvNamespace();
  return `${namespace}${key}`;
}

function getRedisClient() {
  let url = process.env.KV_REST_API_URL;
  let token = process.env.KV_REST_API_TOKEN;

  const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
  const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;

  if (!url && integrationUrl) {
    url = integrationUrl;
  }
  if (!token && integrationToken) {
    token = integrationToken;
  }

  if (!url || !token) {
    console.error('[INSPECT] KV credentials not configured');
    return null;
  }

  const redis = new Redis({ url, token });
  
  console.log('[INSPECT] Redis client configured', {
    environment: getEnvironment(),
    namespace: getKvNamespace(),
  });
  
  return redis;
}

async function inspectKvMediaStorage() {
  console.log('[INSPECT] Starting KV media storage inspection...');
  
  const redis = getRedisClient();
  if (!redis) {
    console.error('[INSPECT] Cannot inspect: KV client not available');
    process.exit(1);
  }

  console.log('[INSPECT] KV namespace configuration', {
    environment: getEnvironment(),
    namespace: getKvNamespace(),
  });

  const MEDIA_PREFIX = 'media:';
  const namespace = getKvNamespace();
  const pattern = `${namespace}${MEDIA_PREFIX}*`;

  console.log('[INSPECT] Scanning for media records with pattern:', pattern);

  let totalRecords = 0;
  let missingStorage = 0;
  let invalidStorage = 0;
  let validStorage = 0;
  const missingStorageIds = [];
  const invalidStorageIds = [];

  try {
    // Scan for all media keys
    const keys = [];
    let cursor = 0;
    
    do {
      const result = await redis.scan(cursor, { match: pattern, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== 0);

    console.log(`[INSPECT] Found ${keys.length} media keys`);

    // Inspect each record
    for (const key of keys) {
      totalRecords++;
      const value = await redis.get(key);
      
      if (!value) {
        console.log(`[INSPECT] SKIP: ${key} - no value`);
        continue;
      }

      let media;
      try {
        media = JSON.parse(value);
      } catch (e) {
        console.error(`[INSPECT] ERROR: ${key} - failed to parse JSON`);
        continue;
      }

      const mediaId = key.replace(namespace + MEDIA_PREFIX, '');

      if (!media.storage) {
        missingStorage++;
        missingStorageIds.push(mediaId);
        console.log(`[INSPECT] MISSING_STORAGE: ${mediaId}`);
      } else if (media.storage !== 'static' && media.storage !== 'blob') {
        invalidStorage++;
        invalidStorageIds.push({ id: mediaId, storage: media.storage });
        console.log(`[INSPECT] INVALID_STORAGE: ${mediaId} - storage="${media.storage}"`);
      } else {
        validStorage++;
      }
    }

    console.log('\n[INSPECT] SUMMARY');
    console.log('================');
    console.log(`Total media records: ${totalRecords}`);
    console.log(`Valid storage (static/blob): ${validStorage}`);
    console.log(`Missing storage field: ${missingStorage}`);
    console.log(`Invalid storage value: ${invalidStorage}`);
    
    if (missingStorageIds.length > 0) {
      console.log('\n[INSPECT] RECORDS MISSING STORAGE:');
      missingStorageIds.forEach(id => console.log(`  - ${id}`));
    }
    
    if (invalidStorageIds.length > 0) {
      console.log('\n[INSPECT] RECORDS WITH INVALID STORAGE:');
      invalidStorageIds.forEach(({ id, storage }) => console.log(`  - ${id}: "${storage}"`));
    }

    console.log('\n[INSPECT] RECOMMENDATION:');
    if (missingStorage > 0 || invalidStorage > 0) {
      console.log('Execute media authority sync to repair records:');
      console.log('  POST /api/admin/diagnostic/sync-media-authority');
      console.log('or run: node scripts/sync-media-to-kv.mjs');
    } else {
      console.log('All media records have valid storage fields.');
    }

  } catch (error) {
    console.error('[INSPECT] Fatal error:', error);
    process.exit(1);
  }
}

inspectKvMediaStorage()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[INSPECT] Fatal error:', error);
    process.exit(1);
  });
