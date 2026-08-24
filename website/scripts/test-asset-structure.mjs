/**
 * Test Asset Structure from getPublishedMediaAssets()
 */

const PRODUCTION_KV_URL = 'https://needed-mastodon-82399.upstash.io';
const PRODUCTION_KV_TOKEN = 'gQAAAAAAAUHfAAIgcDI0YjcwZTI3OTE5N2Y0M2VlYjBlOTRkODJlZDUzMWViMg';

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

async function testAssetStructure() {
  console.log('=== TESTING ASSET STRUCTURE ===\n');
  
  const mediaId = '2a1d4ae6e3b81282259174af113bac3c';
  const media = await getMedia(mediaId);
  
  console.log('[STRUCTURE] Original KV Media:');
  console.log(`[STRUCTURE]   id: ${media.id}`);
  console.log(`[STRUCTURE]   filename: ${media.filename}`);
  console.log(`[STRUCTURE]   source: ${media.source}`);
  console.log(`[STRUCTURE]   lifecycleState: ${media.lifecycleState}`);
  console.log(`[STRUCTURE]   provenance:`, JSON.stringify(media.provenance, null, 2));
  console.log(`[STRUCTURE]   provenance.drive_canonical: ${media.provenance?.drive_canonical}`);
  console.log(`[STRUCTURE]   provenance.august3_driveId: ${media.provenance?.august3_driveId}`);
  
  console.log('\n[STRUCTURE] Simulating addDriveAssetToRegistry transformation:');
  
  // Simulate what addDriveAssetToRegistry does
  const classification = media.lifecycleState === 'published' ? 'PUBLISHED' : 'DRIVE_ONLY';
  const transformedAsset = {
    ...media,
    classification,
    usageSlots: [],
    physicalPath: media.variants?.original || '',
    physicalStatus: 'BLOB',
  };
  
  console.log(`[STRUCTURE]   classification: ${transformedAsset.classification}`);
  console.log(`[STRUCTURE]   provenance:`, JSON.stringify(transformedAsset.provenance, null, 2));
  console.log(`[STRUCTURE]   provenance.drive_canonical: ${transformedAsset.provenance?.drive_canonical}`);
  console.log(`[STRUCTURE]   provenance.august3_driveId: ${transformedAsset.provenance?.august3_driveId}`);
  
  console.log('\n[STRUCTURE] Workbench matching condition:');
  const fileId = '1A7eiHXERSZ-7eq8Hdl0F6P67DZM_qVda';
  const sharedDriveId = '0ALeA98MLc-s_Uk9PVA';
  
  const assetDriveId = transformedAsset.provenance?.august3_driveId;
  const matches = sharedDriveId 
    ? (assetDriveId === fileId && transformedAsset.provenance?.drive_canonical === true)
    : (assetDriveId === fileId && transformedAsset.provenance?.drive_canonical === true);
  
  console.log(`[STRUCTURE]   fileId: ${fileId}`);
  console.log(`[STRUCTURE]   sharedDriveId: ${sharedDriveId}`);
  console.log(`[STRUCTURE]   assetDriveId: ${assetDriveId}`);
  console.log(`[STRUCTURE]   drive_canonical: ${transformedAsset.provenance?.drive_canonical}`);
  console.log(`[STRUCTURE]   MATCHES: ${matches}`);
}

testAssetStructure();
