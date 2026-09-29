/**
 * Audit All Media Storage Contract
 * 
 * Scans all published media records to find any with missing/invalid storage field.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const MEDIA_AUTHORITY_PREFIX = 'media:';

function getMediaAuthorityKey(mediaId) {
  return `${KV_NAMESPACE}${MEDIA_AUTHORITY_PREFIX}${mediaId}`;
}

async function main() {
  console.log('[AUDIT ALL MEDIA STORAGE CONTRACT] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  // Get all media keys
  const allKeys = await redis.keys(`${KV_NAMESPACE}${MEDIA_AUTHORITY_PREFIX}*`);
  
  console.log('[AUDIT] Found media keys:', allKeys.length);

  const violations = [];
  const validRecords = [];
  const total = allKeys.length;

  for (const key of allKeys) {
    const mediaId = key.replace(`${KV_NAMESPACE}${MEDIA_AUTHORITY_PREFIX}`, '');
    const record = await redis.get(key);

    if (!record) {
      continue;
    }

    // Check for storage contract violations
    const isPublishedLocal = record.lifecycleState === 'published' && record.source === 'local';
    
    if (isPublishedLocal) {
      const hasStorage = record.storage && (record.storage === 'static' || record.storage === 'blob');
      
      if (!hasStorage) {
        violations.push({
          mediaId,
          lifecycleState: record.lifecycleState,
          source: record.source,
          storage: record.storage,
          hasContentHash: !!record.contentHash,
          hasVariants: !!record.variants,
          url: record.variants?.original,
        });
      } else {
        validRecords.push({
          mediaId,
          storage: record.storage,
        });
      }
    }
  }

  console.log('[AUDIT] Results:', {
    totalMediaRecords: total,
    publishedLocalRecords: violations.length + validRecords.length,
    violations: violations.length,
    validRecords: validRecords.length,
  });

  if (violations.length > 0) {
    console.log('[AUDIT] Violations found:', violations);
  } else {
    console.log('[AUDIT] No storage contract violations found');
  }

  console.log('[AUDIT ALL MEDIA STORAGE CONTRACT] COMPLETE');
}

main();
