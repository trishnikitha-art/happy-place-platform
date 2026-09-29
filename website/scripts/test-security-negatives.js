/**
 * Security Negative Tests
 * 
 * Tests that endpoints reject requests without proper authentication
 */

const PRODUCTION_URL = 'https://happy-place-platform.vercel.app';

async function testWorkbenchAuthStatusWithoutSession() {
  console.log('🔍 Testing Workbench Auth Status (no session)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/workbench/auth-status`);
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', data);
    
    return { success: true, data, status: response.status };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDriveAuthStatusWithoutSession() {
  console.log('\n🔍 Testing Drive Auth Status (no session)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/auth/status`);
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', data);
    
    return { success: true, data, status: response.status };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDriveDiscoveryWithoutSession() {
  console.log('\n🔍 Testing Drive Discovery (no session)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/discovery`);
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', data);
    
    return { success: true, data, status: response.status };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDriveOAuthAuthorizeWithoutSession() {
  console.log('\n🔍 Testing Drive OAuth Authorize (no session)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/oauth/authorize`, {
      redirect: 'manual',
    });
    
    console.log('Status:', response.status);
    
    const location = response.headers.get('location');
    console.log('Redirect:', location);
    
    return { success: true, status: response.status, redirect: location };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDriveFilesWithoutSession() {
  console.log('\n🔍 Testing Drive Files (no session)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/files`);
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', data);
    
    return { success: true, data, status: response.status };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Security Negative Tests');
  console.log('='.repeat(50));
  
  // Test all endpoints without Workbench session
  const workbenchAuthResult = await testWorkbenchAuthStatusWithoutSession();
  const driveAuthResult = await testDriveAuthStatusWithoutSession();
  const discoveryResult = await testDriveDiscoveryWithoutSession();
  const oauthResult = await testDriveOAuthAuthorizeWithoutSession();
  const filesResult = await testDriveFilesWithoutSession();
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  console.log('Workbench auth status (no session): ' + (workbenchAuthResult.status === 401 ? 'REJECTED (expected)' : 'STATUS: ' + workbenchAuthResult.status));
  console.log('Drive auth status (no session): ' + (driveAuthResult.status === 401 ? 'REJECTED (expected)' : 'STATUS: ' + driveAuthResult.status));
  console.log('Drive discovery (no session): ' + (discoveryResult.status === 401 ? 'REJECTED (expected)' : 'STATUS: ' + discoveryResult.status));
  console.log('Drive OAuth authorize (no session): ' + (oauthResult.status === 401 ? 'REJECTED (expected)' : 'STATUS: ' + oauthResult.status));
  console.log('Drive files (no session): ' + (filesResult.status === 401 ? 'REJECTED (expected)' : 'STATUS: ' + filesResult.status));
  
  const allRejected = 
    workbenchAuthResult.status === 401 &&
    driveAuthResult.status === 401 &&
    discoveryResult.status === 401 &&
    oauthResult.status === 401 &&
    filesResult.status === 401;
  
  console.log('\n' + (allRejected ? '✅ ALL SECURITY NEGATIVES PASSED' : '⚠️ SOME ENDPOINTS ACCEPTED UNAUTHENTICATED REQUESTS'));
}

main().catch(console.error);
