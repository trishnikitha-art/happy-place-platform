/**
 * Check Runtime Media Authority
 * 
 * This script verifies whether canonical media IDs from static authorities
 * (media.v1.json, brand.v1.json) have corresponding runtime PublishedMediaAsset
 * records in the KV store.
 * 
 * This is critical because:
 * - Static authority (JSON files) is not the same as runtime authority (KV)
 * - The assignment API likely requires runtime KV-backed published records
 * - We need to know if assets must be materialized or already exist
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Canonical IDs from resolver evidence
const CANONICAL_IDS = [
  'brand-hero',
  'outdoor-living-001-hero',
  'repairs-001-hero',
  'builtins-001-secondary',
  'fences-001-hero',
];

/**
 * Load environment variables
 */
function loadEnv() {
  const envPath = join(__dirname, '../.env.local');
  try {
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    for (const line of envContent.split('\n')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim();
      }
    }
    return env;
  } catch (error) {
    console.error('[CHECK] Failed to load .env.local:', error);
    return {};
  }
}

/**
 * Check KV for a specific media ID
 */
async function checkMediaInKV(mediaId, env) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = env;
  
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return {
      mediaId,
      status: 'ERROR',
      reason: 'KV credentials not available',
    };
  }
  
  try {
    const response = await fetch(`${KV_REST_API_URL}/get/media:${mediaId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          mediaId,
          status: 'NOT_FOUND',
          reason: 'Media ID not found in KV',
        };
      }
      return {
        mediaId,
        status: 'ERROR',
        reason: `KV request failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    
    if (!data.result) {
      return {
        mediaId,
        status: 'NOT_FOUND',
        reason: 'No result data from KV',
      };
    }
    
    // Parse the media record
    let mediaRecord;
    try {
      // Upstash may return string or object
      mediaRecord = typeof data.result === 'string' 
        ? JSON.parse(data.result) 
        : data.result;
    } catch (error) {
      return {
        mediaId,
        status: 'ERROR',
        reason: `Failed to parse media record: ${error.message}`,
      };
    }
    
    // Verify it's a PublishedMediaAsset
    if (!mediaRecord.id || !mediaRecord.lifecycleState) {
      return {
        mediaId,
        status: 'INVALID',
        reason: 'Media record missing required fields (id, lifecycleState)',
        record: mediaRecord,
      };
    }
    
    // Check if it's published
    const isPublished = mediaRecord.lifecycleState === 'published';
    
    return {
      mediaId,
      status: 'FOUND',
      isPublished,
      record: {
        id: mediaRecord.id,
        lifecycleState: mediaRecord.lifecycleState,
        type: mediaRecord.type,
        hasBlobMetadata: !!mediaRecord.blobMetadata,
        hasDriveReference: !!mediaRecord.driveReference,
        provenance: mediaRecord.provenance || 'unknown',
        createdAt: mediaRecord.createdAt,
      },
    };
  } catch (error) {
    return {
      mediaId,
      status: 'ERROR',
      reason: `KV check failed: ${error.message}`,
    };
  }
}

/**
 * Check all canonical IDs in KV
 */
async function checkRuntimeAuthority() {
  console.log('=== CHECKING RUNTIME MEDIA AUTHORITY ===\n');
  
  const env = loadEnv();
  console.log('[CHECK] KV credentials:', {
    hasUrl: !!env.KV_REST_API_URL,
    hasToken: !!env.KV_REST_API_TOKEN,
  });
  
  const results = [];
  
  for (const mediaId of CANONICAL_IDS) {
    console.log(`\n[CHECK] Checking media ID: ${mediaId}`);
    const result = await checkMediaInKV(mediaId, env);
    results.push(result);
    
    if (result.status === 'FOUND') {
      console.log(`[CHECK] ✓ Found:`, {
        id: result.record.id,
        status: result.record.status,
        isPublished: result.isPublished,
        contentType: result.record.contentType,
        hasBlobMetadata: result.record.hasBlobMetadata,
        provenance: result.record.provenance,
      });
    } else {
      console.log(`[CHECK] ✗ ${result.status}: ${result.reason}`);
    }
  }
  
  console.log('\n=== RUNTIME AUTHORITY CHECK COMPLETE ===');
  console.log(`[CHECK] Total IDs checked: ${results.length}`);
  console.log(`[CHECK] Found in KV: ${results.filter(r => r.status === 'FOUND').length}`);
  console.log(`[CHECK] Published: ${results.filter(r => r.status === 'FOUND' && r.isPublished).length}`);
  console.log(`[CHECK] Not found: ${results.filter(r => r.status === 'NOT_FOUND').length}`);
  console.log(`[CHECK] Errors: ${results.filter(r => r.status === 'ERROR' || r.status === 'INVALID').length}`);
  
  return results;
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  checkRuntimeAuthority()
    .then(results => {
      console.log('\n=== RUNTIME AUTHORITY EVIDENCE ===');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('[CHECK] Fatal error:', error);
      process.exit(1);
    });
}

export { checkRuntimeAuthority, CANONICAL_IDS };
