/**
 * Quick KV state check
 * Verifies which media records exist in KV and have Blob metadata
 */

import { Redis } from '@upstash/redis';

const url = process.env.KV_REST_API_URL || process.env.KV_REST_API__KV_REST_API_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.KV_REST_API__KV_REST_API_TOKEN;

if (!url || !token) {
  console.error('KV credentials not configured');
  process.exit(1);
}

const redis = new Redis({ url, token });

async function checkKVState() {
  console.log('Checking KV media state...\n');

  // Get all media keys
  const mediaKeys = await redis.keys('hpp:production:media:*');
  console.log(`Found ${mediaKeys.length} media keys in KV\n`);

  // Check each record
  let withBlobMetadata = 0;
  let withoutBlobMetadata = 0;
  let sampleRecords = [];

  for (const key of mediaKeys.slice(0, 10)) {
    const record = await redis.get(key);
    if (record) {
      const media = JSON.parse(record);
      const contentHash = media.contentHash;
      
      if (contentHash) {
        const blobKey = `hpp:production:blob_metadata:${contentHash}`;
        const blobMetadata = await redis.get(blobKey);
        
        if (blobMetadata) {
          withBlobMetadata++;
        } else {
          withoutBlobMetadata++;
        }
        
        sampleRecords.push({
          id: media.id,
          contentHash: contentHash.substring(0, 16) + '...',
          hasBlobMetadata: !!blobMetadata,
          source: media.source,
          lifecycleState: media.lifecycleState
        });
      }
    }
  }

  console.log('Sample records (first 10):');
  console.table(sampleRecords);
  
  console.log(`\nSummary: ${withBlobMetadata} with Blob metadata, ${withoutBlobMetadata} without`);
}

checkKVState().catch(console.error);
