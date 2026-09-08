/**
 * Production Drive Chain Test
 * 
 * Tests the complete OAuth → Drive → materialization chain in production
 * by making direct HTTP requests to the deployed endpoints.
 * 
 * This script tests:
 * 1. Health endpoint
 * 2. Drive auth status
 * 3. Drive discovery
 * 4. Drive files
 * 5. Thumbnail proxy
 * 6. Workbench media authority
 * 
 * Run with: node scripts/test-production-drive-chain.js
 */

const PRODUCTION_URL = 'https://happy-place-platform.vercel.app';

async function testEndpoint(path, options = {}) {
  const url = `${PRODUCTION_URL}${path}`;
  console.log(`\n🔍 Testing: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    const status = response.status;
    const statusText = response.statusText;
    
    let data;
    try {
      data = await response.json();
    } catch {
      data = await response.text();
    }
    
    console.log(`Status: ${status} ${statusText}`);
    console.log('Response:', JSON.stringify(data, null, 2));
    
    return { status, statusText, data, success: response.ok };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Production Drive Chain Test');
  console.log('='.repeat(50));
  
  // Test 1: Health endpoint
  console.log('\n\n📋 TEST 1: Health Endpoint');
  const health = await testEndpoint('/api/health');
  
  // Test 2: Drive auth status (unauthenticated)
  console.log('\n\n📋 TEST 2: Drive Auth Status (Unauthenticated)');
  const authStatus = await testEndpoint('/api/drive/auth/status');
  
  // Test 3: Drive discovery (unauthenticated - should fail)
  console.log('\n\n📋 TEST 3: Drive Discovery (Unauthenticated - should fail)');
  const discovery = await testEndpoint('/api/drive/discovery');
  
  // Test 4: Drive files (unauthenticated - should fail)
  console.log('\n\n📋 TEST 4: Drive Files (Unauthenticated - should fail)');
  const files = await testEndpoint('/api/drive/files?folderId=root', {
    method: 'GET',
  });
  
  // Test 5: Workbench media authority (unauthenticated - should fail)
  console.log('\n\n📋 TEST 5: Workbench Media Authority (Unauthenticated - should fail)');
  const mediaAuthority = await testEndpoint('/api/workbench/media-authority', {
    method: 'POST',
    body: JSON.stringify({ action: 'list' }),
  });
  
  // Test 6: KV connectivity diagnostic (unauthenticated - should fail)
  console.log('\n\n📋 TEST 6: KV Connectivity Diagnostic (Unauthenticated - should fail)');
  const kvConnectivity = await testEndpoint('/api/admin/diagnostic/kv-connectivity');
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  const results = {
    health: health.success,
    authStatus: authStatus.success,
    discovery: discovery.success,
    files: files.success,
    mediaAuthority: mediaAuthority.success,
    kvConnectivity: kvConnectivity.success,
  };
  
  console.log('Results:', JSON.stringify(results, null, 2));
  
  console.log('\n\n✅ UNAUTHENTICATED TESTS COMPLETE');
  console.log('Next steps:');
  console.log('1. Authenticate with Google Drive in the Workbench');
  console.log('2. Re-run this test with authentication cookies');
  console.log('3. Test authenticated Drive discovery and file listing');
}

main().catch(console.error);
