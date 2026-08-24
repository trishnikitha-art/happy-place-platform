/**
 * Check Specific Media ID in Production KV
 */

const PRODUCTION_KV_URL = 'https://needed-mastodon-82399.upstash.io';
const PRODUCTION_KV_TOKEN = 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const MEDIA_ID = '2a1d4ae6e3b81282259174af113bac3c';

async function checkMediaId() {
  console.log('=== CHECKING MEDIA ID IN PRODUCTION KV ===\n');
  console.log(`[CHECK] Media ID: ${MEDIA_ID}`);
  console.log(`[CHECK] Target KV: ${PRODUCTION_KV_URL}\n`);
  
  const key = `media:${MEDIA_ID}`;
  
  try {
    const response = await fetch(`${PRODUCTION_KV_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
      },
    });
    
    console.log(`[CHECK] Response status: ${response.status}`);
    console.log(`[CHECK] Response OK: ${response.ok}`);
    
    const data = await response.json();
    console.log(`[CHECK] Has result: ${!!data.result}`);
    
    if (data.result) {
      const media = typeof data.result === 'string' 
        ? JSON.parse(data.result) 
        : data.result;
      
      console.log(`[CHECK] Media record:`, JSON.stringify(media, null, 2));
    } else {
      console.log(`[CHECK] Media ID not found in KV`);
    }
    
  } catch (error) {
    console.error(`[CHECK] Error: ${error.message}`);
  }
}

checkMediaId();
