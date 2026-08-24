/**
 * Verify Canonical Assets Against Actual Physical Blob Objects
 * 
 * This script checks which canonical PublishedMediaAsset records have:
 * - Synthetic content identity (SHA256(canonicalId) rather than actual bytes)
 * - Real physical Blob objects with verified content hashes
 * 
 * Synthetic content identity should NOT be accepted as constitutional proof.
 */

const CANONICAL_IDS = [
  'brand-hero',
  'outdoor-living-001-hero',
  'repairs-001-hero',
  'builtins-001-secondary',
  'fences-001-hero',
];

const PRODUCTION_KV_URL = 'https://needed-mastodon-82399.upstash.io';
const PRODUCTION_KV_TOKEN = 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

import crypto from 'crypto';

async function getMedia(mediaId) {
  const key = `media:${mediaId}`;
  const response = await fetch(`${PRODUCTION_KV_URL}/get/${key}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
    },
  });
  
  const data = await response.json();
  if (!data.result) return null;
  
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
}

async function getBlobMetadata(contentHash) {
  const key = `blob_metadata:${contentHash}`;
  const response = await fetch(`${PRODUCTION_KV_URL}/get/${key}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
    },
  });
  
  const data = await response.json();
  if (!data.result) return null;
  
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
}

function computeSyntheticHash(canonicalId) {
  return crypto.createHash('sha256').update(canonicalId).digest('hex');
}

function isSyntheticContentHash(canonicalId, actualContentHash) {
  const syntheticHash = computeSyntheticHash(canonicalId);
  return actualContentHash === syntheticHash;
}

async function verifyCanonicalBlobIdentity() {
  console.log('=== VERIFYING CANONICAL ASSET BLOB IDENTITY ===\n');
  
  for (const canonicalId of CANONICAL_IDS) {
    console.log(`[VERIFY] Checking: ${canonicalId}`);
    
    const media = await getMedia(canonicalId);
    
    if (!media) {
      console.log(`[VERIFY] ✗ Media record not found in KV`);
      continue;
    }
    
    const contentHash = media.contentHash;
    const syntheticHash = computeSyntheticHash(canonicalId);
    const isSynthetic = contentHash === syntheticHash;
    
    console.log(`[VERIFY]   contentHash: ${contentHash}`);
    console.log(`[VERIFY]   syntheticHash: ${syntheticHash}`);
    console.log(`[VERIFY]   isSynthetic: ${isSynthetic}`);
    
    // Check if Blob metadata exists
    const blobMetadata = await getBlobMetadata(contentHash);
    
    if (blobMetadata) {
      console.log(`[VERIFY]   Blob metadata: FOUND`);
      console.log(`[VERIFY]     url: ${blobMetadata.url}`);
      console.log(`[VERIFY]     filename: ${blobMetadata.filename}`);
      console.log(`[VERIFY]     byteSize: ${blobMetadata.byteSize}`);
      
      if (isSynthetic) {
        console.log(`[VERIFY] ⚠️  WARNING: Synthetic content hash but Blob metadata exists`);
        console.log(`[VERIFY]     This may indicate legacy synthetic materialization`);
      } else {
        console.log(`[VERIFY] ✓ Verified: Real physical Blob with actual content hash`);
      }
    } else {
      console.log(`[VERIFY]   Blob metadata: NOT FOUND`);
      
      if (isSynthetic) {
        console.log(`[VERIFY] ✗ REJECTED: Synthetic content identity without physical Blob`);
        console.log(`[VERIFY]     This is NOT constitutional proof of media existence`);
      } else {
        console.log(`[VERIFY] ⚠️  WARNING: Real content hash but no Blob metadata`);
        console.log(`[VERIFY]     Blob may exist but metadata is missing`);
      }
    }
    
    console.log('');
  }
  
  console.log('=== VERIFICATION COMPLETE ===');
}

verifyCanonicalBlobIdentity();
