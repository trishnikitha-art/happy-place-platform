/**
 * Execute Quarantine of Malformed Production Media Record
 * 
 * This script quarantines the malformed production media record 07c0eae184dc5a375f943a3ac2b67e95
 * which has storage: undefined and is being rejected by the public media gate.
 * 
 * INSTRUCTIONS:
 * 1. Ensure you have a valid Workbench session cookie
 * 2. Run this script from the website directory with the session cookie
 * 3. The script will call the production quarantine endpoint
 * 
 * AUTHENTICATION:
 * - The quarantine endpoint requires Workbench authentication
 * - You must provide your Workbench session cookie
 * - Usage: WORKBENCH_SESSION_COOKIE=your_cookie node scripts/execute-quarantine.mjs
 * 
 * The quarantine endpoint:
 * - Requires Workbench authentication
 * - Requires explicit confirmation (confirm: true)
 * - Media ID must be in QUARANTINE_ALLOWLIST (fail-closed)
 * - Logs all quarantine actions for audit trail
 * - Does NOT delete assignments or blobs - only the malformed KV record
 * 
 * For production quarantine:
 * WORKBENCH_SESSION_COOKIE=your_cookie node scripts/execute-quarantine.mjs
 */

const PRODUCTION_ENDPOINT = 'https://happy-place-platform.vercel.app/api/admin/diagnostic/quarantine-media';
const SESSION_COOKIE = process.env.WORKBENCH_SESSION_COOKIE;
const TARGET_MEDIA_ID = '07c0eae184dc5a375f943a3ac2b67e95';

async function executeQuarantine() {
  console.log('[QUARANTINE] Starting quarantine of malformed production media record...');
  console.log('[QUARANTINE] Endpoint:', PRODUCTION_ENDPOINT);
  console.log('[QUARANTINE] Target media ID:', TARGET_MEDIA_ID);
  
  if (!SESSION_COOKIE) {
    console.error('[QUARANTINE] ERROR: WORKBENCH_SESSION_COOKIE environment variable not set');
    console.error('[QUARANTINE] Please set your Workbench session cookie:');
    console.error('[QUARANTINE] WORKBENCH_SESSION_COOKIE=your_cookie node scripts/execute-quarantine.mjs');
    console.error('[QUARANTINE] To get your session cookie:');
    console.error('[QUARANTINE] 1. Log into https://happy-place-platform.vercel.app/workbench/login');
    console.error('[QUARANTINE] 2. Open browser DevTools → Application → Cookies');
    console.error('[QUARANTINE] 3. Copy the workbench_session_id cookie value');
    process.exit(1);
  }
  
  try {
    const response = await fetch(PRODUCTION_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `workbench_session_id=${SESSION_COOKIE}`,
      },
      body: JSON.stringify({
        mediaId: TARGET_MEDIA_ID,
        confirm: true,
      }),
    });
    
    if (!response.ok) {
      console.error('[QUARANTINE] Request failed:', response.status, response.statusText);
      const error = await response.text();
      console.error('[QUARANTINE] Error details:', error);
      
      if (response.status === 401) {
        console.log('[QUARANTINE] Authentication required.');
        console.log('[QUARANTINE] Please log into the Workbench at:');
        console.log('[QUARANTINE] https://happy-place-platform.vercel.app/workbench/login');
      } else if (response.status === 403) {
        console.log('[QUARANTINE] Media ID not in quarantine allowlist.');
        console.log('[QUARANTINE] This endpoint only accepts known problematic records.');
      }
      return;
    }
    
    const result = await response.json();
    console.log('[QUARANTINE] Quarantine completed:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('[QUARANTINE] ✅ SUCCESS');
      console.log('[QUARANTINE] Media ID:', result.mediaId);
      console.log('[QUARANTINE] Action:', result.action);
      console.log('[QUARANTINE] Previous state:');
      console.log(`  - storage: ${result.previousState.storage}`);
      console.log(`  - lifecycleState: ${result.previousState.lifecycleState}`);
      console.log(`  - source: ${result.previousState.source}`);
      console.log('[QUARANTINE] Timestamp:', result.timestamp);
      console.log('[QUARANTINE] The malformed record has been removed from production KV.');
      console.log('[QUARANTINE] Public media gate should no longer reject this ID.');
    } else {
      console.log('[QUARANTINE] ❌ FAILED');
      console.log('[QUARANTINE] Error:', result.error);
    }
    
  } catch (error) {
    console.error('[QUARANTINE] Script failed:', error);
  }
}

// Run the quarantine
executeQuarantine();
