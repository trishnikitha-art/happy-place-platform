/**
 * Bootstrap KV for staging environment
 * 
 * This script populates KV with media records from media.v1.json
 * for the staging environment when KV is empty.
 */

import { loadMediaManifest } from '../src/lib/media';
import { Redis } from '@upstash/redis';

async function bootstrapKv() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    console.error('Missing KV credentials');
    process.exit(1);
  }
  
  const namespace = 'hpp:preview:';
  // Staging uses preview environment
  const redis = new Redis({ url, token });
  
  const manifest = loadMediaManifest();
  console.log(`Found ${manifest.media.length} media records`);
  
  let bootstrapped = 0;
  let skipped = 0;
  
  for (const media of manifest.media) {
    const key = `${namespace}media:${media.id}`;
    const existing = await redis.get(key);
    
    if (existing) {
      skipped++;
      continue;
    }
    
    await redis.set(key, JSON.stringify(media));
    bootstrapped++;
    console.log(`Bootstrapped: ${media.id}`);
  }
  
  console.log(`Bootstrap complete: ${bootstrapped} bootstrapped, ${skipped} skipped`);
}

bootstrapKv().catch(console.error);
