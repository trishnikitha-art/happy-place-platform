/**
 * Test Blob Store Identity
 * 
 * Tests whether the production deployment's Blob store matches
 * the store ID in existing media URLs (8zci9xnviilmi6qj)
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

async function getMediaAuthority(cookie) {
  console.log('🔍 Getting Media Authority to sample Blob URLs');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/workbench/media-authority`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'list' }),
    });
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

function extractStoreIdFromBlobUrl(blobUrl) {
  // Blob URL format: https://[storeId].public.blob.vercel-storage.com/[path]
  const match = blobUrl.match(/https:\/\/([^.]+)\.public\.blob\.vercel-storage\.com/);
  return match ? match[1] : null;
}

async function main() {
  console.log('🚀 Blob Store Identity Test');
  console.log('='.repeat(50));
  
  // Login
  const loginResult = await loginWorkbench();
  
  if (!loginResult.success) {
    console.log('❌ Workbench login failed');
    return;
  }
  
  // Get media authority to sample Blob URLs
  console.log('\n--- Step 1: Sample Blob URLs from Media Authority ---');
  const authority = await getMediaAuthority(loginResult.setCookie);
  
  if (!authority.media || authority.media.length === 0) {
    console.log('❌ No media records found');
    return;
  }
  
  // Extract store IDs from Blob URLs
  const storeIds = new Set();
  const blobSample = [];
  
  for (const media of authority.media.slice(0, 10)) {
    if (media.variants?.original && media.storage === 'blob') {
      const storeId = extractStoreIdFromBlobUrl(media.variants.original);
      if (storeId) {
        storeIds.add(storeId);
        blobSample.push({
          mediaId: media.id,
          filename: media.filename,
          storeId,
          url: media.variants.original,
        });
      }
    }
  }
  
  console.log('\n--- Step 3: Analyze Store Identity ---');
  console.log('Unique store IDs found:', Array.from(storeIds));
  console.log('\nSample Blob URLs:');
  blobSample.forEach((sample, i) => {
    console.log(`  ${i + 1}. ${sample.filename}`);
    console.log(`     Store ID: ${sample.storeId}`);
    console.log(`     URL: ${sample.url}`);
  });
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  const expectedStoreId = '8zci9xnviilmi6qj';
  
  if (storeIds.size === 0) {
    console.log('❌ No Blob URLs found in media records');
  } else if (storeIds.size === 1 && storeIds.has(expectedStoreId)) {
    console.log('✅ All media records point to expected store:', expectedStoreId);
    console.log('The current deployment should have BLOB_STORE_ID or credentials matching this store.');
  } else if (storeIds.size === 1) {
    const actualStoreId = Array.from(storeIds)[0];
    console.log('⚠️  Media records point to a different store:', actualStoreId);
    console.log('Expected:', expectedStoreId);
    console.log('This indicates a Blob store migration or configuration mismatch.');
  } else {
    console.log('❌ Media records point to multiple stores:', Array.from(storeIds));
    console.log('This indicates mixed Blob store configuration or migration.');
  }
  
  console.log('\nNext step: Verify the production deployment has BLOB_STORE_ID or BLOB_READ_WRITE_TOKEN matching the store ID in media URLs.');
}

main().catch(console.error);
