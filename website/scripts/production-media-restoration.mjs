/**
 * Production Media Restoration - Single Script
 * 
 * Executes both Phase 1 (reconcile static media) and Phase 2 (reconcile assignments)
 * Uses authoritative assignment writer to enforce constitutional path
 * Must be run in production environment with KV credentials
 * 
 * This script does what the Media Workbench "drag UI" would do:
 * 1. Reconcile canonical static media records into MEDIA_KV with inspection-based repair
 * 2. Reconcile assignments from canonical project/media relationships using authoritative writer
 * 
 * CRITICAL: This script now uses the same authoritative path as the Workbench:
 * - Phase 1: Reconciles static media using media-kv-store (authoritative media writer)
 * - Phase 2: Reconciles assignments using assignment-store (authoritative assignment writer)
 * - Both phases enforce CAS, public-media gate, and constitutional boundaries
 * - Fixed authority path from media.v1.main.json to media.v1.json (current canonical)
 * 
 * Usage: 
 *   KV_REST_API_URL=<url> KV_REST_API_TOKEN=<token> node scripts/production-media-restoration.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { saveMedia, getMediaRecordRaw } from '../src/lib/media-kv-store.ts';
import { storeServiceCardAssignment, getServiceCardAssignment } from '../src/lib/assignment-store.ts';

const MEDIA_KV_URL = process.env.KV_REST_API_URL;
const MEDIA_KV_TOKEN = process.env.KV_REST_API_TOKEN;

if (!MEDIA_KV_URL || !MEDIA_KV_TOKEN) {
  console.error('[PRODUCTION_MEDIA_RESTORATION] ERROR: Missing KV credentials');
  console.error('Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables');
  process.exit(1);
}

console.log('[PRODUCTION_MEDIA_RESTORATION] STARTED');
console.log('[PRODUCTION_MEDIA_RESTORATION] This is equivalent to Media Workbench drag UI restoration');
console.log('[PRODUCTION_MEDIA_RESTORATION] Using authoritative writers (saveMedia, storeServiceCardAssignment)');

try {
  // ============================================
  // PHASE 1: Reconcile Static Media to MEDIA_KV
  // ============================================
  console.log('[PHASE 1] RECONCILING STATIC MEDIA TO MEDIA_KV');
  
  const mediaPath = join(process.cwd(), 'src/config/media.v1.json');
  const mediaData = JSON.parse(readFileSync(mediaPath, 'utf8'));
  
  console.log('[PHASE 1] CANONICAL_LOADED', { 
    totalCanonical: mediaData.media.length 
  });
  
  let mediaRepaired = 0;
  let mediaPreserved = 0;
  let mediaFailed = 0;
  const mediaErrors = {};
  
  const classification = {
    missing: 0,
    incomplete: 0,
    validStatic: 0,
    validBlob: 0,
    corrupt: 0,
    synthetic: 0,
    unexpected: 0,
  };
  
  for (const media of mediaData.media) {
    try {
      // Check existing KV record
      const existing = await getMediaRecordRaw(media.id);
      
      // Classify existing record
      if (!existing) {
        // MISSING: Record doesn't exist in KV
        classification.missing++;
        
        // Add storage field for static assets
        const reconciledMedia = {
          ...media,
          storage: (media.source === 'local' ? 'static' : undefined),
        };
        
        // Write to KV
        await saveMedia(reconciledMedia);
        mediaRepaired++;
        console.log('[PHASE 1] REPAIRED_MISSING', { 
          mediaId: media.id,
          storage: reconciledMedia.storage
        });
        
      } else {
        // EXISTING: Inspect for completeness
        const canonicalHash = media.contentHash;
        const kvHash = existing.contentHash;
        const canonicalStorage = media.source === 'local' ? 'static' : undefined;
        const kvStorage = existing.storage;
        
        // Check for critical fields
        const isComplete =
          existing.lifecycleState === 'published' &&
          existing.source === media.source &&
          existing.storage === canonicalStorage &&
          existing.contentHash === canonicalHash &&
          existing.variants && Object.keys(existing.variants).length > 0;
        
        if (!isComplete) {
          // INCOMPLETE: Record exists but is missing critical fields
          classification.incomplete++;
          
          // Repair through authoritative saveMedia()
          // Do NOT blindly overwrite Blob-backed records
          if (existing.storage === 'blob') {
            // Blob records require careful handling - preserve, don't repair
            classification.validBlob++;
            mediaPreserved++;
            console.log('[PHASE 1] PRESERVED_BLOB', { 
              mediaId: media.id,
              reason: 'Blob record - preserve without repair'
            });
          } else {
            // Static records can be repaired
            const reconciledMedia = {
              ...media,
              storage: canonicalStorage as 'static' | 'blob' | undefined,
            };
            
            await saveMedia(reconciledMedia);
            mediaRepaired++;
            console.log('[PHASE 1] REPAIRED_INCOMPLETE', { 
              mediaId: media.id,
              reason: 'Missing critical fields',
              before: { storage: kvStorage, hash: kvHash },
              after: { storage: canonicalStorage, hash: canonicalHash }
            });
          }
          
        } else {
          // VALID: Record is materially equivalent to canonical
          if (existing.storage === 'static') {
            classification.validStatic++;
          } else if (existing.storage === 'blob') {
            classification.validBlob++;
          } else {
            classification.unexpected++;
          }
          
          mediaPreserved++;
          console.log('[PHASE 1] PRESERVED_VALID', { 
            mediaId: media.id,
            storage: existing.storage
          });
        }
      }
      
    } catch (error) {
      mediaFailed++;
      mediaErrors[media.id] = error.message;
      console.error('[PHASE 1] FAILED', {
        mediaId: media.id,
        error: error.message,
      });
    }
  }
  
  console.log('[PHASE 1] COMPLETE', {
    totalCanonical: mediaData.media.length,
    classification,
    repaired: mediaRepaired,
    preserved: mediaPreserved,
    failed: mediaFailed,
    errors: mediaFailed > 0 ? mediaErrors : undefined,
  });
  
  if (mediaFailed > 0) {
    console.error('[PRODUCTION_MEDIA_RESTORATION] PHASE 1 FAILED - ABORTING');
    process.exit(1);
  }
  
  if (mediaFailed > 0) {
    console.error('[PRODUCTION_MEDIA_RESTORATION] PHASE 1 FAILED - ABORTING');
    process.exit(1);
  }
  
  // ============================================
  // PHASE 2: Reconcile Assignments
  // ============================================
  console.log('[PHASE 2] RECONCILING ASSIGNMENTS FROM CANONICAL CONFIGURATION');
  console.log('[PHASE 2] Using authoritative assignment writer (storeServiceCardAssignment)');
  
  // Load canonical project configuration
  const projectsPath = join(process.cwd(), 'src/config/projects.v1.json');
  const projectsData = JSON.parse(readFileSync(projectsPath, 'utf8'));
  
  // Load brand configuration
  const brandPath = join(process.cwd(), 'src/config/brand.v1.json');
  const brandData = JSON.parse(readFileSync(brandPath, 'utf8'));
  
  // Build media ID set for validation
  const canonicalMediaIds = new Set(mediaData.media.map(m => m.id));
  
  console.log('[PHASE 2] CANONICAL_LOADED', { 
    projects: projectsData.projects.length,
    media: mediaData.media.length
  });
  
  let assignmentReconciled = 0;
  let assignmentSkipped = 0;
  let assignmentFailed = 0;
  const assignmentErrors = {};
  
  // Reconcile project media assignments using authoritative writer
  for (const project of projectsData.projects) {
    try {
      const projectMedia = project.media;
      if (!projectMedia) continue;
      
      // Hero assignment
      if (projectMedia.hero) {
        await reconcileAssignment(
          `project:${project.id}:hero`,
          projectMedia.hero,
          canonicalMediaIds
        );
      }
      
      // Before assignment
      if (projectMedia.before) {
        await reconcileAssignment(
          `project:${project.id}:before`,
          projectMedia.before,
          canonicalMediaIds
        );
      }
      
      // After assignment
      if (projectMedia.after) {
        await reconcileAssignment(
          `project:${project.id}:after`,
          projectMedia.after,
          canonicalMediaIds
        );
      }
      
      // Gallery assignments
      if (projectMedia.gallery && Array.isArray(projectMedia.gallery)) {
        for (const [index, mediaId] of projectMedia.gallery.entries()) {
          await reconcileAssignment(
            `project:${project.id}:gallery:${index}`,
            mediaId,
            canonicalMediaIds
          );
        }
      }
      
    } catch (error) {
      assignmentFailed++;
      assignmentErrors[project.id] = error.message;
      console.error('[PHASE 2] PROJECT_FAILED', {
        projectId: project.id,
        error: error.message,
      });
    }
  }
  
  // Reconcile brand assignments using authoritative writer
  if (brandData.homepageHero?.mediaId) {
    await reconcileAssignment(
      'brand-hero-background',
      brandData.homepageHero.mediaId,
      canonicalMediaIds
    );
  }
  
  if (brandData.ownerPortrait?.mediaId) {
    await reconcileAssignment(
      'brand-portrait-homepage',
      brandData.ownerPortrait.mediaId,
      canonicalMediaIds
    );
  }
  
  console.log('[PHASE 2] COMPLETE', {
    reconciled: assignmentReconciled,
    skipped: assignmentSkipped,
    failed: assignmentFailed,
    errors: assignmentFailed > 0 ? assignmentErrors : undefined,
  });
  
  if (assignmentFailed > 0) {
    console.error('[PRODUCTION_MEDIA_RESTORATION] PHASE 2 FAILED - ABORTING');
    process.exit(1);
  }
  
  // ============================================
  // FINAL REPORT
  // ============================================
  console.log('[PRODUCTION_MEDIA_RESTORATION] COMPLETE');
  console.log('========================================');
  console.log('PHASE 1 - Static Media Reconciliation:');
  console.log(`  Total canonical: ${mediaData.media.length}`);
  console.log(`  Classification:`, classification);
  console.log(`  Repaired: ${mediaRepaired}`);
  console.log(`  Preserved: ${mediaPreserved}`);
  console.log(`  Failed: ${mediaFailed}`);
  console.log('');
  console.log('PHASE 2 - Assignment Reconciliation:');
  console.log(`  Projects: ${projectsData.projects.length}`);
  console.log(`  Reconciled: ${assignmentReconciled}`);
  console.log(`  Skipped: ${assignmentSkipped}`);
  console.log(`  Failed: ${assignmentFailed}`);
  console.log('========================================');
  console.log('');
  console.log('This restoration is equivalent to Media Workbench drag UI operations.');
  console.log('The website should now render all existing photographs from the Aug. 3 visual state.');
  
} catch (error) {
  console.error('[PRODUCTION_MEDIA_RESTORATION] ERROR', {
    error: error.message,
  });
  process.exit(1);
}

async function reconcileAssignment(slotKey, mediaId, canonicalMediaIds) {
  try {
    // Validate media ID exists in canonical authority
    if (!canonicalMediaIds.has(mediaId)) {
      console.warn('[PHASE 2] MEDIA_ID_NOT_IN_CANONICAL', {
        slotKey,
        mediaId,
        reason: 'Media ID not found in canonical media authority'
      });
      return;
    }
    
    // Check if assignment already exists with same mediaId
    const existing = await getServiceCardAssignment(slotKey);
    if (existing && existing.mediaId === mediaId) {
      assignmentSkipped++;
      console.log('[PHASE 2] SKIPPED', { 
        slotKey,
        mediaId,
        reason: 'Assignment already exists with same mediaId'
      });
      return;
    }
    
    // Get current revision for CAS (0 if missing)
    const currentRevision = existing?.revision || 0;
    
    // Create assignment using authoritative writer
    // This enforces public-media gate validation and CAS
    const assignment = {
      serviceSlug: slotKey,
      mediaId,
      source: 'workbench',
      actor: 'reconciliation',
      revision: currentRevision + 1,
      updatedAt: new Date().toISOString(),
    };
    
    await storeServiceCardAssignment(assignment, currentRevision);
    assignmentReconciled++;
    console.log('[PHASE 2] RECONCILED', { 
      slotKey,
      mediaId
    });
    
  } catch (error) {
    assignmentFailed++;
    assignmentErrors[slotKey] = error.message;
    console.error('[PHASE 2] FAILED', {
      slotKey,
      mediaId,
      error: error.message,
    });
  }
}
