/**
 * Verify Public Resolution
 * 
 * This script verifies that repaired assignments resolve publicly through the public media gate.
 * It checks that the canonical media IDs are valid PublishedMediaAssets that pass the public gate.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const REPAIRED_ASSIGNMENTS = [
  { serviceSlug: 'brand-hero', mediaId: 'brand-hero' },
  { serviceSlug: 'painting', mediaId: 'outdoor-living-001-hero' },
  { serviceSlug: 'repairs', mediaId: 'repairs-001-hero' },
  { serviceSlug: 'restoration', mediaId: 'builtins-001-secondary' },
  { serviceSlug: 'fences', mediaId: 'fences-001-hero' },
];

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
    console.error('[VERIFY] Failed to load .env.local:', error);
    return {};
  }
}

async function verifyPublicMedia(mediaId, env) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = env;
  
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return {
      mediaId,
      status: 'ERROR',
      reason: 'KV credentials not available',
    };
  }
  
  try {
    const key = `media:${mediaId}`;
    const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      return {
        mediaId,
        status: 'NOT_FOUND',
        reason: `KV request failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    if (!data.result) {
      return {
        mediaId,
        status: 'NOT_FOUND',
        reason: 'Media not found in KV',
      };
    }
    
    const media = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    // Verify PublishedMediaAsset contract
    if (!media.id || media.id !== mediaId) {
      return {
        mediaId,
        status: 'INVALID',
        reason: 'Media ID mismatch or missing',
      };
    }
    
    if (media.source !== 'local') {
      return {
        mediaId,
        status: 'INVALID',
        reason: `Source is ${media.source}, must be 'local'`,
      };
    }
    
    if (media.lifecycleState !== 'published') {
      return {
        mediaId,
        status: 'INVALID',
        reason: `Lifecycle state is ${media.lifecycleState}, must be 'published'`,
      };
    }
    
    if (!media.contentHash) {
      return {
        mediaId,
        status: 'INVALID',
        reason: 'Missing contentHash',
      };
    }
    
    // Check for Drive URLs in variants (should not exist)
    const checkForDriveUrl = (obj) => {
      if (!obj) return false;
      if (typeof obj === 'string' && obj.startsWith('/api/drive/')) {
        return true;
      }
      if (typeof obj === 'object') {
        return Object.values(obj).some((val) => checkForDriveUrl(val));
      }
      return false;
    };
    
    if (checkForDriveUrl(media.variants)) {
      return {
        mediaId,
        status: 'INVALID',
        reason: 'Contains /api/drive/* URLs in variants',
      };
    }
    
    if (media.drive) {
      return {
        mediaId,
        status: 'INVALID',
        reason: 'Contains drive field',
      };
    }
    
    return {
      mediaId,
      status: 'APPROVED',
      media: {
        id: media.id,
        source: media.source,
        lifecycleState: media.lifecycleState,
        hasContentHash: !!media.contentHash,
        hasWebVariant: !!media.variants?.web,
        hasDrive: !!media.drive,
        provenance: media.provenance,
      },
    };
  } catch (error) {
    return {
      mediaId,
      status: 'ERROR',
      reason: `Verification failed: ${error.message}`,
    };
  }
}

async function verifyPublicResolution() {
  console.log('=== VERIFYING PUBLIC RESOLUTION ===\n');
  
  const env = loadEnv();
  console.log('[VERIFY] KV credentials:', {
    hasUrl: !!env.KV_REST_API_URL,
    hasToken: !!env.KV_REST_API_TOKEN,
  });
  
  const results = [];
  
  for (const assignment of REPAIRED_ASSIGNMENTS) {
    console.log(`[VERIFY] Verifying service: ${assignment.serviceSlug}`);
    console.log(`[VERIFY] Media ID: ${assignment.mediaId}`);
    
    const result = await verifyPublicMedia(assignment.mediaId, env);
    results.push({
      serviceSlug: assignment.serviceSlug,
      ...result,
    });
    
    if (result.status === 'APPROVED') {
      console.log(`[VERIFY] ✓ Approved as PublishedMediaAsset`);
    } else if (result.status === 'NOT_FOUND') {
      console.log(`[VERIFY] ✗ Not found: ${result.reason}`);
    } else if (result.status === 'INVALID') {
      console.log(`[VERIFY] ✗ Invalid: ${result.reason}`);
    } else {
      console.log(`[VERIFY] ✗ Error: ${result.reason}`);
    }
  }
  
  console.log('\n=== VERIFICATION COMPLETE ===');
  console.log(`[VERIFY] Total assignments: ${results.length}`);
  console.log(`[VERIFY] Approved: ${results.filter(r => r.status === 'APPROVED').length}`);
  console.log(`[VERIFY] Not found: ${results.filter(r => r.status === 'NOT_FOUND').length}`);
  console.log(`[VERIFY] Invalid: ${results.filter(r => r.status === 'INVALID').length}`);
  console.log(`[VERIFY] Errors: ${results.filter(r => r.status === 'ERROR').length}`);
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  verifyPublicResolution()
    .then(results => {
      console.log('\n=== VERIFICATION RESULTS ===');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Verification failed:', error);
      process.exit(1);
    });
}

export { verifyPublicResolution, REPAIRED_ASSIGNMENTS };
