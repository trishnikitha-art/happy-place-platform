/**
 * Test script for media reconciliation endpoint
 * 
 * This script tests the reconciliation endpoint in development mode
 * using the DRIVE_AUTH_BYPASS mechanism for authentication.
 */

const endpoint = 'http://localhost:3000/api/admin/diagnostic/reconcile-static-media';

async function testReconciliation() {
  console.log('[TEST_RECONCILIATION] Starting reconciliation test...');
  
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      console.error('[TEST_RECONCILIATION] Request failed:', response.status, response.statusText);
      const error = await response.text();
      console.error('[TEST_RECONCILIATION] Error details:', error);
      return;
    }
    
    const result = await response.json();
    console.log('[TEST_RECONCILIATION] Reconciliation completed:', JSON.stringify(result, null, 2));
    
    if (result.verdict === 'SUCCESS') {
      console.log('[TEST_RECONCILIATION] ✅ SUCCESS');
      console.log('[TEST_RECONCILIATION] Evidence:', result.evidence);
    } else {
      console.log('[TEST_RECONCILIATION] ❌ FAILED');
      console.log('[TEST_RECONCILIATION] Errors:', result.evidence?.errors);
    }
    
  } catch (error) {
    console.error('[TEST_RECONCILIATION] Test failed:', error);
  }
}

// Run the test
testReconciliation();
