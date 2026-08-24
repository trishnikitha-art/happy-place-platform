/**
 * Check Assignments
 * 
 * This script checks the current state of service card assignments in KV.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const SERVICES = ['brand-hero', 'painting', 'repairs', 'restoration', 'fences'];
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
    console.error('[CHECK] Failed to load .env.local:', error);
    return {};
  }
}

async function checkAssignment(serviceSlug, env) {
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
    const response = await fetch(`${KV_REST_API_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${KV_REST_API_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        return {
          serviceSlug,
          status: 'NOT_FOUND',
        };
      }
      return {
        serviceSlug,
        status: 'ERROR',
        reason: `KV request failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    if (!data.result) {
      return {
        serviceSlug,
        status: 'NOT_FOUND',
      };
    }
    
    // Parse assignment (may be string or object)
    const assignment = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    return {
      serviceSlug,
      status: 'FOUND',
      assignment,
    };
  } catch (error) {
    return {
      serviceSlug,
      status: 'ERROR',
      reason: `Check failed: ${error.message}`,
    };
  }
}

async function checkAssignments() {
  console.log('=== CHECKING ASSIGNMENTS ===\n');
  
  const env = loadEnv();
  console.log('[CHECK] KV credentials:', {
    hasUrl: !!env.KV_REST_API_URL,
    hasToken: !!env.KV_REST_API_TOKEN,
  });
  
  const results = [];
  
  for (const serviceSlug of SERVICES) {
    console.log(`[CHECK] Checking assignment: ${serviceSlug}`);
    const result = await checkAssignment(serviceSlug, env);
    results.push(result);
    
    if (result.status === 'FOUND') {
      console.log(`[CHECK] ✓ Found:`, {
        mediaId: result.assignment.mediaId,
        updatedAt: result.assignment.updatedAt,
      });
    } else if (result.status === 'NOT_FOUND') {
      console.log(`[CHECK] ✗ Not found`);
    } else {
      console.log(`[CHECK] ✗ Error: ${result.reason}`);
    }
  }
  
  console.log('\n=== CHECK COMPLETE ===');
  console.log(`[CHECK] Total assignments: ${results.length}`);
  console.log(`[CHECK] Found: ${results.filter(r => r.status === 'FOUND').length}`);
  console.log(`[CHECK] Not found: ${results.filter(r => r.status === 'NOT_FOUND').length}`);
  console.log(`[CHECK] Errors: ${results.filter(r => r.status === 'ERROR').length}`);
  
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkAssignments()
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

export { checkAssignments };
