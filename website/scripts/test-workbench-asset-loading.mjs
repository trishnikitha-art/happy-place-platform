/**
 * Test Workbench Asset Loading Logic
 * 
 * This script simulates the Workbench's loadDynamicMedia() logic
 * to verify that PublishedMediaAsset records are being loaded correctly.
 */

const PRODUCTION_KV_URL = 'https://needed-mastodon-82399.upstash.io';
const PRODUCTION_KV_TOKEN = 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

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

async function getAllServiceCardAssignments() {
  const response = await fetch(`${PRODUCTION_KV_URL}/keys/service-card-assignment:*`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
    },
  });
  
  const data = await response.json();
  const assignments = [];
  
  for (const key of data.result) {
    const getResponse = await fetch(`${PRODUCTION_KV_URL}/get/${key}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PRODUCTION_KV_TOKEN}`,
      },
    });
    
    const getData = await getResponse.json();
    if (getData.result) {
      const assignment = typeof getData.result === 'string' 
        ? JSON.parse(getData.result) 
        : getData.result;
      assignments.push(assignment);
    }
  }
  
  return assignments;
}

async function simulateGetPublishedMediaAssets() {
  console.log('=== SIMULATING getPublishedMediaAssets() ===\n');
  
  const mediaIds = await listMediaIds();
  console.log(`[SIMULATION] Found ${mediaIds.length} media records in KV`);
  
  const assignments = await getAllServiceCardAssignments();
  console.log(`[SIMULATION] Found ${assignments.length} service card assignments\n`);
  
  const mediaAssignments = new Map();
  for (const assignment of assignments) {
    if (!mediaAssignments.has(assignment.mediaId)) {
      mediaAssignments.set(assignment.mediaId, []);
    }
    mediaAssignments.get(assignment.mediaId).push(assignment);
  }
  
  const publishedAssets = [];
  
  for (const mediaId of mediaIds) {
    const media = await getMedia(mediaId);
    
    if (media && media.source === 'local' && media.lifecycleState === 'published') {
      const assetAssignments = mediaAssignments.get(mediaId) || [];
      
      console.log(`[SIMULATION] PublishedMediaAsset: ${mediaId}`);
      console.log(`[SIMULATION]   filename: ${media.filename}`);
      console.log(`[SIMULATION]   august3_driveId: ${media.provenance?.august3_driveId}`);
      console.log(`[SIMULATION]   assignments: ${assetAssignments.length}`);
      
      publishedAssets.push({
        ...media,
        usageSlots: assetAssignments,
      });
    }
  }
  
  console.log(`\n[SIMULATION] Total PublishedMediaAsset records: ${publishedAssets.length}`);
  
  return publishedAssets;
}

async function testDriveFileMatching() {
  console.log('=== TESTING DRIVE FILE MATCHING ===\n');
  
  const publishedAssets = await simulateGetPublishedMediaAssets();
  
  const draggedFileId = '1A7eiHXERSZ-7eq8Hdl0F6P67DZM_qVda';
  const sharedDriveId = '0ALeA98MLc-s_Uk9PVA';
  
  console.log(`[MATCH] Dragged Drive file ID: ${draggedFileId}`);
  console.log(`[MATCH] Shared Drive ID: ${sharedDriveId}\n`);
  
  // Simulate the Workbench matching logic from page.tsx lines 420-431
  const existingAsset = publishedAssets.find(a => {
    const assetDriveId = a.provenance?.august3_driveId;
    const fileId = draggedFileId;
    
    // Match both fileId and sharedDriveId for shared files
    if (sharedDriveId) {
      return assetDriveId === fileId && a.provenance?.drive_canonical === true;
    }
    // Match fileId only for non-shared files
    return assetDriveId === fileId && a.provenance?.drive_canonical === true;
  });
  
  if (existingAsset) {
    console.log(`[MATCH] ✓ FOUND: Drive file already materialized`);
    console.log(`[MATCH]   Media ID: ${existingAsset.id}`);
    console.log(`[MATCH]   Filename: ${existingAsset.filename}`);
    console.log(`[MATCH]   august3_driveId: ${existingAsset.provenance?.august3_driveId}`);
    console.log(`[MATCH]   drive_canonical: ${existingAsset.provenance?.drive_canonical}`);
  } else {
    console.log(`[MATCH] ✗ NOT FOUND: Drive file not in PublishedMediaAsset registry`);
    console.log(`[MATCH]   This will trigger materialization`);
  }
}

testDriveFileMatching();
