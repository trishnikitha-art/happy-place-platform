/**
 * Production Runtime Authority Initialization Script
 * 
 * Automates the Workbench login and runtime authority initialization flow.
 * This script:
 * 1. Authenticates with Workbench using WORKBENCH_PASSWORD
 * 2. Captures the session cookie
 * 3. Calls POST /api/admin/projects/gallery/initialize-all
 * 4. Reports the initialization results
 * 
 * Usage:
 * node scripts/initialize-production-runtime.mjs
 * 
 * Environment variables required:
 * - WORKBENCH_PASSWORD: Production Workbench password
 * - SITE_URL: Production site URL (default: https://happyplacecarpentry.com)
 */

const WORKBENCH_PASSWORD = process.env.WORKBENCH_PASSWORD;
const SITE_URL = process.env.SITE_URL || 'https://happyplacecarpentry.com';

if (!WORKBENCH_PASSWORD) {
  console.error('ERROR: WORKBENCH_PASSWORD environment variable is required');
  console.error('Set it with: export WORKBENCH_PASSWORD=your-password');
  process.exit(1);
}

async function main() {
  console.log('[INITIALIZE PRODUCTION] START', {
    siteUrl: SITE_URL,
    timestamp: new Date().toISOString(),
  });

  try {
    // Step 1: Authenticate with Workbench
    console.log('[STEP 1] Authenticating with Workbench...');
    const loginResponse = await fetch(`${SITE_URL}/api/workbench/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password: WORKBENCH_PASSWORD }),
    });

    if (!loginResponse.ok) {
      const error = await loginResponse.text();
      console.error('[STEP 1] AUTHENTICATION FAILED', {
        status: loginResponse.status,
        error,
      });
      process.exit(1);
    }

    const loginData = await loginResponse.json();
    console.log('[STEP 1] AUTHENTICATION SUCCESS', loginData);

    // Step 2: Extract session cookie from response
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('[STEP 2] NO SESSION COOKIE');
      process.exit(1);
    }

    // Parse the session ID from the cookie
    const sessionMatch = setCookieHeader.match(/workbench_session_id=([^;]+)/);
    if (!sessionMatch) {
      console.error('[STEP 2] CANNOT PARSE SESSION ID', { setCookieHeader });
      process.exit(1);
    }

    const sessionId = sessionMatch[1];
    console.log('[STEP 2] SESSION CAPTURED', { sessionId });

    // Step 3: Call initialize-all with session cookie
    console.log('[STEP 3] Initializing runtime authority for all projects...');
    const initResponse = await fetch(`${SITE_URL}/api/admin/projects/gallery/initialize-all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `workbench_session_id=${sessionId}`,
      },
    });

    if (!initResponse.ok) {
      const error = await initResponse.text();
      console.error('[STEP 3] INITIALIZATION FAILED', {
        status: initResponse.status,
        error,
      });
      process.exit(1);
    }

    const initData = await initResponse.json();
    console.log('[STEP 3] INITIALIZATION SUCCESS', initData);

    // Step 4: Report results
    console.log('[INITIALIZE PRODUCTION] COMPLETE', {
      totalProjects: initData.results.totalProjects,
      initialized: initData.results.initialized,
      skipped: initData.results.skipped,
      failed: initData.results.failed,
      errors: initData.results.errors,
      message: initData.message,
      timestamp: new Date().toISOString(),
    });

    if (initData.results.failed > 0) {
      console.error('[INITIALIZE PRODUCTION] PARTIAL FAILURE', {
        failedProjects: initData.results.errors,
      });
      process.exit(1);
    }

    console.log('[INITIALIZE PRODUCTION] SUCCESS - All projects initialized successfully');
  } catch (error) {
    console.error('[INITIALIZE PRODUCTION] ERROR', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

main();
