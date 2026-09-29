/**
 * Test Gallery GET Endpoint
 * 
 * Tests GET /api/admin/projects/gallery?projectId={projectId}
 * to verify runtime authority is initialized and accessible.
 * 
 * Usage:
 * node scripts/test-gallery-get.mjs <projectId>
 */

const SITE_URL = process.env.SITE_URL || 'https://happyplacecarpentry.com';
const WORKBENCH_PASSWORD = process.env.WORKBENCH_PASSWORD || 'happy-place-carpentry-admin';

const projectId = process.argv[2];
if (!projectId) {
  console.error('ERROR: projectId is required');
  console.error('Usage: node scripts/test-gallery-get.mjs <projectId>');
  process.exit(1);
}

async function main() {
  console.log('[TEST GALLERY GET] START', {
    siteUrl: SITE_URL,
    projectId,
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

    // Step 2: Extract session cookie
    const setCookieHeader = loginResponse.headers.get('set-cookie');
    if (!setCookieHeader) {
      console.error('[STEP 2] NO SESSION COOKIE');
      process.exit(1);
    }

    const sessionMatch = setCookieHeader.match(/workbench_session_id=([^;]+)/);
    if (!sessionMatch) {
      console.error('[STEP 2] CANNOT PARSE SESSION ID');
      process.exit(1);
    }

    const sessionId = sessionMatch[1];
    console.log('[STEP 2] SESSION CAPTURED', { sessionId });

    // Step 3: Call Gallery GET
    console.log('[STEP 3] Calling Gallery GET...');
    const galleryResponse = await fetch(`${SITE_URL}/api/admin/projects/gallery?projectId=${projectId}`, {
      method: 'GET',
      headers: {
        'Cookie': `workbench_session_id=${sessionId}`,
      },
    });

    console.log('[STEP 3] GALLERY GET RESPONSE', {
      status: galleryResponse.status,
      ok: galleryResponse.ok,
    });

    if (!galleryResponse.ok) {
      const error = await galleryResponse.text();
      console.error('[STEP 3] GALLERY GET FAILED', {
        status: galleryResponse.status,
        error,
      });
      process.exit(1);
    }

    const galleryData = await galleryResponse.json();
    console.log('[STEP 3] GALLERY GET SUCCESS', galleryData);

    console.log('[TEST GALLERY GET] COMPLETE', {
      projectId,
      status: galleryResponse.status,
      galleryLength: galleryData.gallery?.length,
      currentRevision: galleryData.currentRevision,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[TEST GALLERY GET] ERROR', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

main();
