/**
 * Runtime Media Reconciliation Script
 *
 * Calls the /api/admin/media/reconcile endpoint to clean up poisoned runtime KV authority.
 * This removes synthetic content identity records and reconciles with canonical static authority.
 *
 * P0 FIX: Use native fetch instead of http module (HTTPS compatible)
 * P0 FIX: Add Workbench authentication support (session cookie or admin token)
 *
 * Usage:
 *   node scripts/reconcile-runtime-media.mjs [--dry-run] [--execute] [--verbose]
 *
 * Options:
 *   --dry-run: Analyze and report without making changes (default)
 *   --execute: Apply changes (requires explicit flag)
 *   --verbose: Show detailed reconciliation output
 *
 * Authentication:
 *   Requires either:
 *   - WORKBENCH_SESSION_COOKIE environment variable (session cookie from Workbench login)
 *   - Or manual execution with browser authentication
 */

const API_BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'http://localhost:3000';

const RECONCILE_ENDPOINT = `${API_BASE}/api/admin/media/reconcile`;

async function reconcileMedia({ dryRun = true, verbose = false }) {
  console.log('[RECONCILE] Starting runtime media reconciliation...');
  console.log('[RECONCILE] Endpoint:', RECONCILE_ENDPOINT);
  console.log('[RECONCILE] Dry run:', dryRun);
  console.log('[RECONCILE] Verbose:', verbose);
  console.log('');

  const requestBody = JSON.stringify({ dryRun });

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add Workbench session cookie if available
  const sessionCookie = process.env.WORKBENCH_SESSION_COOKIE;
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
    console.log('[RECONCILE] Using session cookie for authentication');
  } else {
    console.warn('[RECONCILE] No WORKBENCH_SESSION_COOKIE - request may fail authentication');
    console.warn('[RECONCILE] Set environment variable or run from authenticated browser context');
  }

  try {
    const response = await fetch(RECONCILE_ENDPOINT, {
      method: 'POST',
      headers,
      body: requestBody,
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[RECONCILE] SUCCESS');
      console.log('[RECONCILE] Report:', JSON.stringify(data.report, null, 2));

      if (verbose) {
        console.log('');
        console.log('[RECONCILE] DETAILED REPORT:');
        console.log('- Total records scanned:', data.report.totalRecords);
        console.log('- Synthetic records found:', data.report.syntheticRecords);
        console.log('- Stale records replaced:', data.report.replacedRecords.length);
        console.log('- Valid records preserved:', data.report.validRecords);
        console.log('- DriveReference records preserved:', data.report.driveReferenceRecords);
        console.log('- Incomplete canonical records blocked:', data.report.incompleteCanonicalCount || 0);
        console.log('- Content hash index rebuilt:', data.report.contentHashIndexRebuilt);
        console.log('- Dangling indexes cleaned:', data.report.danglingIndexes.length);
      }

      return data;
    } else {
      console.error('[RECONCILE] FAILED');
      console.error('[RECONCILE] Status:', response.status);
      console.error('[RECONCILE] Response:', data);
      throw new Error(`Reconciliation failed with status ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('[RECONCILE] REQUEST ERROR:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const verbose = args.includes('--verbose');

  try {
    console.log('=== RUNTIME MEDIA RECONCILIATION ===');
    console.log('');
    
    if (dryRun) {
      console.log('DRY RUN MODE - No changes will be made');
      console.log('Add --execute flag to apply changes');
      console.log('');
    }

    const result = await reconcileMedia({ dryRun, verbose });
    
    console.log('');
    console.log('=== RECONCILIATION COMPLETE ===');
    
    if (dryRun) {
      console.log('');
      console.log('To apply these changes, run:');
      console.log('  node scripts/reconcile-runtime-media.mjs --execute');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('=== RECONCILIATION FAILED ===');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { reconcileMedia };
