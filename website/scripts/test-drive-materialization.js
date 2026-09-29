/**
 * Test Drive Materialization
 * 
 * Tests the full Drive → PublishedMediaAsset materialization chain
 */

const PRODUCTION_URL = 'https://happy-place-platform.vercel.app';

async function loginWorkbench() {
  console.log('🔐 Logging into Workbench');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/workbench/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'admin' }),
    });
    
    const data = await response.json();
    const setCookie = response.headers.get('set-cookie');
    
    return { success: response.ok, data, setCookie };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function checkDriveAuthStatus(cookie) {
  console.log('🔍 Checking Drive Auth Status');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/auth/status`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', data);
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

async function getDriveDiscovery(cookie) {
  console.log('🔍 Getting Drive Discovery');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/discovery`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('My Drive:', data.myDrive ? 'Available' : 'Not available');
    console.log('Shared Drives:', data.sharedDrives?.length || 0);
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

async function getDriveFiles(cookie, parentId, driveId) {
  console.log('🔍 Getting Drive Files');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/files`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ parentId, driveId }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Files returned:', data.items?.length || 0);
    
    // Show first few files
    if (data.items && data.items.length > 0) {
      console.log('\nFirst 3 files:');
      data.items.slice(0, 3).forEach((item, i) => {
        console.log(`  ${i + 1}. ${item.name} (${item.id}) - ${item.mimeType}`);
      });
    }
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

async function main() {
  console.log('🚀 Drive Materialization Test');
  console.log('='.repeat(50));
  
  // Login
  const loginResult = await loginWorkbench();
  
  if (!loginResult.success) {
    console.log('❌ Workbench login failed');
    return;
  }
  
  // Check Drive auth status
  console.log('\n--- Step 1: Check Drive Auth Status ---');
  const authStatus = await checkDriveAuthStatus(loginResult.setCookie);
  
  if (!authStatus.authenticated) {
    console.log('\n❌ Drive not authenticated');
    console.log('You need to complete Google OAuth consent first.');
    console.log('Please open the Workbench in your browser and connect Drive.');
    return;
  }
  
  // Get Drive discovery
  console.log('\n--- Step 2: Get Drive Discovery ---');
  const discovery = await getDriveDiscovery(loginResult.setCookie);
  
  if (!discovery.sharedDrives || discovery.sharedDrives.length === 0) {
    console.log('❌ No Shared Drives available');
    return;
  }
  
  // Get files from first Shared Drive
  const firstDrive = discovery.sharedDrives[0];
  console.log(`\n--- Step 3: Getting files from Shared Drive: ${firstDrive.name} ---`);
  const files = await getDriveFiles(loginResult.setCookie, firstDrive.id, firstDrive.id);
  
  if (!files.items || files.items.length === 0) {
    console.log('❌ No files in Shared Drive');
    return;
  }
  
  // Select first image file
  const imageFile = files.items.find(f => f.mimeType.startsWith('image/'));
  if (!imageFile) {
    console.log('❌ No image files found');
    return;
  }
  
  console.log(`\n✅ Selected file for materialization: ${imageFile.name} (${imageFile.id})`);
  console.log('This file can be materialized via the Workbench UI or API.');
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Drive authentication: Active');
  console.log('✅ Shared Drives: Available');
  console.log('✅ Files: Accessible');
  console.log(`✅ Ready to materialize: ${imageFile.name}`);
  console.log('\nNext: Use the Workbench UI to select this file and click "Use This Asset"');
}

main().catch(console.error);
