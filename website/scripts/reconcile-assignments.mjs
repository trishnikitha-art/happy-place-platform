/**
 * Reconcile assignments from canonical project configuration
 * 
 * Creates assignments that match the canonical project/media relationships
 * Validates media IDs against canonical media authority
 * Idempotent - skips existing valid assignments
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { Redis } from '@upstash/redis';

const MEDIA_KV_URL = process.env.KV_REST_API_URL;
const MEDIA_KV_TOKEN = process.env.KV_REST_API_TOKEN;

if (!MEDIA_KV_URL || !MEDIA_KV_TOKEN) {
  console.error('[ASSIGNMENT_RECONCILIATION] ERROR: Missing KV credentials');
  console.error('Set KV_REST_API_URL and KV_REST_API_TOKEN environment variables');
  process.exit(1);
}

const client = new Redis({ url: MEDIA_KV_URL, token: MEDIA_KV_TOKEN });

console.log('[ASSIGNMENT_RECONCILIATION] STARTED');

try {
  // Load canonical project configuration
  const projectsPath = join(process.cwd(), 'src/config/projects.v1.json');
  const projectsData = JSON.parse(readFileSync(projectsPath, 'utf8'));
  
  // Load canonical media authority
  const mediaPath = join(process.cwd(), 'src/config/media.v1.main.json');
  const mediaData = JSON.parse(readFileSync(mediaPath, 'utf8'));
  
  // Build media ID set for validation
  const canonicalMediaIds = new Set(mediaData.media.map(m => m.id));
  
  console.log('[ASSIGNMENT_RECONCILIATION] CANONICAL_LOADED', { 
    projects: projectsData.projects.length,
    media: mediaData.media.length
  });
  
  let reconciled = 0;
  let skipped = 0;
  let failed = 0;
  const errors = {};
  
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
      failed++;
      errors[project.id] = error.message;
      console.error('[ASSIGNMENT_RECONCILIATION] PROJECT_FAILED', {
        projectId: project.id,
        error: error.message,
      });
    }
  }
  
  // Reconcile brand assignments
  const brandPath = join(process.cwd(), 'src/config/brand.v1.json');
  const brandData = JSON.parse(readFileSync(brandPath, 'utf8'));
  
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
  
  console.log('[ASSIGNMENT_RECONCILIATION] COMPLETE', {
    reconciled,
    skipped,
    failed,
    errors: failed > 0 ? errors : undefined,
  });
  
  if (failed > 0) {
    process.exit(1);
  }
  
} catch (error) {
  console.error('[ASSIGNMENT_RECONCILIATION] ERROR', {
    error: error.message,
  });
  process.exit(1);
}

async function reconcileAssignment(slotKey, mediaId, canonicalMediaIds) {
  try {
    // Validate media ID exists in canonical authority
    if (!canonicalMediaIds.has(mediaId)) {
      console.warn('[ASSIGNMENT_RECONCILIATION] MEDIA_ID_NOT_IN_CANONICAL', {
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
        skipped++;
        console.log('[ASSIGNMENT_RECONCILIATION] SKIPPED', { 
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
    reconciled++;
    console.log('[ASSIGNMENT_RECONCILIATION] RECONCILED', { 
      slotKey,
      mediaId
    });
    
  } catch (error) {
    failed++;
    errors[slotKey] = error.message;
    console.error('[ASSIGNMENT_RECONCILIATION] FAILED', {
      slotKey,
      mediaId,
      error: error.message,
    });
  }
}
