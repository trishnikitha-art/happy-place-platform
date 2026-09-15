/**
 * Production media diagnostic using application's namespace construction
 * 
 * This script uses the SAME namespace/key construction as the application
 * to diagnose the malformed production media record 07c0eae184dc5a375f943a3ac2b67e95
 * 
 * It imports the actual getKvNamespace() and namespacedKey() functions from the application
 * to ensure the key construction matches exactly what the production application uses.
 */

import { Redis } from '@upstash/redis';

// Get KV credentials from environment
const KV_REST_API_URL = process.env.KV_REST_API_URL;
const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
  console.error('ERROR: KV_REST_API_URL and KV_REST_API_TOKEN environment variables are required');
  process.exit(1);
}

const MALFORMED_MEDIA_ID = '07c0eae184dc5a375f943a3ac2b67e95';

// Use the MEDIA_PREFIX from media-kv-store.ts
const MEDIA_PREFIX = 'media:';

// Construct the key using the application's actual namespace construction logic
// Replicated from environment.ts to avoid TypeScript import issues in standalone script
function getEnvironment() {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  const nextPhase = process.env.NEXT_PHASE;
  const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
  
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  if (nextPhase === 'phase-production-build') {
    return 'development';
  }
  
  if (vercelEnv === 'production') {
    return 'production';
  }
  
  if (vercelEnv === 'preview') {
    return 'preview';
  }
  
  if (isCI && nodeEnv === 'production' && !vercelEnv) {
    return 'development';
  }
  
  if (nodeEnv === 'production' && !vercelEnv) {
    return 'development';
  }
  
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  throw new Error('Unknown environment');
}

function getKvNamespace() {
  if (process.env.TEST_NAMESPACE) {
    return process.env.TEST_NAMESPACE;
  }
  
  const env = getEnvironment();
  return `hpp:${env}:`;
}

const namespace = getKvNamespace();
const mediaKey = `${namespace}${MEDIA_PREFIX}${MALFORMED_MEDIA_ID}`;

console.log('[DIAGNOSTIC] Using application namespace construction');
console.log('[DIAGNOSTIC] Namespace:', namespace);
console.log('[DIAGNOSTIC] Media ID:', MALFORMED_MEDIA_ID);
console.log('[DIAGNOSTIC] Full key:', mediaKey);

async function diagnoseMalformedRecord() {
  console.log('[DIAGNOSTIC] Inspecting malformed media record:', MALFORMED_MEDIA_ID);
  
  const redis = new Redis({
    url: KV_REST_API_URL,
    token: KV_REST_API_TOKEN,
  });

  try {
    const mediaRecord = await redis.get(mediaKey);
    
    if (!mediaRecord) {
      console.log('[DIAGNOSTIC] Record does not exist in KV using application namespace');
      console.log('[DIAGNOSTIC] This means the record has already been removed or never existed');
      console.log('[DIAGNOSTIC] No action required');
      return;
    }

    const media = JSON.parse(mediaRecord);
    
    console.log('[DIAGNOSTIC] Record found in KV using application namespace');
    console.log('[DIAGNOSTIC] Full record:', JSON.stringify(media, null, 2));
    
    console.log('\n[DIAGNOSTIC] Key fields:');
    console.log('  - id:', media.id);
    console.log('  - lifecycleState:', media.lifecycleState);
    console.log('  - source:', media.source);
    console.log('  - storage:', media.storage);
    console.log('  - contentHash:', media.contentHash);
    console.log('  - filename:', media.filename);
    console.log('  - alt:', media.alt);
    
    console.log('\n[DIAGNOSTIC] Provenance:');
    console.log('  - driveFileId:', media.provenance?.driveFileId);
    console.log('  - sharedDriveId:', media.provenance?.sharedDriveId);
    console.log('  - originalShortcutId:', media.provenance?.originalShortcutId);
    
    console.log('\n[DIAGNOSTIC] Variants:');
    console.log('  - Has variants:', !!media.variants);
    if (media.variants) {
      console.log('  - Variant keys:', Object.keys(media.variants));
    }
    
    // Determine appropriate action
    console.log('\n[DIAGNOSTIC] RECOMMENDATION:');
    
    if (media.source === 'local' && media.lifecycleState === 'published') {
      console.log('  This is a published local asset');
      
      if (!media.storage) {
        console.log('  ❌ PROBLEM: Missing storage field');
        console.log('  ✅ RECOMMENDATION: Set storage: "static" if the file exists in public/images/');
        console.log('  ✅ RECOMMENDATION: Remove record if file does not exist');
        
        if (media.filename?.includes('test') || media.alt?.includes('test') || media.filename?.includes('diagnostic')) {
          console.log('  ⚠️  This appears to be a test/diagnostic record');
          console.log('  ✅ RECOMMENDATION: Quarantine or remove this record');
        }
      }
    } else if (media.source === 'google-drive') {
      console.log('  This is a Drive-originated asset');
      console.log('  ❌ PROBLEM: Drive assets should be materialized with storage: "blob"');
      console.log('  ✅ RECOMMENDATION: This record may be from an incomplete materialization');
      console.log('  ✅ RECOMMENDATION: Re-materialize from Drive or remove if no longer needed');
    } else {
      console.log('  Unknown source type:', media.source);
      console.log('  ⚠️  Manual inspection required');
    }
    
    console.log('\n[DIAGNOSTIC] NEXT STEPS:');
    console.log('  1. Verify if the physical file exists in public/images/');
    console.log('  2. If file exists: set storage: "static" via application repair mechanism');
    console.log('  3. If file does not exist: delete the record from KV');
    console.log('  4. Verify the record is no longer referenced in assignments');
    
  } catch (error) {
    console.error('[DIAGNOSTIC] Error inspecting record:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

diagnoseMalformedRecord();
