/**
 * Test Blob Verification After SDK Fix
 * 
 * Tests whether the Blob verification fix resolved the 403 errors
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
  console.log('🔍 Getting Media Authority');
  
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
    console.log('Status:', response.status);
    console.log('Media count:', data.media?.length);
    
    return data;
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

async function runMediaForensics(cookie) {
  console.log('🔍 Running Media Forensics');
  
  try {
    const response = await fetch(`${PRODUCTION_URL}/api/workbench/media-forensics`, {
      method: 'POST',
      headers: {
        'Cookie': cookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'forensicClassification' }),
    });
    
    const data = await response.json();
    console.log('Status:', response.status);
    console.log('Response keys:', Object.keys(data));
    
    // Response is wrapped in { forensics: { totalRecords, records: [] } }
    const forensicsData = data.forensics || data;
    
    if (!forensicsData.records) {
      console.log('No records array in response');
      return { error: 'No records in response' };
    }
    
    console.log('Total records:', forensicsData.totalRecords);
    
    // Count malformed vs valid
    const malformed = forensicsData.records.filter(r => r.classification === 'malformedPublished').length;
    const valid = forensicsData.records.filter(r => r.classification === 'validPublished').length;
    
    console.log('Valid published:', valid);
    console.log('Malformed published:', malformed);
    
    // Show first few malformed records for diagnosis
    const malformedRecords = forensicsData.records.filter(r => r.classification === 'malformedPublished');
    if (malformedRecords.length > 0) {
      console.log('\nFirst 3 malformed records:');
      malformedRecords.slice(0, 3).forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.mediaId} - ${r.classification}`);
        console.log(`     Storage: ${r.storage}, Source: ${r.source}`);
        if (r.blobVerification) {
          console.log(`     Blob verification: ${JSON.stringify(r.blobVerification)}`);
        }
      });
    }
    
    return { totalRecords: forensicsData.totalRecords, validPublished: valid, malformedPublished: malformed, records: forensicsData.records };
  } catch (error) {
    console.error('Error:', error.message);
    return { error: error.message };
  }
}

async function main() {
  console.log('🚀 Blob Verification Test After SDK Fix');
  console.log('='.repeat(50));
  
  // Login
  const loginResult = await loginWorkbench();
  
  if (!loginResult.success) {
    console.log('❌ Workbench login failed');
    return;
  }
  
  // Get Media Authority
  console.log('\n--- Step 1: Get Media Authority ---');
  const authority = await getMediaAuthority(loginResult.setCookie);
  
  // Run Media Forensics
  console.log('\n--- Step 2: Run Media Forensics ---');
  const forensics = await runMediaForensics(loginResult.setCookie);
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  console.log('Total records:', forensics.totalRecords);
  console.log('Valid published:', forensics.validPublished);
  console.log('Malformed published:', forensics.malformedPublished);
  
  console.log('\nBefore fix: 19 malformed published');
  console.log(`After fix: ${forensics.malformedPublished} malformed published`);
  
  if (forensics.malformedPublished < 19) {
    console.log('✅ Malformed published count decreased - Blob verification fix worked');
  } else if (forensics.malformedPublished === 19) {
    console.log('⚠️  Malformed published count unchanged - may need to verify actual Blob URLs or deployment');
  } else {
    console.log('❌ Malformed published count increased - investigate new issue');
  }
}

main().catch(console.error);
