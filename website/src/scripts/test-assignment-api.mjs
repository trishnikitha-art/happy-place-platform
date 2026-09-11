/**
 * Assignment API Test
 *
 * Tests the assignment API routes directly via HTTP.
 * This avoids module import issues and tests the actual HTTP endpoints.
 *
 * Usage:
 *   node src/scripts/test-assignment-api.mjs
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

async function testAssignmentAPI() {
  console.log('[TEST] Starting assignment API test...\n');
  console.log('[TEST] Base URL:', BASE_URL);

  // Test 1: Check if homepage hero API exists
  console.log('\n[TEST] Step 1: Checking brand hero API...');
  try {
    const response = await fetch(`${BASE_URL}/api/admin/brand/hero`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaId: 'fences-001-hero',
        slotId: 'hero-background',
      }),
    });

    console.log('[TEST] Response status:', response.status);
    const data = await response.json();
    console.log('[TEST] Response data:', JSON.stringify(data, null, 2));

    if (response.status === 401) {
      console.log('[TEST] ⚠️  API requires authentication (expected)');
    } else if (response.status === 200) {
      console.log('[TEST] ✅ API responded successfully');
    } else {
      console.log('[TEST] ⚠️  Unexpected response:', response.status);
    }
  } catch (error) {
    console.error('[TEST] ❌ API request failed:', error.message);
  }

  // Test 2: Check if public homepage resolves
  console.log('\n[TEST] Step 2: Checking public homepage...');
  try {
    const response = await fetch(`${BASE_URL}/`);
    console.log('[TEST] Homepage status:', response.status);
    const html = await response.text();
    
    // Check if hero image is present
    const hasHeroImage = html.includes('hero-background-enhanced.jpg') || 
                        html.includes('FENCE BUILD') ||
                        html.includes('hero.jpeg');
    
    console.log('[TEST] Has hero image:', hasHeroImage);
  } catch (error) {
    console.error('[TEST] ❌ Homepage request failed:', error.message);
  }

  console.log('\n[TEST] Test complete');
}

testAssignmentAPI().catch(error => {
  console.error('[TEST] Unhandled error:', error);
  process.exit(1);
});
