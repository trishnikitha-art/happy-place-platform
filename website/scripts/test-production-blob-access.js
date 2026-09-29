/**
 * Test Production Blob Access
 * 
 * Tests whether the production deployment can retrieve a known Blob object
 * through the verification API to diagnose the 403 errors
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

async function testSingleBlobVerification(cookie, mediaId, blobUrl, contentHash) {
  console.log(`\n🔍 Testing Blob verification for ${mediaId}`);
  console.log('Blob URL:', blobUrl);
  console.log('Content hash:', contentHash);
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/workbench/media-forensics`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'verifySingleBlob',
        mediaId,
        blobUrl,
        contentHash,
      }),
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

async function main() {
  console.log('🚀 Production Blob Access Test');
  console.log('='.repeat(50));
  
  // Login
  const loginResult = await loginWorkbench();
  
  if (!loginResult.success) {
    console.log('❌ Workbench login failed');
    return;
  }
  
  // Test a known Blob from production
  const testMediaId = '07c0eae184dc5a375f943a3ac2b67e95';
  const testBlobUrl = 'https://8zci9xnviilmi6qj.public.blob.vercel-storage.com/07c0eae184dc5a375f943a3ac2b67e95-original-07c0eae184dc.jpg';
  const testContentHash = '07c0eae184dc5a375f943a3ac2b67e95cd202206090a3d90e1f5599ce6b1bcc6';
  
  const result = await testSingleBlobVerification(
    loginResult.setCookie,
    testMediaId,
    testBlobUrl,
    testContentHash
  );
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  if (result.error) {
    console.log('❌ Production cannot access Blob - infrastructure issue');
    console.log('Error:', result.error);
  } else if (result.success) {
    console.log('✅ Production can access Blob - verification works');
  } else {
    console.log('⚠️  Production Blob access failed - check credentials/store');
  }
}

main().catch(console.error);
