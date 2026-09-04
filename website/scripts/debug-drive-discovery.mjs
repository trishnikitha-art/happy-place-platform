/**
 * Debug Drive Discovery - Get actual production error
 * 
 * This script calls the production discovery endpoint and captures the exact error
 */

const SESSION_COOKIE = process.env.WORKBENCH_SESSION_COOKIE;
const PRODUCTION_ENDPOINT = 'https://happy-place-platform.vercel.app/api/drive/discovery';

async function debugDriveDiscovery() {
  console.log('[DRIVE_DISCOVERY_DEBUG] Starting production Drive discovery debug...');
  console.log('[DRIVE_DISCOVERY_DEBUG] Endpoint:', PRODUCTION_ENDPOINT);
  
  if (!SESSION_COOKIE) {
    console.error('[DRIVE_DISCOVERY_DEBUG] ERROR: WORKBENCH_SESSION_COOKIE not set');
    process.exit(1);
  }
  
  try {
    console.log('[DRIVE_DISCOVERY_DEBUG] Testing discovery endpoint...');
    const response = await fetch(PRODUCTION_ENDPOINT, {
      method: 'GET',
      headers: {
        'Cookie': `workbench_session_id=${SESSION_COOKIE}`,
      },
    });
    
    console.log('[DRIVE_DISCOVERY_DEBUG] Response status:', response.status);
    console.log('[DRIVE_DISCOVERY_DEBUG] Response statusText:', response.statusText);
    
    const contentType = response.headers.get('content-type');
    console.log('[DRIVE_DISCOVERY_DEBUG] Content-Type:', contentType);
    
    const responseText = await response.text();
    console.log('[DRIVE_DISCOVERY_DEBUG] Response body:', responseText);
    
    if (response.ok) {
      try {
        const data = JSON.parse(responseText);
        console.log('[DRIVE_DISCOVERY_DEBUG] Parsed response:', JSON.stringify(data, null, 2));
        
        if (data.myDrive) {
          console.log('[DRIVE_DISCOVERY_DEBUG] ✅ My Drive found:', data.myDrive.name);
        } else {
          console.log('[DRIVE_DISCOVERY_DEBUG] ❌ My Drive not found');
        }
        
        if (data.sharedDrives && data.sharedDrives.length > 0) {
          console.log('[DRIVE_DISCOVERY_DEBUG] ✅ Shared Drives found:', data.sharedDrives.length);
          data.sharedDrives.forEach(drive => {
            console.log('[DRIVE_DISCOVERY_DEBUG]   -', drive.name, '(', drive.id, ')');
          });
        } else {
          console.log('[DRIVE_DISCOVERY_DEBUG] ❌ No Shared Drives found');
        }
      } catch (parseError) {
        console.log('[DRIVE_DISCOVERY_DEBUG] Failed to parse JSON:', parseError.message);
      }
    } else {
      console.log('[DRIVE_DISCOVERY_DEBUG] ❌ Discovery failed');
      
      if (response.status === 401) {
        console.log('[DRIVE_DISCOVERY_DEBUG] Authentication failure');
      } else if (response.status === 500) {
        console.log('[DRIVE_DISCOVERY_DEBUG] Server error - this is the target');
      }
    }
    
  } catch (error) {
    console.error('[DRIVE_DISCOVERY_DEBUG] Network error:', error.message);
  }
}

debugDriveDiscovery();