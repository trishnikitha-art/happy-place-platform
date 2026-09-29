/**
 * Drive Discovery Test
 * 
 * Tests Drive discovery endpoint with and without Drive authorization
 */

const PRODUCTION_URL = 'https://happy-place-platform.vercel.app';

async function testWorkbenchLogin() {
  console.log('🔍 Testing Workbench Login');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/workbench/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: 'admin' }),
    });
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', data);
    
    if (response.ok && data.success) {
      const setCookie = response.headers.get('set-cookie');
      console.log('Set-Cookie:', setCookie);
      
      return { success: true, data, setCookie };
    } else {
      console.log('❌ Workbench login failed');
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDriveDiscovery(cookie) {
  console.log('\n🔍 Testing Drive Discovery');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/discovery`, {
      headers: {
        'Cookie': cookie,
      },
    });
    
    console.log('Status:', response.status);
    
    const data = await response.json();
    console.log('Response:', data);
    
    return { success: true, data, status: response.status };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDriveAuthStatus(cookie) {
  console.log('\n🔍 Testing Drive Auth Status');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/auth/status`, {
      headers: {
        'Cookie': cookie,
      },
    });
    
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
  console.log('🚀 Drive Discovery Test');
  console.log('='.repeat(50));
  
  // Step 1: Workbench Login
  const loginResult = await testWorkbenchLogin();
  
  if (!loginResult.success) {
    console.log('\n❌ Cannot proceed without Workbench authentication');
    process.exit(1);
  }
  
  const cookie = loginResult.setCookie;
  console.log('\n✅ Workbench authenticated');
  
  // Step 2: Check Drive Auth Status (should be unauthorized)
  const authStatus = await testDriveAuthStatus(cookie);
  console.log('\nDrive Auth Status:', authStatus.status);
  
  // Step 3: Attempt Drive Discovery (should be rejected without Drive authorization)
  const discoveryResult = await testDriveDiscovery(cookie);
  
  if (discoveryResult.status === 401) {
    console.log('\n✅ Drive discovery correctly rejects request without Drive authorization');
  } else if (discoveryResult.status === 200) {
    console.log('\n⚠️ Drive discovery returned 200 (unexpected without Drive authorization)');
    console.log('Response:', discoveryResult.data);
  } else {
    console.log('\n⚠️ Unexpected Drive discovery status:', discoveryResult.status);
  }
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Workbench authentication: PROVEN');
  console.log('Drive auth status: ' + (authStatus.data.authenticated ? 'AUTHENTICATED' : 'NOT AUTHENTICATED'));
  console.log('Drive discovery: ' + (discoveryResult.status === 401 ? 'REQUIRES DRIVE AUTH (expected)' : 'CHECK RESPONSE'));
}

main().catch(console.error);
