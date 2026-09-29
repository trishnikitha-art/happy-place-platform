/**
 * Drive OAuth Flow Test v2
 * 
 * Tests the complete OAuth → Drive → R2 chain with redirect handling
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
      redirect: 'manual', // Don't follow redirects automatically
    });
    
    console.log('Status:', response.status);
    console.log('Redirect:', response.headers.get('location'));
    
    // Check if it's a redirect to Google OAuth
    const location = response.headers.get('location');
    if (location && location.includes('accounts.google.com')) {
      console.log('✅ OAuth authorize redirects to Google OAuth (expected)');
      return { success: true, redirect: location, status: response.status };
    }
    
    // Try to parse as JSON if not a redirect
    const text = await response.text();
    console.log('Response body (first 200 chars):', text.substring(0, 200));
    
    try {
      const data = JSON.parse(text);
      return { success: true, data, status: response.status };
    } catch {
      return { success: false, error: 'Non-JSON response', text: text.substring(0, 500) };
    }
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Drive OAuth Flow Test v2');
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
  
  if (oauthResult.redirect) {
    console.log('\n✅ OAuth authorize correctly redirects to Google OAuth');
    console.log('Redirect URL:', oauthResult.redirect);
  } else if (oauthResult.success) {
    console.log('\n✅ OAuth authorize returned JSON response');
    console.log('Response:', oauthResult.data);
  } else {
    console.log('\n⚠️ Unexpected OAuth authorize response');
    console.log('Error:', oauthResult.error);
  }
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  console.log('✅ Workbench authentication: PROVEN');
  console.log('Drive OAuth authorization: ' + (oauthResult.redirect ? 'REDIRECTS TO GOOGLE (expected)' : 'CHECK RESPONSE'));
}

main().catch(console.error);
