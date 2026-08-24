/**
 * Check Production Assignments
 * 
 * This script checks if the production assignments are pointing to canonical IDs.
 */

const ASSIGNMENT_PREFIX = 'service-card-assignment:';
const PRODUCTION_KV_URL = 'https://needed-mastodon-82399.upstash.io';
const PRODUCTION_KV_TOKEN = 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const SERVICES = ['brand-hero', 'painting', 'repairs', 'restoration', 'fences'];

async function checkAssignment(serviceSlug) {
  const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
  
  try {
    const response = await fetch(`${PRODUCTION_KV_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
      },
    });
    
    if (!response.ok) {
      return {
        serviceSlug,
        status: 'ERROR',
        reason: `KV get failed: ${response.status} ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    if (!data.result) {
      return {
        serviceSlug,
        status: 'NOT_FOUND',
      };
    }
    
    const assignment = typeof data.result === 'string' 
      ? JSON.parse(data.result) 
      : data.result;
    
    return {
      serviceSlug,
      status: 'FOUND',
      mediaId: assignment.mediaId,
      hasNestedValue: !!assignment.value,
    };
  } catch (error) {
    return {
      serviceSlug,
      status: 'ERROR',
      reason: `KV check failed: ${error.message}`,
    };
  }
}

async function checkProductionAssignments() {
  console.log('=== CHECKING PRODUCTION ASSIGNMENTS ===\n');
  console.log(`[CHECK] Target KV: ${PRODUCTION_KV_URL}`);
  console.log(`[CHECK] Checking ${SERVICES.length} assignments\n`);
  
  const results = [];
  
  for (const serviceSlug of SERVICES) {
    console.log(`[CHECK] Checking: ${serviceSlug}`);
    const result = await checkAssignment(serviceSlug);
    results.push(result);
    
    if (result.status === 'FOUND') {
      console.log(`[CHECK] ✓ Found: ${serviceSlug}`);
      console.log(`[CHECK]   mediaId: ${result.mediaId}`);
      console.log(`[CHECK]   hasNestedValue: ${result.hasNestedValue}`);
    } else if (result.status === 'NOT_FOUND') {
      console.log(`[CHECK] ✗ Not found: ${serviceSlug}`);
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
  checkProductionAssignments()
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

export { checkProductionAssignments };
