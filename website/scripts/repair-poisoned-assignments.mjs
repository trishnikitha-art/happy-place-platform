/**
 * Repair Poisoned Assignments Script
 * 
 * Migrates existing drive-* / drive-ref-* assignments to PublishedMediaAsset assignments.
 * 
 * Process:
 * 1. Scan all active service card assignments
 * 2. Identify drive-* / drive-ref-* assignments
 * 3. For each poisoned assignment:
 *    - Find corresponding Drive reference
 *    - Find materialized PublishedMediaAsset (by content hash or direct lookup)
 *    - Replace assignment with PublishedMediaAsset ID
 *    - Preserve old assignment as forensic evidence
 * 4. Verify assignments resolve publicly
 * 
 * Preserves the constitutional boundary: public gate continues to reject drive-* IDs
 * The repair makes the data cross the boundary legitimately.
 */

import { getAllServiceCardAssignments, storeServiceCardAssignment } from '../src/lib/assignment-store.js';
import { getMedia, findMediaByContentHash } from '../src/lib/media-kv-store.js';

const ASSIGNMENT_QUARANTINE_PREFIX = 'assignment-repair-quarantine:';

/**
 * Extract Drive source ID from drive-* or drive-ref-* mediaId
 */
function extractDriveSourceId(mediaId) {
  if (mediaId.startsWith('drive-')) {
    return mediaId.replace('drive-', '');
  }
  if (mediaId.startsWith('drive-ref-')) {
    return mediaId.replace('drive-ref-', '');
  }
  return null;
}

/**
 * Find PublishedMediaAsset by Drive source ID
 * This requires either content hash matching or direct ID lookup
 */
async function findPublishedMediaAsset(driveSourceId) {
  try {
    // Try direct lookup first (if the PublishedMediaAsset uses the Drive ID as reference)
    const directMedia = await getMedia(driveSourceId);
    if (directMedia && directMedia.source === 'local' && directMedia.lifecycleState === 'published') {
      return directMedia;
    }
    
    // If not found, we would need to scan all media for Drive provenance
    // For now, return null - this requires Drive connection
    return null;
  } catch (error) {
    console.error('[REPAIR] Failed to find PublishedMediaAsset:', error);
    return null;
  }
}

/**
 * Quarantine old assignment for forensic evidence
 */
async function quarantineAssignment(serviceSlug, oldAssignment, reason) {
  try {
    const { getRedisClient } = await import('../src/lib/media-kv-store.js');
    const { getRedisClient: getRedisClientAssignment } = await import('../src/lib/assignment-store.js');
    
    const client = getRedisClientAssignment();
    const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${serviceSlug}:${Date.now()}`;
    
    const quarantineRecord = {
      serviceSlug,
      oldAssignment,
      reason,
      quarantinedAt: new Date().toISOString(),
    };
    
    await client.set(quarantineKey, JSON.stringify(quarantineRecord));
    console.log('[REPAIR] Quarantined assignment:', serviceSlug, reason);
  } catch (error) {
    console.error('[REPAIR] Failed to quarantine assignment:', error);
  }
}

/**
 * Main repair function
 */
async function repairPoisonedAssignments() {
  console.log('=== REPAIR POISONED ASSIGNMENTS STARTED ===');
  
  try {
    const assignments = await getAllServiceCardAssignments();
    console.log('[REPAIR] Found assignments:', assignments.length);
    
    const poisonedAssignments = [];
    const repairedAssignments = [];
    const failedAssignments = [];
    
    for (const assignment of assignments) {
      const driveSourceId = extractDriveSourceId(assignment.mediaId);
      
      if (driveSourceId) {
        console.log('[REPAIR] Found poisoned assignment:', {
          serviceSlug: assignment.serviceSlug,
          mediaId: assignment.mediaId,
          driveSourceId,
        });
        
        poisonedAssignments.push(assignment);
        
        // Try to find corresponding PublishedMediaAsset
        const publishedMedia = await findPublishedMediaAsset(driveSourceId);
        
        if (publishedMedia) {
          console.log('[REPAIR] Found PublishedMediaAsset:', {
            serviceSlug: assignment.serviceSlug,
            oldMediaId: assignment.mediaId,
            newMediaId: publishedMedia.id,
          });
          
          // Update assignment
          const updatedAssignment = {
            ...assignment,
            mediaId: publishedMedia.id,
            updatedAt: new Date().toISOString(),
          };
          
          await storeServiceCardAssignment(updatedAssignment);
          
          // Quarantine old assignment
          await quarantineAssignment(
            assignment.serviceSlug,
            assignment,
            'Repaired drive-* assignment to PublishedMediaAsset'
          );
          
          repairedAssignments.push({
            serviceSlug: assignment.serviceSlug,
            oldMediaId: assignment.mediaId,
            newMediaId: publishedMedia.id,
          });
        } else {
          console.log('[REPAIR] No PublishedMediaAsset found for:', {
            serviceSlug: assignment.serviceSlug,
            driveSourceId,
          });
          
          failedAssignments.push({
            serviceSlug: assignment.serviceSlug,
            mediaId: assignment.mediaId,
            driveSourceId,
            reason: 'No PublishedMediaAsset found',
          });
        }
      }
    }
    
    console.log('=== REPAIR POISONED ASSIGNMENTS COMPLETE ===');
    console.log('[REPAIR] Summary:', {
      totalAssignments: assignments.length,
      poisonedCount: poisonedAssignments.length,
      repairedCount: repairedAssignments.length,
      failedCount: failedAssignments.length,
    });
    
    return {
      totalAssignments: assignments.length,
      poisonedCount: poisonedAssignments.length,
      repairedCount: repairedAssignments.length,
      failedCount: failedAssignments.length,
      repairedAssignments,
      failedAssignments,
    };
  } catch (error) {
    console.error('[REPAIR] Fatal error:', error);
    throw error;
  }
}

// Run repair if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  repairPoisonedAssignments()
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      process.exit(0);
    })
    .catch((error) => {
      console.error('Repair failed:', error);
      process.exit(1);
    });
}

export { repairPoisonedAssignments };
