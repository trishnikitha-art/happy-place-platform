/**
 * Fix Corrupted Assignments
 * 
 * This script fixes assignments that were corrupted with nested "value" field
 * during the first repair attempt.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const ASSIGNMENT_PREFIX = 'service-card-assignment:';

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
    console.error('[FIX] Failed to load .env.local:', error);
    return {};
  }
}

async function fixAssignment(serviceSlug, env) {
  const { KV_REST_API_URL, KV_REST_API_TOKEN } = env;
  
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return {
      serviceSlug,
      status: 'ERROR',
      reason: 'KV credentials not available',
    };
  }
  
  try {
    const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
    
    // 1. Read current assignment
    const getResponse = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    if (!getResponse.ok) {
      return {
        serviceSlug,
        status: 'ERROR',
        reason: `KV get failed: ${getResponse.status} ${getResponse.statusText}`,
      };
    }
    
    const getData = await getResponse.json();
    if (!getData.result) {
      return {
        serviceSlug,
        status: 'ERROR',
        reason: 'Assignment not found',
      };
    }
    
    // 2. Check if corrupted (has nested "value" field)
    const current = typeof getData.result === 'string' 
      ? JSON.parse(getData.result) 
      : getData.result;
    
    if (!current.value) {
      // Not corrupted, already correct
      return {
        serviceSlug,
        status: 'ALREADY_CORRECT',
      };
    }
    
    // 3. Extract the actual assignment from the nested value
    const actualAssignment = JSON.parse(current.value);
    console.log(`[FIX] Found corrupted assignment for ${serviceSlug}:`, {
      corruptedMediaId: actualAssignment.mediaId,
    });
    
    // 4. Re-store correctly (without nested value)
    const setResponse = await fetch(`${KV_REST_API_URL}/set/${key}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actualAssignment),
    });
    
    if (!setResponse.ok) {
      return {
        serviceSlug,
        status: 'ERROR',
        reason: `KV set failed: ${setResponse.status} ${setResponse.statusText}`,
      };
    }
    
    // 5. Verify the fix
    const verifyResponse = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    const verifyData = await verifyResponse.json();
    const verified = typeof verifyData.result === 'string' 
      ? JSON.parse(verifyData.result) 
      : verifyData.result;
    
    if (verified.value) {
      return {
        serviceSlug,
        status: 'ERROR',
        reason: 'Assignment still corrupted after fix',
      };
    }
    
    return {
      serviceSlug,
      status: 'FIXED',
      mediaId: verified.mediaId,
    };
  } catch (error) {
    return {
      serviceSlug,
      status: 'ERROR',
      reason: `Fix failed: ${error.message}`,
    };
  }
}

async function fixCorruptedAssignments() {
  console.log('=== FIXING CORRUPTED ASSIGNMENTS ===\n');
  
  const env = loadEnv();
  console.log('[FIX] KV credentials:', {
    hasUrl: !!env.KV_REST_API_URL,
    hasToken: !!env.KV_REST_API_TOKEN,
  });
  
  const services = ['brand-hero', 'painting', 'repairs', 'restoration', 'fences'];
  const results = [];
  
  for (const serviceSlug of services) {
    console.log(`[FIX] Processing service: ${serviceSlug}`);
    const result = await fixAssignment(serviceSlug, env);
    results.push(result);
    
    if (result.status === 'FIXED') {
      console.log(`[FIX] ✓ Fixed: ${serviceSlug} → ${result.mediaId}`);
    } else if (result.status === 'ALREADY_CORRECT') {
      console.log(`[FIX] ✓ Already correct: ${serviceSlug}`);
    } else {
      console.log(`[FIX] ✗ Error: ${result.reason}`);
    }
  }
  
  console.log('\n=== FIX COMPLETE ===');
  console.log(`[FIX] Total assignments: ${results.length}`);
  console.log(`[FIX] Fixed: ${results.filter(r => r.status === 'FIXED').length}`);
  console.log(`[FIX] Already correct: ${results.filter(r => r.status === 'ALREADY_CORRECT').length}`);
  console.log(`[FIX] Errors: ${results.filter(r => r.status === 'ERROR').length}`);
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  fixCorruptedAssignments()
    .then(results => {
      console.log('\n=== FIX RESULTS ===');
      console.log(JSON.stringify(results, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Fix failed:', error);
      process.exit(1);
    });
}

export { fixCorruptedAssignments };
