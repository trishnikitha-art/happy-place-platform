/**
 * Rematerialize Incomplete Media Assets
 *
 * This script calls the /api/admin/media/rematerialize endpoint to fix
 * incomplete media assets that are blocking deployment.
 *
 * Usage:
 *   node scripts/rematerialize-incomplete.mjs [--execute] [--verbose]
 *
 * Options:
 *   --execute: Apply changes (default is dry-run)
 *   --verbose: Show detailed output
 *
 * Authentication:
 *   Requires WORKBENCH_SESSION_COOKIE environment variable or manual auth
 */

const API_BASE = process.env.VERCEL_URL 
  ? `https://${process.env.VERCEL_URL}` 
  : 'https://happy-place-platform.vercel.app';

const REMATERIALIZE_ENDPOINT = `${API_BASE}/api/admin/media/rematerialize`;

async function rematerializeMedia({ dryRun = true, verbose = false }) {
  console.log('[REMATERIALIZE] Starting media rematerialization...');
  console.log('[REMATERIALIZE] Endpoint:', REMATERIALIZE_ENDPOINT);
  console.log('[REMATERIALIZE] Dry run:', dryRun);
  console.log('[REMATERIALIZE] Verbose:', verbose);
  console.log('');

  const requestBody = JSON.stringify({ dryRun });

  const headers = {
    'Content-Type': 'application/json',
  };

  // Add Workbench session cookie if available
  const sessionCookie = process.env.WORKBENCH_SESSION_COOKIE;
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
    console.log('[REMATERIALIZE] Using session cookie for authentication');
  } else {
    console.warn('[REMATERIALIZE] No WORKBENCH_SESSION_COOKIE - request may fail authentication');
    console.warn('[REMATERIALIZE] Set environment variable or run from authenticated browser context');
  }

  try {
    const response = await fetch(REMATERIALIZE_ENDPOINT, {
      method: 'POST',
      headers,
      body: requestBody,
    });

    const data = await response.json();

    if (response.ok) {
      console.log('[REMATERIALIZE] SUCCESS');
      console.log('[REMATERIALIZE] Report:', JSON.stringify(data.report, null, 2));

      if (verbose) {
        console.log('');
        console.log('[REMATERIALIZE] DETAILED REPORT:');
        console.log('- Total records scanned:', data.report.totalRecords);
        console.log('- Skipped records:', data.report.skippedRecords);
        console.log('- Successful rematerializations:', data.report.successfulRematerializations.length);
        console.log('- Failed rematerializations:', data.report.failedRematerializations.length);
        console.log('- Missing source bytes:', data.report.missingSourceBytes.length);
      }

      return data;
    } else {
      console.error('[REMATERIALIZE] FAILED');
      console.error('[REMATERIALIZE] Status:', response.status);
      console.error('[REMATERIALIZE] Response:', data);
      throw new Error(`Rematerialization failed with status ${response.status}: ${data.error || data.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('[REMATERIALIZE] REQUEST ERROR:', error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--execute');
  const verbose = args.includes('--verbose');

  try {
    console.log('=== MEDIA REMATERIALIZATION ===');
    console.log('');
    
    if (dryRun) {
      console.log('DRY RUN MODE - No changes will be made');
      console.log('Add --execute flag to apply changes');
      console.log('');
    }

    const result = await rematerializeMedia({ dryRun, verbose });
    
    console.log('');
    console.log('=== REMATERIALIZATION COMPLETE ===');
    
    if (dryRun) {
      console.log('');
      console.log('To apply these changes, run:');
      console.log('  node scripts/rematerialize-incomplete.mjs --execute');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('=== REMATERIALIZATION FAILED ===');
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { rematerializeMedia };
