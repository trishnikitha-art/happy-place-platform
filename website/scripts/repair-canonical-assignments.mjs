/**
 * Repair Canonical Assignments
 * 
 * This script repairs poisoned legacy assignments using the verified canonical mappings
 * from the resolver. It uses API endpoints and KV REST API instead of direct imports.
 * 
 * Process:
 * 1. Load resolver evidence with verified canonical mappings
 * 2. For each verified mapping:
 *    - Read current assignment from KV
 *    - Verify it matches the poisoned ID
 *    - Replace with canonical ID
 *    - Preserve old assignment as forensic evidence
 * 3. Verify assignments resolve publicly
 * 
 * This is safe because:
 * - Canonical IDs are independently verified against static authorities
 * - Canonical IDs are now materialized as PublishedMediaAsset in KV
 * - The assignment write gate validates PublishedMediaAsset before accepting
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Verified canonical mappings from resolver evidence
const VERIFIED_MAPPINGS = [
  {
    serviceSlug: 'brand-hero',
    poisonedId: 'drive-fe2e5a57446436f9',
    canonicalId: 'brand-hero',
    authority: 'brand.v1.json',
  },
  {
    serviceSlug: 'painting',
    poisonedId: 'drive-ref-95bbb9bf71c294a1',
    canonicalId: 'outdoor-living-001-hero',
    authority: 'media.v1.json',
  },
  {
    serviceSlug: 'repairs',
    poisonedId: 'drive-4328210fbe49d835',
    canonicalId: 'repairs-001-hero',
    authority: 'media.v1.json',
  },
  {
    serviceSlug: 'restoration',
    poisonedId: 'drive-aa8ac3af6e3afceb',
    canonicalId: 'builtins-001-secondary',
    authority: 'media.v1.json',
  },
  {
    serviceSlug: 'fences',
    poisonedId: 'drive-e0a149dd438141ad',
    canonicalId: 'fences-001-hero',
    authority: 'media.v1.json',
  },
];

const ASSIGNMENT_PREFIX = 'service-card-assignment:';
const ASSIGNMENT_QUARANTINE_PREFIX = 'canonical-repair-quarantine:';

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
    console.error('[REPAIR] Failed to load .env.local:', error);
    return {};
  }
}

/**
 * Get KV client helper
 */
function getKVCredentials(env) {
  const url = env.KV_REST_API_URL;
  const token = env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    throw new Error('KV credentials not available');
  }
  
  return { url, token };
}

/**
 * Read assignment from KV
 */
async function getAssignment(serviceSlug, env) {
  const { url, token } = getKVCredentials(env);
  const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
  
  try {
    const response = await fetch(`${url}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`KV request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data.result) {
      return null;
    }
    
    // Parse assignment (may be string or object)
    const assignment = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    return assignment;
  } catch (error) {
    console.error('[REPAIR] Failed to read assignment:', error);
    throw error;
  }
}

/**
 * Store assignment to KV
 */
async function setAssignment(serviceSlug, assignment, env) {
  const { url, token } = getKVCredentials(env);
  const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
  
  try {
    const response = await fetch(`${url}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(assignment),
    });
    
    if (!response.ok) {
      throw new Error(`KV request failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[REPAIR] Failed to store assignment:', error);
    throw error;
  }
}

/**
 * Quarantine old assignment for forensic evidence
 */
async function quarantineAssignment(serviceSlug, oldAssignment, reason, env) {
  try {
    const { url, token } = getKVCredentials(env);
    const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${serviceSlug}:${Date.now()}`;
    
    const quarantineRecord = {
      serviceSlug,
      oldAssignment,
      reason,
      quarantinedAt: new Date().toISOString(),
    };
    
    const response = await fetch(`${url}/set/${quarantineKey}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(quarantineRecord),
    });
    
    if (!response.ok) {
      throw new Error(`Quarantine failed: ${response.status}`);
    }
    
    console.log('[REPAIR] Quarantined assignment:', serviceSlug, reason);
  } catch (error) {
    console.error('[REPAIR] Failed to quarantine assignment:', error);
  }
}

/**
 * Verify canonical ID is PublishedMediaAsset in KV
 */
async function verifyCanonicalMedia(canonicalId, env) {
  const { url, token } = getKVCredentials(env);
  const key = `media:${canonicalId}`;
  
  try {
    const response = await fetch(`${url}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    if (!data.result) {
      return false;
    }
    
    const media = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    // Verify it's a PublishedMediaAsset
    return media.id === canonicalId && 
           media.source === 'local' && 
           media.lifecycleState === 'published';
  } catch (error) {
    console.error('[REPAIR] Failed to verify canonical media:', error);
    return false;
  }
}

/**
 * Main repair function
 */
async function repairCanonicalAssignments() {
  console.log('=== REPAIR CANONICAL ASSIGNMENTS STARTED ===\n');
  
  const env = loadEnv();
  console.log('[REPAIR] KV credentials:', {
    hasUrl: !!env.KV_REST_API_URL,
    hasToken: !!env.KV_REST_API_TOKEN,
  });
  
  const results = [];
  
  for (const mapping of VERIFIED_MAPPINGS) {
    console.log(`[REPAIR] Processing service: ${mapping.serviceSlug}`);
    console.log(`[REPAIR] Poisoned ID: ${mapping.poisonedId}`);
    console.log(`[REPAIR] Canonical ID: ${mapping.canonicalId}`);
    console.log(`[REPAIR] Authority: ${mapping.authority}`);
    
    try {
      // 1. Verify canonical media is valid PublishedMediaAsset
      const canonicalValid = await verifyCanonicalMedia(mapping.canonicalId, env);
      if (!canonicalValid) {
        console.log(`[REPAIR] Canonical ID does not resolve to valid PublishedMediaAsset`);
        results.push({
          serviceSlug: mapping.serviceSlug,
          status: 'FAILED',
          reason: 'Canonical ID does not resolve to valid PublishedMediaAsset',
        });
        continue;
      }
      console.log(`[REPAIR] ✓ Canonical ID verified as PublishedMediaAsset`);
      
      // 2. Read current assignment
      const currentAssignment = await getAssignment(mapping.serviceSlug, env);
      if (!currentAssignment) {
        console.log(`[REPAIR] No current assignment found for: ${mapping.serviceSlug}`);
        results.push({
          serviceSlug: mapping.serviceSlug,
          status: 'SKIPPED',
          reason: 'No current assignment found',
        });
        continue;
      }
      
      console.log(`[REPAIR] Current assignment mediaId: ${currentAssignment.mediaId}`);
      
      // 3. Verify current assignment matches poisoned ID
      if (currentAssignment.mediaId !== mapping.poisonedId) {
        console.log(`[REPAIR] Current assignment does not match poisoned ID`);
        console.log(`[REPAIR] Expected: ${mapping.poisonedId}`);
        console.log(`[REPAIR] Found: ${currentAssignment.mediaId}`);
        
        // If it's already the canonical ID, that's fine
        if (currentAssignment.mediaId === mapping.canonicalId) {
          console.log(`[REPAIR] Assignment already repaired to canonical ID`);
          results.push({
            serviceSlug: mapping.serviceSlug,
            status: 'ALREADY_REPAIRED',
            currentMediaId: currentAssignment.mediaId,
          });
          continue;
        }
        
        // Otherwise, this is unexpected - skip to avoid breaking valid assignments
        results.push({
          serviceSlug: mapping.serviceSlug,
          status: 'SKIPPED',
          reason: 'Current assignment does not match poisoned ID',
          currentMediaId: currentAssignment.mediaId,
          expectedPoisonedId: mapping.poisonedId,
        });
        continue;
      }
      
      // 4. Update assignment to canonical ID
      const updatedAssignment = {
        ...currentAssignment,
        mediaId: mapping.canonicalId,
        updatedAt: new Date().toISOString(),
      };
      
      await setAssignment(mapping.serviceSlug, updatedAssignment, env);
      console.log(`[REPAIR] ✓ Assignment updated to canonical ID: ${mapping.canonicalId}`);
      
      // 5. Quarantine old assignment
      await quarantineAssignment(
        mapping.serviceSlug,
        currentAssignment,
        `Repaired from ${mapping.poisonedId} to ${mapping.canonicalId} (${mapping.authority})`,
        env
      );
      
      // 6. Verify new assignment
      const newAssignment = await getAssignment(mapping.serviceSlug, env);
      if (!newAssignment) {
        results.push({
          serviceSlug: mapping.serviceSlug,
          status: 'ERROR',
          reason: 'Failed to read back new assignment',
        });
        continue;
      }
      
      if (newAssignment.mediaId !== mapping.canonicalId) {
        results.push({
          serviceSlug: mapping.serviceSlug,
          status: 'ERROR',
          reason: 'New assignment mediaId does not match canonical ID',
        });
        continue;
      }
      
      console.log(`[REPAIR] ✓ New assignment verified`);
      
      results.push({
        serviceSlug: mapping.serviceSlug,
        status: 'REPAIRED',
        oldMediaId: mapping.poisonedId,
        newMediaId: mapping.canonicalId,
        authority: mapping.authority,
      });
      
    } catch (error) {
      console.error(`[REPAIR] Error processing ${mapping.serviceSlug}:`, error);
      results.push({
        serviceSlug: mapping.serviceSlug,
        status: 'ERROR',
        reason: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    
    console.log('');
  }
  
  console.log('=== REPAIR CANONICAL ASSIGNMENTS COMPLETE ===');
  console.log(`[REPAIR] Total mappings: ${results.length}`);
  console.log(`[REPAIR] Repaired: ${results.filter(r => r.status === 'REPAIRED').length}`);
  console.log(`[REPAIR] Already repaired: ${results.filter(r => r.status === 'ALREADY_REPAIRED').length}`);
  console.log(`[REPAIR] Skipped: ${results.filter(r => r.status === 'SKIPPED').length}`);
  console.log(`[REPAIR] Failed: ${results.filter(r => r.status === 'FAILED' || r.status === 'ERROR').length}`);
  
  return results;
}

// Run repair if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  repairCanonicalAssignments()
    .then((result) => {
      console.log('\n=== REPAIR RESULTS ===');
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Repair failed:', error);
      process.exit(1);
    });
}

export { repairCanonicalAssignments, VERIFIED_MAPPINGS };
