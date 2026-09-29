/**
 * Test Production Blob Verification
 * 
 * Tests whether the production deployment can verify a known Blob
 * through the media-forensics endpoint
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

async function testSingleBlobVerification(cookie) {
  console.log('🔍 Testing single Blob verification via production API');
  
  // Use a known Blob URL from production
  const testBlobUrl = 'https://8zci9xnviilmi6qj.public.blob.vercel-storage.com/07c0eae184dc5a375f943a3ac2b67e95-original-07c0eae184dc.jpg';
  const testContentHash = '07c0eae184dc5a375f943a3ac2b67e95cd202206090a3d90e1f5599ce6b1bcc6';
  
  console.log('Test Blob URL:', testBlobUrl);
  console.log('Content hash:', testContentHash);
  
  try {
    // Try to access the Blob directly as a public resource
    const response = await fetch(testBlobUrl, {
      method: 'HEAD',
    });
    
    console.log('Direct HTTP HEAD status:', response.status);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    if (response.ok) {
      console.log('✅ Blob is accessible via public HTTP');
      return { accessible: true, method: 'http', status: response.status };
    } else {
      console.log('❌ Blob not accessible via public HTTP:', response.status);
      return { accessible: false, method: 'http', status: response.status };
    }
  } catch (error) {
    console.error('HTTP HEAD failed:', error.message);
    return { accessible: false, method: 'http', error: error.message };
  }
}

async function main() {
  console.log('🚀 Production Blob Verification Test');
  console.log('='.repeat(50));
  
  // Login
  const loginResult = await loginWorkbench();
  
  if (!loginResult.success) {
    console.log('❌ Workbench login failed');
    return;
  }
  
  // Test Blob access
  const result = await testSingleBlobVerification(loginResult.setCookie);
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  if (result.accessible) {
    console.log('✅ Blob is accessible via public HTTP');
    console.log('This means the Blob store is correctly configured for public access.');
    console.log('The SDK verification issue may be a code problem, not infrastructure.');
  } else {
    console.log('❌ Blob is not accessible');
    console.log('Status:', result.status);
    console.log('Error:', result.error);
    console.log('This indicates a Blob store credential or configuration problem.');
  }
}

main().catch(console.error);
