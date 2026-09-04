/**
 * Production Media Reconciliation Script
 * 
 * This script executes media reconciliation against production.
 * 
 * INSTRUCTIONS:
 * 1. Ensure you have a valid Workbench session cookie
 * 2. Run this script from the website directory with the session cookie
 * 3. The script will call the production reconciliation endpoint
 * 
 * AUTHENTICATION:
 * - The reconciliation endpoint requires Workbench authentication
 * - You must provide your Workbench session cookie
 * - Usage: WORKBENCH_SESSION_COOKIE=your_cookie node scripts/execute-production-reconciliation.mjs
 * 
 * For production reconciliation:
 * WORKBENCH_SESSION_COOKIE=your_cookie node scripts/execute-production-reconciliation.mjs
 */

const PRODUCTION_ENDPOINT = 'https://happy-place-platform.vercel.app/api/admin/diagnostic/reconcile-static-media';
const SESSION_COOKIE = process.env.WORKBENCH_SESSION_COOKIE;

async function executeProductionReconciliation() {
  console.log('[PRODUCTION_RECONCILIATION] Starting production media reconciliation...');
  console.log('[PRODUCTION_RECONCILIATION] Endpoint:', PRODUCTION_ENDPOINT);
  
  if (!SESSION_COOKIE) {
    console.error('[PRODUCTION_RECONCILIATION] ERROR: WORKBENCH_SESSION_COOKIE environment variable not set');
    console.error('[PRODUCTION_RECONCILIATION] Please set your Workbench session cookie:');
    console.error('[PRODUCTION_RECONCILIATION] WORKBENCH_SESSION_COOKIE=your_cookie node scripts/execute-production-reconciliation.mjs');
    console.error('[PRODUCTION_RECONCILIATION] To get your session cookie:');
    console.error('[PRODUCTION_RECONCILIATION] 1. Log into https://happy-place-platform.vercel.app/workbench/login');
    console.error('[PRODUCTION_RECONCILIATION] 2. Open browser DevTools → Application → Cookies');
    console.error('[PRODUCTION_RECONCILIATION] 3. Copy the workbench_session_id cookie value');
    process.exit(1);
  }
  
  try {
    const response = await fetch(PRODUCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `workbench_session_id=${SESSION_COOKIE}`,
      },
    });
    
    if (!response.ok) {
      console.error('[PRODUCTION_RECONCILIATION] Request failed:', response.status, response.statusText);
      const error = await response.text();
      console.error('[PRODUCTION_RECONCILIATION] Error details:', error);
      
      if (response.status === 401) {
        console.log('[PRODUCTION_RECONCILIATION] Authentication required.');
        console.log('[PRODUCTION_RECONCILIATION] Please log into the Workbench at:');
        console.log('[PRODUCTION_RECONCILIATION] https://happy-place-platform.vercel.app/workbench/login');
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
