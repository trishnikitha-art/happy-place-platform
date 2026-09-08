/**
 * Browser Console Drive Chain Test V2
 * 
 * Run this in the browser console AFTER authenticating with:
 * 1. Workbench login (password)
 * 2. Google Drive OAuth
 * 
 * Copy this entire script and paste it into the browser console.
 * 
 * This tests the CORRECT Drive endpoints:
 * 1. Workbench auth status
 * 2. Drive auth status
 * 3. Drive discovery (/api/drive/discovery)
 * 4. Drive files (/api/drive/files)
 * 5. Workbench drive corpus (/api/workbench/drive-corpus)
 * 6. Workbench media authority
 * 7. KV connectivity diagnostic
 */

const BASE_URL = window.location.origin;

async function testEndpoint(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  console.log(`\n🔍 Testing: ${url}`);
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Include cookies
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
    console.log('Response:', data);
    
    return { status, statusText, data, success: response.ok };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Authenticated Drive Chain Test V2');
  console.log('='.repeat(50));
  
  // Test 1: Workbench auth status
  console.log('\n\n📋 TEST 1: Workbench Auth Status');
  const workbenchAuth = await testEndpoint('/api/workbench/auth-status');
  
  // Test 2: Drive auth status
  console.log('\n\n📋 TEST 2: Drive Auth Status');
  const driveAuth = await testEndpoint('/api/drive/auth/status');
  
  // Test 3: Drive discovery (CORRECT ENDPOINT)
  console.log('\n\n📋 TEST 3: Drive Discovery (/api/drive/discovery)');
  const discovery = await testEndpoint('/api/drive/discovery');
  
  // Test 4: Drive files (CORRECT ENDPOINT - GET with query params)
  console.log('\n\n📋 TEST 4: Drive Files (/api/drive/files?folderId=root)');
  const files = await testEndpoint('/api/drive/files?folderId=root');
  
  // Test 5: Workbench drive corpus (CORRECT ENDPOINT)
  console.log('\n\n📋 TEST 5: Workbench Drive Corpus (/api/workbench/drive-corpus)');
  const driveCorpus = await testEndpoint('/api/workbench/drive-corpus', {
    method: 'POST',
    body: JSON.stringify({ action: 'getStructure' }),
  });
  
  // Test 6: Workbench media authority
  console.log('\n\n📋 TEST 6: Workbench Media Authority');
  const mediaAuthority = await testEndpoint('/api/workbench/media-authority', {
    method: 'POST',
    body: JSON.stringify({ action: 'list' }),
  });
  
  // Test 7: KV connectivity diagnostic
  console.log('\n\n📋 TEST 7: KV Connectivity Diagnostic');
  const kvConnectivity = await testEndpoint('/api/admin/diagnostic/kv-connectivity');
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  const results = {
    workbenchAuth: workbenchAuth.success,
    driveAuth: driveAuth.success,
    discovery: discovery.success,
    files: files.success,
    driveCorpus: driveCorpus.success,
    mediaAuthority: mediaAuthority.success,
    kvConnectivity: kvConnectivity.success,
  };
  
  console.log('Results:', results);
  
  // Analyze results
  console.log('\n\n🔍 ANALYSIS');
  
  if (!workbenchAuth.success) {
    console.log('❌ Workbench authentication failed - cannot proceed');
  } else if (!driveAuth.success || !driveAuth.data.authenticated) {
    console.log('❌ Drive authentication failed - need to authorize Google Drive');
  } else if (!discovery.success) {
    console.log('❌ Drive discovery failed - Drive API may be down');
  } else if (!files.success) {
    console.log('❌ Drive files failed - Drive file listing may be broken');
  } else if (!driveCorpus.success) {
    console.log('❌ Workbench drive corpus failed - corpus authorization may be broken');
  } else if (!mediaAuthority.success) {
    console.log('❌ Media authority failed - KV may be unavailable');
  } else if (!kvConnectivity.success) {
    console.log('❌ KV connectivity failed - check diagnostic results');
  } else {
    console.log('✅ All endpoints are accessible');
    
    // Check if we have PublishedMediaAssets
    if (mediaAuthority.data && mediaAuthority.data.media) {
      console.log(`📊 PublishedMediaAssets in KV: ${mediaAuthority.data.media.length}`);
      if (mediaAuthority.data.media.length > 0) {
        console.log('Sample assets:', mediaAuthority.data.media.slice(0, 3).map(m => ({
          id: m.id,
          filename: m.filename,
          source: m.source,
          lifecycleState: m.lifecycleState,
          storage: m.storage,
        })));
      }
    }
    
    // Check if we have Drive discovery results
    if (discovery.data) {
      console.log('📊 Drive discovery:', {
        hasMyDrive: !!discovery.data.myDrive,
        sharedDriveCount: discovery.data.sharedDrives?.length || 0,
      });
    }
    
    // Check if we have Drive files
    if (files.data && files.data.items) {
      console.log(`📊 Drive files: ${files.data.items.length}`);
    }
    
    // Check KV connectivity details
    if (kvConnectivity.data && kvConnectivity.data.diagnostics) {
      console.log('📊 KV Connectivity:', kvConnectivity.data.diagnostics);
    }
  }
}

console.log('📋 Copy and paste this function, then call main()');
window.runDriveTestV2 = main;
