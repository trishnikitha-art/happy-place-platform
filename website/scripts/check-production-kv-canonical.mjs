/**
 * Check Production KV for Canonical PublishedMediaAsset Records
 * 
 * This script checks if the production KV contains the canonical
 * PublishedMediaAsset records that should have been materialized.
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

async function checkMediaRecord(mediaId) {
  const key = `media:${mediaId}`;
  
  try {
    const response = await fetch(`${PRODUCTION_KV_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      return {
        mediaId,
        status: 'ERROR',
        reason: `KV get failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    if (!data.result) {
      return {
        mediaId,
        status: 'NOT_FOUND',
      };
    }
    
    const media = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    return {
      mediaId,
      status: 'FOUND',
      lifecycleState: media.lifecycleState,
      source: media.source,
      hasContentHash: !!media.contentHash,
      hasVariants: !!media.variants,
    };
  } catch (error) {
    return {
      mediaId,
      status: 'ERROR',
      reason: `KV check failed: ${error.message}`,
    };
  }
}

async function checkProductionCanonicalRecords() {
  console.log('=== CHECKING PRODUCTION KV FOR CANONICAL RECORDS ===\n');
  console.log(`[CHECK] Target KV: ${PRODUCTION_KV_URL}`);
  console.log(`[CHECK] Checking ${CANONICAL_IDS.length} canonical IDs\n`);
  
  const results = [];
  
  for (const mediaId of CANONICAL_IDS) {
    console.log(`[CHECK] Checking: ${mediaId}`);
    const result = await checkMediaRecord(mediaId);
    results.push(result);
    
    if (result.status === 'FOUND') {
      console.log(`[CHECK] ✓ Found: ${mediaId}`);
      console.log(`[CHECK]   lifecycleState: ${result.lifecycleState}`);
      console.log(`[CHECK]   source: ${result.source}`);
      console.log(`[CHECK]   hasContentHash: ${result.hasContentHash}`);
      console.log(`[CHECK]   hasVariants: ${result.hasVariants}`);
    } else if (result.status === 'NOT_FOUND') {
      console.log(`[CHECK] ✗ Not found: ${mediaId}`);
    } else {
      console.log(`[CHECK] ✗ Error: ${result.reason}`);
    }
    console.log('');
  }
  
  console.log('=== CHECK COMPLETE ===');
  console.log(`[CHECK] Total: ${results.length}`);
  console.log(`[CHECK] Found: ${results.filter(r => r.status === 'FOUND').length}`);
  console.log(`[CHECK] Not found: ${results.filter(r => r.status === 'NOT_FOUND').length}`);
  console.log(`[CHECK] Errors: ${results.filter(r => r.status === 'ERROR').length}`);
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkProductionCanonicalRecords()
    .then(results => {
      console.log('\n=== CHECK RESULTS ===');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Check failed:', error);
      process.exit(1);
    });
}

export { checkProductionCanonicalRecords };
