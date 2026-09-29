/**
 * Check Blob Metadata by Media ID
 * 
 * Checks if blob metadata exists for a media record by:
 * 1. Getting the media record to find its content hash
 * 2. Looking up blob metadata using the content hash (correct key format)
 */

import { Redis } from '@upstash/redis';

const KV_URL = process.env.KV_REST_API_URL || 'https://needed-mastodon-82399.upstash.io';
const KV_TOKEN = process.env.KV_REST_API_TOKEN || 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const KV_NAMESPACE = 'hpp:production:';
const MEDIA_PREFIX = 'media:';
const BLOB_METADATA_PREFIX = 'blob_metadata:';

function getMediaKey(mediaId) {
  return `${KV_NAMESPACE}${MEDIA_PREFIX}${mediaId}`;
}

function getBlobMetadataKey(contentHash) {
  return `${KV_NAMESPACE}${BLOB_METADATA_PREFIX}${contentHash}`;
}

async function main() {
  console.log('[CHECK BLOB METADATA BY MEDIA ID] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const targetMediaId = '07c0eae184dc5a375f943a3ac2b67e95';

  console.log('[CHECK] Target media ID:', targetMediaId);

  // Step 1: Get the media record to find its content hash
  const mediaKey = getMediaKey(targetMediaId);
  const mediaRecord = await redis.get(mediaKey);

  if (!mediaRecord) {
    console.error('[CHECK] FAIL: Media record not found');
    process.exit(1);
  }

  console.log('[CHECK] Media record found:', {
    mediaId: targetMediaId,
    storage: mediaRecord.storage,
    contentHash: mediaRecord.contentHash,
  });

  // Step 2: Check blob metadata using the content hash
  if (!mediaRecord.contentHash) {
    console.error('[CHECK] FAIL: Media record has no content hash');
    process.exit(1);
  }

  const blobMetadataKey = getBlobMetadataKey(mediaRecord.contentHash);
  const blobMetadata = await redis.get(blobMetadataKey);

  if (!blobMetadata) {
    console.error('[CHECK] FAIL: Blob metadata not found for content hash');
    console.log('[CHECK] Content hash:', mediaRecord.contentHash);
    console.log('[CHECK] Blob metadata key:', blobMetadataKey);
    console.log('[CHECK] This is the authority disconnect: media says storage=blob but blob_metadata does not exist');
    process.exit(1);
  }

  console.log('[CHECK] Blob metadata found:', {
    contentHash: mediaRecord.contentHash,
    blobMetadata: blobMetadata,
  });

  console.log('[CHECK BLOB METADATA BY MEDIA ID] COMPLETE');
}

main();
