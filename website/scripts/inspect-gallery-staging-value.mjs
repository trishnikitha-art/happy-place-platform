/**
 * Inspect Gallery Staging Value
 * 
 * Checks the actual content of the preserved gallery staging record
 * to understand what payload will be decoded when the transaction is retried.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';

const TRANSACTION_ID = 'WBDEP-1790371363022-8apujfxtd';
const GALLERY_KEY = 'hpp:production:workbench-staging:WBDEP-1790371363022-8apujfxtd:project:repairs-001:gallery';

async function main() {
  console.log('[INSPECT GALLERY STAGING VALUE] START', {
    transactionId: TRANSACTION_ID,
    galleryKey: GALLERY_KEY,
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  const stagingValue = await redis.get(GALLERY_KEY);

  if (!stagingValue) {
    console.log('[INSPECT] Staging value not found');
    return;
  }

  console.log('[INSPECT] Staging value found:', {
    valueType: typeof stagingValue,
    valueLength: JSON.stringify(stagingValue).length,
  });

  if (typeof stagingValue === 'string') {
    try {
      const parsed = JSON.parse(stagingValue);
      console.log('[INSPECT] Parsed staging value:', parsed);
    } catch (e) {
      console.error('[INSPECT] Failed to parse JSON:', e);
      console.log('[INSPECT] Raw string value:', stagingValue);
    }
  } else if (typeof stagingValue === 'object') {
    console.log('[INSPECT] Object staging value:', stagingValue);
  }

  console.log('[INSPECT GALLERY STAGING VALUE] COMPLETE');
}

main();
