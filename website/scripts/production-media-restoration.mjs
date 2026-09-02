/**
 * Production Media Restoration - Single Script
 * 
 * Executes both Phase 1 (reconcile static media) and Phase 2 (reconcile assignments)
 * Must be run in production environment with KV credentials
 * 
 * This script does what the Media Workbench "drag UI" would do:
 * 1. Reconcile 120 canonical static media records into MEDIA_KV
 * 2. Reconcile assignments from canonical project/media relationships
 * 
 * Usage: 
 *   KV_REST_API_URL=<url> KV_REST_API_TOKEN=<token> node scripts/production-media-restoration.mjs
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Redis } from '@upstash/redis';

const MEDIA_KV_URL = process.env.KV_REST_API_URL;
const MEDIA_KV_TOKEN = process.env.KV_REST_API_TOKEN;

if (!MEDIA_KV_URL || !MEDIA_KV_TOKEN) {
  console.error('[PRODUCTION_MEDIA_RESTORATION] ERROR: Missing KV credentials');
  console.error('Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables');
  process.exit(1);
}

const client = new Redis({ url: MEDIA_KV_URL, token: MEDIA_KV_TOKEN });

console.log('[PRODUCTION_MEDIA_RESTORATION] STARTED');
console.log('[PRODUCTION_MEDIA_RESTORATION] This is equivalent to Media Workbench drag UI restoration');

try {
  // ============================================
  // PHASE 1: Reconcile Static Media to MEDIA_KV
  // ============================================
  console.log('[PHASE 1] RECONCILING STATIC MEDIA TO MEDIA_KV');
  
  const mediaPath = join(process.cwd(), 'src/config/media.v1.main.json');
  const mediaData = JSON.parse(readFileSync(mediaPath, 'utf8'));
  
  console.log('[PHASE 1] CANONICAL_LOADED', { 
    totalCanonical: mediaData.media.length 
  });
  
  let mediaReconciled = 0;
  let mediaSkipped = 0;
  let mediaFailed = 0;
  const mediaErrors = {};
  
  for (const media of mediaData.media) {
    try {
      // Check if already in KV
      const existing = await client.get(`media:${media.id}`);
      if (existing) {
        mediaSkipped++;
        console.log('[PHASE 1] SKIPPED', { 
          mediaId: media.id,
          reason: 'Already in KV'
        });
        continue;
      }
      
      // Add storage field for static assets
      const reconciledMedia = {
        ...media,
        storage: media.source === 'local' ? 'static' : undefined,
      };
      
      // Write to KV
      await client.set(`media:${media.id}`, JSON.stringify(reconciledMedia));
      
      // Update content hash index
      if (reconciledMedia.contentHash) {
        await client.set(`content_hash:${reconciledMedia.contentHash}`, media.id);
      }
      
      mediaReconciled++;
      console.log('[PHASE 1] RECONCILED', { 
        mediaId: media.id,
        storage: reconciledMedia.storage
      });
      
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
    reconciled: mediaReconciled,
    skipped: mediaSkipped,
    failed: mediaFailed,
    errors: mediaFailed > 0 ? mediaErrors : undefined,
  });
  
  if (mediaFailed > 0) {
    console.error('[PRODUCTION_MEDIA_RESTORATION] PHASE 1 FAILED - ABORTING');
    process.exit(1);
  }
  
  // ============================================
  // PHASE 2: Reconcile Assignments
  // ============================================
  console.log('[PHASE 2] RECONCILING ASSIGNMENTS FROM CANONICAL CONFIGURATION');
  
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
  
  // Reconcile project media assignments
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
  
  // Reconcile brand assignments
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
  console.log(`  Reconciled: ${mediaReconciled}`);
  console.log(`  Skipped: ${mediaSkipped}`);
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
    
    // Check if assignment already exists
    const existing = await client.get(`service-card-assignment:${slotKey}`);
    if (existing) {
      const parsed = typeof existing === 'string' ? JSON.parse(existing) : existing;
      if (parsed.mediaId === mediaId) {
        assignmentSkipped++;
        console.log('[PHASE 2] SKIPPED', { 
          slotKey,
          mediaId,
          reason: 'Assignment already exists with same mediaId'
        });
        return;
      }
    }
    
    // Create assignment
    const assignment = {
      slotKey,
      mediaId,
      updatedAt: new Date().toISOString(),
    };
    
    await client.set(`service-card-assignment:${slotKey}`, JSON.stringify(assignment));
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
