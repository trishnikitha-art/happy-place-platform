/**
 * Runtime Media Reconciliation Script
 *
 * Calls the /api/admin/media/reconcile endpoint to clean up poisoned runtime KV authority.
 * This removes synthetic content identity records and reconciles with canonical static authority.
 *
 * Usage:
 *   node scripts/reconcile-runtime-media.mjs [--dry-run] [--verbose]
 *
 * Options:
 *   --dry-run: Analyze and report without making changes
 *   --verbose: Show detailed reconciliation output
 */

const http = require('http');

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

  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestBody),
      },
    };

    const req = http.request(RECONCILE_ENDPOINT, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          
          if (res.statusCode === 200) {
            console.log('[RECONCILE] SUCCESS');
            console.log('[RECONCILE] Report:', JSON.stringify(response.report, null, 2));
            
            if (verbose) {
              console.log('');
              console.log('[RECONCILE] DETAILED REPORT:');
              console.log('- Total records scanned:', response.report.totalRecords);
              console.log('- Synthetic records found:', response.report.syntheticRecords);
              console.log('- Stale records replaced:', response.report.replacedRecords.length);
              console.log('- Valid records preserved:', response.report.validRecords);
              console.log('- DriveReference records preserved:', response.report.driveReferenceRecords);
              console.log('- Content hash index rebuilt:', response.report.contentHashIndexRebuilt);
              console.log('- Dangling indexes cleaned:', response.report.danglingIndexes.length);
            }
            
            resolve(response);
          } else {
            console.error('[RECONCILE] FAILED');
            console.error('[RECONCILE] Status:', res.statusCode);
            console.error('[RECONCILE] Response:', data);
            reject(new Error(`Reconciliation failed with status ${res.statusCode}`));
          }
        } catch (error) {
          console.error('[RECONCILE] JSON PARSE ERROR:', error);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('[RECONCILE] REQUEST ERROR:', error);
      reject(error);
    });

    req.write(requestBody);
    req.end();
  });
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
