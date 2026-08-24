/**
 * Test Drive File Matching Logic
 */

const PRODUCTION_KV_URL = 'https://needed-mastodon-82399.upstash.io';
const PRODUCTION_KV_TOKEN = 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

const DRAGGED_FILE_ID = '1A7eiHXERSZ-7eq8Hdl0F6P67DZM_qVda';
const SHARED_DRIVE_ID = '0ALeA98MLc-s_Uk9PVA';

async function listMediaIds() {
  const response = await fetch(`${PRODUCTION_KV_URL}/keys/media:*`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
    },
  });
  
  const data = await response.json();
  return data.result.map((key) => key.replace('media:', ''));
}

async function getMedia(mediaId) {
  const key = `media:${mediaId}`;
  const response = await fetch(`${PRODUCTION_KV_URL}/get/${key}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
    },
  });
  
  const data = await response.json();
  if (!data.result) return null;
  
  return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
}

async function testDriveFileMatching() {
  console.log('=== TESTING DRIVE FILE MATCHING ===\n');
  console.log(`[MATCH] Dragged Drive file ID: ${DRAGGED_FILE_ID}`);
  console.log(`[MATCH] Shared Drive ID: ${SHARED_DRIVE_ID}\n`);
  
  const mediaIds = await listMediaIds();
  console.log(`[MATCH] Checking ${mediaIds.length} media records for match\n`);
  
  for (const mediaId of mediaIds) {
    const media = await getMedia(mediaId);
    
    if (media && media.source === 'local' && media.lifecycleState === 'published') {
      const assetDriveId = media.provenance?.august3_driveId;
      const driveCanonical = media.provenance?.drive_canonical;
      
      // Match both fileId and sharedDriveId for shared files
      if (SHARED_DRIVE_ID) {
        if (assetDriveId === DRAGGED_FILE_ID && driveCanonical === true) {
          console.log(`[MATCH] ✓ FOUND MATCH!`);
          console.log(`[MATCH]   Media ID: ${media.id}`);
          console.log(`[MATCH]   Filename: ${media.filename}`);
          console.log(`[MATCH]   august3_driveId: ${assetDriveId}`);
          console.log(`[MATCH]   drive_canonical: ${driveCanonical}`);
          console.log(`[MATCH]   lifecycleState: ${media.lifecycleState}`);
          console.log(`[MATCH]   source: ${media.source}`);
          return { found: true, media };
        }
      }
      // Match fileId only for non-shared files
      else {
        if (assetDriveId === DRAGGED_FILE_ID && driveCanonical === true) {
          console.log(`[MATCH] ✓ FOUND MATCH!`);
          console.log(`[MATCH]   Media ID: ${media.id}`);
          console.log(`[MATCH]   Filename: ${media.filename}`);
          console.log(`[MATCH]   august3_driveId: ${assetDriveId}`);
          console.log(`[MATCH]   drive_canonical: ${driveCanonical}`);
          return { found: true, media };
        }
      }
    }
  }
  
  console.log(`[MATCH] ✗ NO MATCH FOUND`);
  console.log(`[MATCH]   This will trigger materialization`);
  return { found: false };
}

testDriveFileMatching();
