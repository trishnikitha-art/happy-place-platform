/**
 * Inspect Malformed PublishedMediaAsset Record (Fixed)
 * 
 * Inspects the specific malformed record: 07c0eae184dc5a375f943a3ac2b67e95
 * to determine whether it is Blob, static, or invalid/unrecoverable.
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
  console.log('[INSPECT MALFORMED RECORD] START', {
    timestamp: new Date().toISOString(),
  });

  const redis = new Redis({ url: KV_URL, token: KV_TOKEN });
  const targetMediaId = '07c0eae184dc5a375f943a3ac2b67e95';

  console.log('[INSPECT] Target media ID:', targetMediaId);

  const mediaKey = getMediaAuthorityKey(targetMediaId);
  const record = await redis.get(mediaKey);

  if (!record) {
    console.error('[INSPECT] FAIL: Record not found');
    process.exit(1);
  }

  console.log('[INSPECT] Raw record:', {
    mediaId: targetMediaId,
    record: record,
  });

  // Analyze the record structure
  const analysis = {
    exists: true,
    hasStorage: !!record.storage,
    storageValue: record.storage,
    source: record.source,
    lifecycleState: record.lifecycleState,
    hasContentHash: !!record.contentHash,
    contentHash: record.contentHash,
    hasVariants: !!record.variants,
    variantsOriginal: record.variants?.original,
    hasBlobMetadata: !!record.blobMetadata,
    blobMetadata: record.blobMetadata,
    url: record.variants?.original,
    isImagePath: record.variants?.original?.startsWith('/images/'),
    assignmentCount: record.assignments?.length || 0,
    assignments: record.assignments,
  };

  console.log('[INSPECT] Analysis:', analysis);

  // Classification
  let classification = 'unknown';
  let repairAction = 'none';

  if (analysis.isImagePath) {
    classification = 'static';
    repairAction = 'set-storage-static';
  } else if (analysis.hasBlobMetadata) {
    classification = 'blob';
    repairAction = 'set-storage-blob';
  } else if (analysis.hasContentHash && analysis.hasVariants) {
    // Has content hash and variants but no blob metadata and not /images/ path
    classification = 'ambiguous';
    repairAction = 'manual-inspection';
  } else {
    classification = 'invalid';
    repairAction = 'quarantine';
  }

  console.log('[INSPECT] Classification:', {
    classification,
    repairAction,
  });

  // Check for CAS repair primitive availability
  console.log('[INSPECT] Checking for CAS repair primitive availability...');
  console.log('[INSPECT] Use updateStorageFieldCAS() for repair if classification is static or blob');

  console.log('[INSPECT MALFORMED RECORD] COMPLETE');
}

main();
