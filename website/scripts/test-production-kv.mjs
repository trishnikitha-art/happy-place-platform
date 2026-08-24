/**
 * Test Production KV Connectivity
 */

const PRODUCTION_KV_URL = 'https://needed-mastodon-82399.upstash.io';
const PRODUCTION_KV_TOKEN = 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

async function testKV() {
  console.log('=== TESTING PRODUCTION KV CONNECTIVITY ===\n');
  console.log(`[TEST] URL: ${PRODUCTION_KV_URL}`);
  console.log(`[TEST] Token: ${PRODUCTION_KV_TOKEN.substring(0, 20)}...`);
  
  try {
    const response = await fetch(`${PRODUCTION_KV_URL}/get/test-key`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
      },
    });
    
    console.log(`[TEST] Response status: ${response.status}`);
    console.log(`[TEST] Response OK: ${response.ok}`);
    
    const data = await response.json();
    console.log(`[TEST] Response data:`, JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error(`[TEST] Error: ${error.message}`);
  }
}

testKV();
