/**
 * Drive OAuth Flow Test
 * 
 * Tests the Google Drive OAuth authorization flow
 * Run with: node scripts/test-drive-oauth.js
 */

const PRODUCTION_URL = 'https://happy-place-platform.vercel.app';

async function testOAuthAuthorize() {
  console.log('🔍 Testing OAuth Authorize Endpoint');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/drive/oauth/authorize`, {
      redirect: 'manual', // Don't auto-follow redirect
    });
    
    console.log('Status:', response.status);
    console.log('Status Text:', response.statusText);
    
    if (response.status === 307 || response.status === 302) {
      const location = response.headers.get('location');
      console.log('Redirect Location:', location);
      
      if (location && location.includes('accounts.google.com')) {
        console.log('✅ OAuth authorize endpoint correctly redirects to Google');
        console.log('✅ Google OAuth URL:', location);
        return { success: true, redirectUrl: location };
      } else {
        console.log('❌ Unexpected redirect location');
        return { success: false, error: 'Unexpected redirect' };
      }
    } else {
      console.log('❌ Expected redirect (307/302), got:', response.status);
      return { success: false, error: 'Not a redirect' };
    }
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Drive OAuth Flow Test');
  console.log('='.repeat(50));
  
  const result = await testOAuthAuthorize();
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  if (result.success) {
    console.log('✅ OAuth authorize endpoint is working correctly');
    console.log('Next steps:');
    console.log('1. Open the Google OAuth URL in a browser');
    console.log('2. Complete the Google authorization flow');
    console.log('3. Test the Drive discovery endpoint after authorization');
    console.log('4. Test the Drive files endpoint after authorization');
  } else {
    console.log('❌ OAuth authorize endpoint is not working');
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
