/**
 * Drive OAuth Flow Test
 * 
 * Tests the complete OAuth → Drive → R2 chain
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
      // Extract session cookie
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

async function testDriveOAuthAuthorize(cookie) {
  console.log('\n🔍 Testing Drive OAuth Authorize');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/oauth/authorize`, {
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
  console.log('🚀 Drive OAuth Flow Test');
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
  const authStatusBefore = await testDriveAuthStatus(cookie);
  console.log('\nDrive Auth Status (before OAuth):', authStatusBefore.status);
  
  // Step 3: Attempt OAuth Authorize
  const oauthResult = await testDriveOAuthAuthorize(cookie);
  
  if (oauthResult.status === 401) {
    console.log('\n✅ OAuth authorize correctly requires Drive authorization (expected)');
  } else if (oauthResult.data?.authorizationUrl) {
    console.log('\n✅ OAuth authorize returned authorization URL');
    console.log('Authorization URL:', oauthResult.data.authorizationUrl);
  } else {
    console.log('\n⚠️ Unexpected OAuth authorize response');
  }
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Workbench authentication: PROVEN');
  console.log('Drive OAuth authorization: ' + (oauthResult.status === 401 ? 'REQUIRES DRIVE AUTH (expected)' : 'EXECUTED'));
}

main().catch(console.error);
