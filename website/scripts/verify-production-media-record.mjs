/**
 * Verify Production Media Record Storage Field
 * 
 * Checks if the malformed media record still has the storage field issue in production.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const MEDIA_AUTHORITY_PREFIX = 'media:';

const MEDIA_ID = '07c0eae184dc5a375f943a3ac2b67e95';

function getMediaAuthorityKey(mediaId) {
  return `${KV_NAMESPACE}${MEDIA_AUTHORITY_PREFIX}${mediaId}`;
}

async function main() {
  console.log('[VERIFY PRODUCTION MEDIA RECORD] START', {
    mediaId: MEDIA_ID,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  const key = getMediaAuthorityKey(MEDIA_ID);
  const record = await redis.get(key);

  if (!record) {
    console.log('[VERIFY] Record not found in production');
    return;
  }

  console.log('[VERIFY] Production record:', {
    mediaId: MEDIA_ID,
    source: record.source,
    lifecycleState: record.lifecycleState,
    storage: record.storage,
    hasStorage: 'storage' in record,
    storageType: typeof record.storage,
    hasContentHash: !!record.contentHash,
    hasVariants: !!record.variants,
  });

  if (!record.storage) {
    console.log('[VERIFY] STORAGE FIELD MISSING - Still blocking production');
    console.log('[VERIFY] REPAIR NEEDED - This record needs to be fixed in production');
  } else if (record.storage !== 'static' && record.storage !== 'blob') {
    console.log('[VERIFY] STORAGE FIELD INVALID - Must be "static" or "blob"');
    console.log('[VERIFY] Current value:', record.storage);
  } else {
    console.log('[VERIFY] STORAGE FIELD VALID', record.storage);
  }

  console.log('[VERIFY PRODUCTION MEDIA RECORD] COMPLETE');
}

main();
