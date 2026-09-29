/**
 * Check Blob Metadata for Malformed Record
 * 
 * Checks if blob metadata exists for the content hash of the malformed record.
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const BLOB_METADATA_PREFIX = 'blob_metadata:';

function getBlobMetadataKey(contentHash) {
  return `${KV_NAMESPACE}${BLOB_METADATA_PREFIX}${contentHash}`;
}

async function main() {
  console.log('[CHECK BLOB METADATA] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const targetContentHash = '07c0eae184dc5a375f943a3ac2b67e95cd202206090a3d90e1f5599ce6b1bcc6';

  console.log('[CHECK] Target content hash:', targetContentHash);

  const blobMetadataKey = getBlobMetadataKey(targetContentHash);
  const blobMetadata = await redis.get(blobMetadataKey);

  if (!blobMetadata) {
    console.error('[CHECK] FAIL: Blob metadata not found for content hash');
    console.log('[CHECK] This means the Blob metadata key is missing from Redis');
    process.exit(1);
  }

  console.log('[CHECK] Blob metadata found:', {
    contentHash: targetContentHash,
    blobMetadata: blobMetadata,
  });

  console.log('[CHECK BLOB METADATA] COMPLETE');
}

main();
