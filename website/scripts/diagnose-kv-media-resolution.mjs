/**
 * Diagnose KV Media Resolution
 * 
 * This script checks if specific media IDs exist in KV and whether they
 * have the correct constitutional fields for public resolution.
 * 
 * This is used to diagnose why media IDs like repairs-001-hero and fences-001-hero
 * are returning null in production.
 */

import { join } from 'path';
import { Redis } from '@upstash/redis';
import { readFileSync } from 'fs';

const MEDIA_FILE = join(process.cwd(), 'src/config/media.v1.json');

/**
 * Get environment - matches media-kv-store.ts logic
 */
function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  
  if (vercelEnv === 'production') return 'production';
  if (vercelEnv === 'preview') return 'preview';
  if (nodeEnv === 'development') return 'development';
  if (nodeEnv === 'test') return 'test';
  
  console.warn('[DIAGNOSE] Unknown environment, defaulting to development');
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

  if (!url && integrationUrl) url = integrationUrl;
  if (!token && integrationToken) token = integrationToken;

  if (!url || !token) {
    console.error('[DIAGNOSE] KV credentials not configured');
    return null;
  }

  const redis = new Redis({ url, token });
  
  console.log('[DIAGNOSE] Redis client configured', {
    environment: getEnvironment(),
    namespace: getKvNamespace(),
  });
  
  return redis;
}

async function diagnoseMediaResolution() {
  console.log('[DIAGNOSE] Reading media.v1.json...');
  
  const data = JSON.parse(readFileSync(MEDIA_FILE, 'utf8'));
  const redis = getRedisClient();
  
  if (!redis) {
    console.error('[DIAGNOSE] Cannot diagnose: KV client not available');
    process.exit(1);
  }

  // Check specific problematic IDs from production evidence
  const problematicIds = [
    'repairs-001-hero',
    'fences-001-hero',
    'outdoor-living-0',
    'fences-001-before',
    'smith-built-ins-0',
    'fences-001-detail',
    'fences-001-gate',
    'martinez-pergola-0',
    'repairs-001-floor',
    'fences-001-after',
    'built-ins-0',
    'pergolas-0',
    'repairs-001-gutter',
    'fences-0',
  ];

  console.log('[DIAGNOSE] Checking problematic media IDs in KV...');
  console.log('[DIAGNOSE] Namespace:', getKvNamespace());
  console.log('');

  for (const mediaId of problematicIds) {
    const key = namespacedKey(`media:${mediaId}`);
    const kvRecord = await redis.get(key);
    
    console.log(`[DIAGNOSE] ${mediaId}:`);
    console.log(`  KV key: ${key}`);
    console.log(`  Exists in KV: ${kvRecord !== null}`);
    
    if (kvRecord) {
      const media = typeof kvRecord === 'string' ? JSON.parse(kvRecord) : kvRecord;
      console.log(`  lifecycleState: ${media.lifecycleState || 'missing'}`);
      console.log(`  source: ${media.source || 'missing'}`);
      console.log(`  contentHash: ${media.contentHash || 'missing'}`);
      console.log(`  storage: ${media.storage || 'missing'}`);
      console.log(`  variants.original: ${media.variants?.original || 'missing'}`);
      
      // Check if record passes public gate criteria
      const hasConstitutionalFields = 
        media.lifecycleState === 'published' &&
        media.source === 'local' &&
        media.contentHash &&
        media.storage;
      
      console.log(`  Passes public gate: ${hasConstitutionalFields}`);
      
      if (!hasConstitutionalFields) {
        console.log(`  MISSING FIELDS:`);
        if (media.lifecycleState !== 'published') console.log(`    - lifecycleState is "${media.lifecycleState}" (expected "published")`);
        if (media.source !== 'local') console.log(`    - source is "${media.source}" (expected "local")`);
        if (!media.contentHash) console.log(`    - contentHash is missing`);
        if (!media.storage) console.log(`    - storage is missing`);
      }
    } else {
      console.log(`  KV record is null`);
      
      // Check if ID exists in static file
      const staticRecord = data.media.find(m => m.id === mediaId);
      if (staticRecord) {
        console.log(`  EXISTS in static file media.v1.json`);
        console.log(`  static lifecycleState: ${staticRecord.lifecycleState || 'missing'}`);
        console.log(`  static source: ${staticRecord.source || 'missing'}`);
        console.log(`  static contentHash: ${staticRecord.contentHash || 'missing'}`);
        console.log(`  static storage: ${staticRecord.storage || 'missing'}`);
      } else {
        console.log(`  DOES NOT EXIST in static file media.v1.json`);
      }
    }
    
    console.log('');
  }

  // Count total KV media records
  console.log('[DIAGNOSE] Counting total KV media records...');
  const namespace = getKvNamespace();
  let cursor = '0';
  let totalCount = 0;
  
  do {
    const result = await redis.scan(cursor, { match: `${namespace}media:*`, count: 100 });
    cursor = result[0];
    totalCount += result[1].length;
  } while (cursor !== '0');
  
  console.log(`[DIAGNOSE] Total KV media records: ${totalCount}`);
  console.log(`[DIAGNOSE] Static file media records: ${data.media.length}`);
  console.log('[DIAGNOSE] Diagnosis complete');
}

diagnoseMediaResolution()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('[DIAGNOSE] Fatal error:', error);
    process.exit(1);
  });
