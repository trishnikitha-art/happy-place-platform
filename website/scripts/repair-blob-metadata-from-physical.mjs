/**
 * Repair Blob Metadata from Physical Blob
 * 
 * Reconstructs blob_metadata from physical Blob evidence.
 * This fixes the authority disconnect where media record says storage=blob
 * but blob_metadata is missing, even though the physical Blob exists.
 */

import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

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

async function calculateSHA256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

async function main() {
  console.log('[REPAIR BLOB METADATA FROM PHYSICAL] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const targetMediaId = '07c0eae184dc5a375f943a3ac2b67e95';

  console.log('[REPAIR] Target media ID:', targetMediaId);

  // Step 1: Get the media record
  const mediaKey = getMediaKey(targetMediaId);
  const mediaRecord = await redis.get(mediaKey);

  if (!mediaRecord) {
    console.error('[REPAIR] FAIL: Media record not found');
    process.exit(1);
  }

  console.log('[REPAIR] Media record found:', {
    mediaId: targetMediaId,
    storage: mediaRecord.storage,
    contentHash: mediaRecord.contentHash,
  });

  if (mediaRecord.storage !== 'blob') {
    console.error('[REPAIR] FAIL: Media record is not storage=blob');
    process.exit(1);
  }

  if (!mediaRecord.contentHash) {
    console.error('[REPAIR] FAIL: Media record has no content hash');
    process.exit(1);
  }

  // Step 2: Fetch the physical Blob to verify it exists
  const blobUrl = 'https://8zci9xnviilmi6qj.public.blob.vercel-storage.com/07c0eae184dc5a375f943a3ac2b67e95-original-07c0eae184dc.jpg';
  console.log('[REPAIR] Fetching physical Blob:', blobUrl);

  let blobBuffer;
  try {
    const response = await fetch(blobUrl);
    if (!response.ok) {
      console.error('[REPAIR] FAIL: Physical Blob fetch failed:', response.status);
      process.exit(1);
    }
    blobBuffer = Buffer.from(await response.arrayBuffer());
    console.log('[REPAIR] Physical Blob fetched:', { size: blobBuffer.length });
  } catch (error) {
    console.error('[REPAIR] FAIL: Physical Blob fetch error:', error.message);
    process.exit(1);
  }

  // Step 3: Calculate actual SHA-256 of the physical Blob
  const actualSHA256 = await calculateSHA256(blobBuffer);
  console.log('[REPAIR] Calculated SHA-256:', actualSHA256);
  console.log('[REPAIR] Recorded content hash:', mediaRecord.contentHash);

  // Step 4: Verify the calculated hash matches the recorded content hash
  if (actualSHA256 !== mediaRecord.contentHash) {
    console.error('[REPAIR] FAIL: SHA-256 mismatch - physical Blob does not match recorded content hash');
    console.error('[REPAIR] This indicates corruption or incorrect record');
    process.exit(1);
  }

  console.log('[REPAIR] SHA-256 verification PASSED');

  // Step 5: Reconstruct blob_metadata record with physical proof
  const blobMetadataKey = getBlobMetadataKey(mediaRecord.contentHash);
  const existingMetadata = await redis.get(blobMetadataKey);

  if (existingMetadata) {
    console.log('[REPAIR] Blob metadata already exists - no repair needed');
    process.exit(0);
  }

  const blobMetadata = {
    contentHash: mediaRecord.contentHash,
    contentType: 'image/jpeg',
    size: blobBuffer.length,
    uploadedAt: new Date().toISOString(),
    physicalProof: {
      verified: true,
      url: blobUrl,
      sha256Verified: true,
      verificationTimestamp: new Date().toISOString(),
    },
  };

  console.log('[REPAIR] Writing blob metadata:', {
    key: blobMetadataKey,
    metadata: blobMetadata,
  });

  await redis.set(blobMetadataKey, blobMetadata);

  console.log('[REPAIR] SUCCESS: Blob metadata reconstructed from physical Blob evidence');
  console.log('[REPAIR] The media record storage=blob now has proven physical Blob metadata');

  console.log('[REPAIR BLOB METADATA FROM PHYSICAL] COMPLETE');
}

main();
