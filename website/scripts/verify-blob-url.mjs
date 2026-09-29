/**
 * Verify Blob URL Accessibility
 * 
 * Checks if the Blob URLs for the malformed record are accessible.
 */

async function main() {
  console.log('[VERIFY BLOB URL] START', {
    timestamp: new Date().toISOString(),
  });

  const originalUrl = 'https://8zci9xnviilmi6qj.public.blob.vercel-storage.com/07c0eae184dc5a375f943a3ac2b67e95-original-07c0eae184dc.jpg';
  
  console.log('[VERIFY] Checking Blob URL:', originalUrl);

  try {
    const response = await fetch(originalUrl, { method: 'HEAD' });
    
    console.log('[VERIFY] Response:', {
      status: response.status,
      statusText: response.statusText,
    });

    if (response.ok) {
      console.log('[VERIFY] SUCCESS: Blob URL is accessible');
    } else {
      console.error('[VERIFY] FAIL: Blob URL returned error');
    }
  } catch (error) {
    console.error('[VERIFY] FAIL: Blob URL fetch error:', error.message);
  }

  console.log('[VERIFY BLOB URL] COMPLETE');
}

main();
