/**
 * Debug Drive Session - Test Drive authentication boundary
 * 
 * This script tests whether the user has a valid Drive OAuth session
 */

const SESSION_COOKIE = process.env.WORKBENCH_SESSION_COOKIE;
const PRODUCTION_ENDPOINT = 'https://happy-place-platform.vercel.app/api/drive/auth/status';

async function debugDriveSession() {
  console.log('[DRIVE_SESSION_DEBUG] Starting Drive session debug...');
  
  if (!SESSION_COOKIE) {
    console.error('[DRIVE_SESSION_DEBUG] ERROR: WORKBENCH_SESSION_COOKIE not set');
    process.exit(1);
  }
  
  try {
    console.log('[DRIVE_SESSION_DEBUG] Testing Drive session status...');
    const response = await fetch(PRODUCTION_ENDPOINT, {
      method: 'GET',
      headers: {
        'Cookie': `workbench_session_id=${SESSION_COOKIE}`,
      },
    });
    
    console.log('[DRIVE_SESSION_DEBUG] Response status:', response.status);
    console.log('[DRIVE_SESSION_DEBUG] Response statusText:', response.statusText);
    
    const responseText = await response.text();
    console.log('[DRIVE_SESSION_DEBUG] Response body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('[DRIVE_SESSION_DEBUG] Parsed response:', JSON.stringify(data, null, 2));
        
        if (data.authenticated) {
          console.log('[DRIVE_SESSION_DEBUG] ✅ Drive session is authenticated');
        } else {
          console.log('[DRIVE_SESSION_DEBUG] ❌ Drive session is NOT authenticated');
          if (data.reason) {
            console.log('[DRIVE_SESSION_DEBUG] Reason:', data.reason);
          }
        }
      } catch (parseError) {
        console.log('[DRIVE_SESSION_DEBUG] Failed to parse JSON:', parseError.message);
      }
    } else {
      console.log('[DRIVE_SESSION_DEBUG] ❌ Session status check failed');
    }
    
  } catch (error) {
    console.error('[DRIVE_SESSION_DEBUG] Network error:', error.message);
  }
}

debugDriveSession();