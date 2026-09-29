/**
 * Workbench Login Test
 * 
 * Tests Workbench authentication
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
    console.log('Status Text:', response.statusText);
    
    const data = await response.json();
    console.log('Response:', data);
    
    if (response.ok && data.success) {
      console.log('✅ Workbench login successful');
      return { success: true, data };
    } else {
      console.log('❌ Workbench login failed');
      return { success: false, error: data.error || 'Unknown error' };
    }
  } catch (error) {
    console.error('Error:', error.message);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Workbench Login Test');
  console.log('='.repeat(50));
  
  const result = await testWorkbenchLogin();
  
  console.log('\n\n' + '='.repeat(50));
  console.log('📊 SUMMARY');
  console.log('='.repeat(50));
  
  if (result.success) {
    console.log('✅ Workbench authentication is working');
  } else {
    console.log('❌ Workbench authentication failed');
    console.log('Error:', result.error);
  }
}

main().catch(console.error);
