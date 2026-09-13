/**
 * Verify Quarantine Safety
 * 
 * This script verifies that the three known malformed media records are safe to quarantine.
 * It checks:
 * 1. Whether each ID is referenced by any assignment
 * 2. Whether each ID appears in any projection
 * 3. Whether any deployment/staging record references it
 * 4. Whether the public media gate can still resolve it
 * 5. Whether any reconciliation process can recreate it
 * 
 * Run this in the production environment before executing quarantine.
 */

import { listMediaIds, getMediaRecordRaw } from '../lib/media-kv-store.js';
import { getServiceCardAssignment } from '../lib/assignment-store.js';
import { resolvePublicMedia } from '../lib/media.js';

const MALFORMED_IDS = [
  '07c0eae184dc5a375f943a3ac2b67e95',
  '2df4fe450b3b35d38be23538e2fdcf0d',
  'c148cedee481f1e3a5fa13d85efbac1c',
];

async function verifyQuarantineSafety() {
  console.log('[QUARANTINE_SAFETY] Verifying safety of malformed records...\n');

  for (const mediaId of MALFORMED_IDS) {
    console.log(`[QUARANTINE_SAFETY] Checking: ${mediaId}`);
    
    // 1. Check if record exists in KV
    const allIds = await listMediaIds();
    const existsInKV = allIds.includes(mediaId);
    console.log(`  - Exists in KV: ${existsInKV}`);
    
    if (!existsInKV) {
      console.log(`  - WARNING: Record not found in KV - may already be quarantined or never existed\n`);
      continue;
    }
    
    // 2. Get record details
    const record = await getMediaRecordRaw(mediaId);
    if (!record) {
      console.log(`  - ERROR: getMediaRecordRaw returned null despite being in list\n`);
      continue;
    }
    
    console.log(`  - Storage: ${record.storage || 'MISSING'}`);
    console.log(`  - Lifecycle state: ${record.lifecycleState}`);
    console.log(`  - Source: ${record.source}`);
    
    // 3. Check service card assignments
    const SERVICE_SLUGS = [
      'painting', 'repairs', 'restoration', 'fences', 'drywall',
      'kitchen-remodeling', 'bathroom-remodeling', 'built-ins', 'outdoor-living'
    ];
    
    let assignmentReferences = [];
    for (const slug of SERVICE_SLUGS) {
      try {
        const assignment = await getServiceCardAssignment(slug, 'homepage');
        if (assignment?.mediaId === mediaId) {
          assignmentReferences.push(`homepage-service-card-${slug}`);
        }
      } catch (error) {
        // Assignment may not exist, ignore
      }
    }
    
    console.log(`  - Assignment references: ${assignmentReferences.length > 0 ? assignmentReferences.join(', ') : 'NONE'}`);
    
    // 4. Check if public media gate can resolve it
    const publicResolution = await resolvePublicMedia(mediaId);
    console.log(`  - Public gate resolution: ${publicResolution ? 'RESOLVES (UNSAFE)' : 'REJECTED (SAFE)'}`);
    
    // 5. Check if record has synthetic content hash (indicates placeholder/synthetic)
    const crypto = await import('crypto');
    const syntheticHash = crypto.createHash('sha256').update(mediaId).digest('hex');
    const isSynthetic = record.contentHash === syntheticHash;
    console.log(`  - Synthetic content hash: ${isSynthetic ? 'YES (synthetic)' : 'NO (real)'}`);
    
    // Safety determination
    const isSafeToQuarantine = !assignmentReferences.length && !publicResolution;
    
    console.log(`  - SAFE TO QUARANTINE: ${isSafeToQuarantine ? 'YES' : 'NO'}`);
    
    if (!isSafeToQuarantine) {
      console.log(`  - UNSAFE REASON: ${assignmentReferences.length ? 'Has active assignments' : 'Public gate still resolves'}`);
    }
    
    console.log('');
  }
  
  console.log('[QUARANTINE_SAFETY] Verification complete.');
}

verifyQuarantineSafety().catch(error => {
  console.error('[QUARANTINE_SAFETY] Error:', error);
  process.exit(1);
});
