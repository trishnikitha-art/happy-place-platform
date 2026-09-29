/**
 * List All Redis Keys
 * 
 * Lists all keys in the production Redis namespace to understand current state.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';

async function main() {
  console.log('[LIST ALL REDIS KEYS] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });

  // Get all keys with the production namespace
  const allKeys = await redis.keys(`${KV_NAMESPACE}*`);
  
  console.log('[LIST] Total keys found:', allKeys.length);

  // Categorize keys by prefix
  const categories = {};
  
  for (const key of allKeys) {
    const relativeKey = key.replace(KV_NAMESPACE, '');
    const parts = relativeKey.split(':');
    const category = parts[0];
    
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(relativeKey);
  }

  console.log('[LIST] Categories:', Object.keys(categories));
  
  for (const [category, keys] of Object.entries(categories)) {
    console.log(`[LIST] ${category}:`, keys.length, 'keys');
    if (keys.length <= 10) {
      console.log('[LIST]   Keys:', keys);
    } else {
      console.log('[LIST]   Sample keys:', keys.slice(0, 5), '...');
    }
    
    // Special case: show all deployment-transaction keys (49 total)
    if (category === 'deployment-transaction') {
      console.log('[LIST]   All deployment transactions:', keys);
    }
    
    // Special case: show all workbench-staging keys (38 total)
    if (category === 'workbench-staging') {
      console.log('[LIST]   All staging keys:', keys);
    }
  }

  console.log('[LIST ALL REDIS KEYS] COMPLETE');
}

main();
