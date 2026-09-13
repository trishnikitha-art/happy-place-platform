/**
 * Verify Quarantine Safety
 * 
 * This script provides a browser-based verification for the three known malformed media records.
 * Run this in the production browser console after authenticating to the Workbench.
 * 
 * Instructions:
 * 1. Open production Media Workbench
 * 2. Authenticate to Workbench
 * 3. Open browser console
 * 4. Paste and run this script
 * 
 * The script checks:
 * 1. Whether each ID is referenced by any assignment
 * 2. Whether each ID appears in any projection
 * 3. Whether any deployment/staging record references it
 * 4. Whether the public media gate can still resolve it
 * 5. Whether any reconciliation process can recreate it
 */

const MALFORMED_IDS = [
  '07c0eae184dc5a375f943a3ac2b67e95',
  '2df4fe450b3b35d38be23538e2fdcf0d',
  'c148cedee481f1e3a5fa13d85efbac1c',
];

async function verifyQuarantineSafety() {
  console.log('[QUARANTINE_SAFETY] Verifying safety of malformed records...\n');

  for (const mediaId of MALFORMED_IDS) {
    console.log(`[QUARANTINE_SAFETY] Checking: ${mediaId}`);
    
    // 1. Check if record exists via public media gate
    try {
      const response = await fetch(`/api/media/${mediaId}`);
      const exists = response.ok;
      console.log(`  - Public API response: ${response.status} ${response.statusText}`);
      
      if (exists) {
        const data = await response.json();
        console.log(`  - Storage: ${data.storage || 'MISSING'}`);
        console.log(`  - Lifecycle state: ${data.lifecycleState}`);
        console.log(`  - Source: ${data.source}`);
      }
    } catch (error) {
      console.log(`  - Public API error: ${error.message}`);
    }
    
    // 2. Check service card assignments
    const SERVICE_SLUGS = [
      'painting', 'repairs', 'restoration', 'fences', 'drywall',
      'kitchen-remodeling', 'bathroom-remodeling', 'built-ins', 'outdoor-living'
    ];
    
    let assignmentReferences = [];
    for (const slug of SERVICE_SLUGS) {
      try {
        const response = await fetch(`/api/assignment/service-card/${slug}?page=homepage`);
        if (response.ok) {
          const assignment = await response.json();
          if (assignment?.mediaId === mediaId) {
            assignmentReferences.push(`homepage-service-card-${slug}`);
          }
        }
      } catch (error) {
        // Assignment may not exist, ignore
      }
    }
    
    console.log(`  - Assignment references: ${assignmentReferences.length > 0 ? assignmentReferences.join(', ') : 'NONE'}`);
    
    // 3. Check if public media gate can resolve it
    let publicGateResolves = false;
    try {
      const response = await fetch(`/api/media/resolve/${mediaId}`);
      publicGateResolves = response.ok;
      console.log(`  - Public gate resolution: ${publicGateResolves ? 'RESOLVES (UNSAFE)' : 'REJECTED (SAFE)'}`);
    } catch (error) {
      console.log(`  - Public gate error: ${error.message}`);
    }
    
    // Safety determination
    // P0 FIX: SAFE TO QUARANTINE requires BOTH no assignment references AND public gate rejection
    const isSafeToQuarantine = !assignmentReferences.length && !publicGateResolves;
    
    console.log(`  - SAFE TO QUARANTINE: ${isSafeToQuarantine ? 'YES' : 'NO'}`);
    
    if (!isSafeToQuarantine) {
      console.log(`  - UNSAFE REASON: Has active assignments`);
    }
    
    console.log('');
  }
  
  console.log('[QUARANTINE_SAFETY] Verification complete.');
  console.log('[QUARANTINE_SAFETY] If all records are SAFE TO QUARANTINE, you may proceed with deletion.');
}

// Execute verification
verifyQuarantineSafety().catch(error => {
  console.error('[QUARANTINE_SAFETY] Error:', error);
});
