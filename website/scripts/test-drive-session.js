/**
 * Drive Session Test with Authentication
 * 
 * Tests Drive OAuth flow with Workbench authentication
 */

const PRODUCTION_URL = 'https://happy-place-platform.vercel.app';

async function testDriveAuthStatus() {
  console.log('🔍 Testing Drive Auth Status (before login)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/auth/status`, {
      method: 'GET',
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

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
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
    
    // Extract Set-Cookie header
    const setCookie = response.headers.get('set-cookie');
    console.log('Set-Cookie:', setCookie);
    
    return { success: response.ok, data, setCookie };
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function testDriveAuthStatusWithCookie(cookie) {
  console.log('🔍 Testing Drive Auth Status (after login)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/auth/status`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Response:', data);
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

async function testDriveOAuthAuthorize(cookie) {
  console.log('🔍 Testing Drive OAuth Authorize (with login)');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/oauth/authorize`, {
      method: 'GET',
      headers: {
        'Cookie': cookie,
      },
      redirect: 'manual',
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      console.log('Redirect Location:', location);
      
      if (location && location.includes('accounts.google.com')) {
        console.log('✅ OAuth authorize correctly redirects to Google');
        return { success: true, redirectUrl: location };
      } else {
        console.log('❌ Unexpected redirect location');
        return { success: false, error: 'Unexpected redirect' };
      }
    } else {
      console.log('❌ Expected redirect (307/302), got:', response.status);
      const data = await response.text();
      console.log('Response body:', data);
      return { success: false, error: 'Not a redirect' };
    }
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Drive Session Test with Authentication');
  console.log('='.repeat(50));
  
  // Test auth status before login
  console.log('\n--- Step 1: Check Drive Auth Status (before login) ---');
  const beforeLogin = await testDriveAuthStatus();
  
  // Login to Workbench
  console.log('\n--- Step 2: Login to Workbench ---');
  const loginResult = await loginWorkbench();
  
  if (!loginResult.success) {
    console.log('❌ Workbench login failed, stopping test');
    return;
  }
  
  // Test auth status after login
  console.log('\n--- Step 3: Check Drive Auth Status (after login) ---');
  const afterLogin = await testDriveAuthStatusWithCookie(loginResult.setCookie);
  
  // Test OAuth authorize
  console.log('\n--- Step 4: Test OAuth Authorize ---');
  const oauthResult = await testDriveOAuthAuthorize(loginResult.setCookie);
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  console.log('Before login auth status:', beforeLogin);
  console.log('After login auth status:', afterLogin);
  console.log('OAuth authorize result:', oauthResult);
  
  if (oauthResult.success) {
    console.log('\n✅ Full authentication chain is working');
    console.log('Next step: Open the Google OAuth URL in a browser to complete consent');
  } else {
    console.log('\n❌ OAuth authorization failed');
  }
}

main().catch(console.error);
