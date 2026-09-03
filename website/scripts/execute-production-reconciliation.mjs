/**
 * Production Media Reconciliation Script
 * 
 * This script executes media reconciliation against production.
 * 
 * INSTRUCTIONS:
 * 1. Ensure you have a valid Workbench session cookie
 * 2. Run this script from the website directory
 * 3. The script will call the production reconciliation endpoint
 * 
 * AUTHENTICATION:
 * - The reconciliation endpoint requires Workbench authentication
 * - You must be logged into the Workbench at https://happyplacecarpentry.com/admin
 * - The script uses the production endpoint with your session cookie
 * 
 * For production reconciliation:
 * node scripts/execute-production-reconciliation.mjs
 */

const PRODUCTION_ENDPOINT = 'https://happyplacecarpentry.com/api/admin/diagnostic/reconcile-static-media';

async function executeProductionReconciliation() {
  console.log('[PRODUCTION_RECONCILIATION] Starting production media reconciliation...');
  console.log('[PRODUCTION_RECONCILIATION] Endpoint:', PRODUCTION_ENDPOINT);
  
  try {
    const response = await fetch(PRODUCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: You'll need to provide a valid session cookie
        // This script assumes you have a Workbench session
      },
    });
    
    if (!response.ok) {
      console.error('[PRODUCTION_RECONCILIATION] Request failed:', response.status, response.statusText);
      const error = await response.text();
      console.error('[PRODUCTION_RECONCILIATION] Error details:', error);
      
      if (response.status === 401) {
        console.log('[PRODUCTION_RECONCILIATION] Authentication required.');
        console.log('[PRODUCTION_RECONCILIATION] Please log into the Workbench at:');
        console.log('[PRODUCTION_RECONCILIATION] https://happyplacecarpentry.com/admin');
      }
      return;
    }
    
    const result = await response.json();
    console.log('[PRODUCTION_RECONCILIATION] Reconciliation completed:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.verdict === 'SUCCESS') {
      console.log('[PRODUCTION_RECONCILIATION] ✅ SUCCESS');
      console.log('[PRODUCTION_RECONCILIATION] Summary:');
      console.log(`  - Total canonical records: ${result.evidence.totalCanonical}`);
      console.log(`  - Repaired: ${result.evidence.repaired}`);
      console.log(`  - Preserved: ${result.evidence.preserved}`);
      console.log(`  - Failed: ${result.evidence.failed}`);
      console.log('[PRODUCTION_RECONCILIATION] Classification:', result.evidence.classification);
    } else {
      console.log('[PRODUCTION_RECONCILIATION] ❌ FAILED');
      console.log('[PRODUCTION_RECONCILIATION] Errors:', result.evidence?.errors);
    }
    
  } catch (error) {
    console.error('[PRODUCTION_RECONCILIATION] Script failed:', error);
  }
}

// Run the reconciliation
executeProductionReconciliation();
