/**
 * Build Legacy Assignment → Authoritative Media Resolver
 * 
 * This script establishes the missing identity bridge between poisoned legacy assignments
 * and canonical media assets. The poisoned drive-* IDs are legacy internal identifiers,
 * not authoritative Google Drive file IDs.
 * 
 * Strategy:
 * 1. Map poisoned assignments to canonical media based on service context
 * 2. Verify canonical media exists in authorities (media.v1.json)
 * 3. Only assign when target is independently verified as valid PublishedMediaAsset
 * 4. Preserve forensic evidence of all mapping decisions
 * 
 * Key insight: The poisoned IDs are likely pre-constitutional internal identifiers,
 * while real Google Drive file IDs look like: 1F3lJ9v4c5dCogj5UEc-Yhpyi-RDYHLl5
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Poisoned runtime assignments from production evidence
const POISONED_ASSIGNMENTS = [
  { serviceSlug: 'brand-hero', poisonedId: 'drive-fe2e5a57446436f9' },
  { serviceSlug: 'painting', poisonedId: 'drive-ref-95bbb9bf71c294a1' },
  { serviceSlug: 'repairs', poisonedId: 'drive-4328210fbe49d835' },
  { serviceSlug: 'restoration', poisonedId: 'drive-aa8ac3af6e3afceb' },
  { serviceSlug: 'fences', poisonedId: 'drive-e0a149dd438141ad' },
];

// Service → canonical media mapping based on media.v1.json authority
const SERVICE_CANONICAL_MAP = {
  'brand-hero': {
    // Brand hero maps to brand-hero ID from brand.v1.json
    // This is a special case - brand media has separate authority
    canonicalId: 'brand-hero',
    serviceContext: null, // Brand media has no service context
    projectId: null,
    authority: 'brand.v1.json',
  },
  'painting': {
    canonicalId: 'outdoor-living-001-hero',
    serviceContext: 'painting',
    projectId: 'exterior-painting-001',
  },
  'repairs': {
    canonicalId: 'repairs-001-hero',
    serviceContext: 'repairs',
    projectId: 'repairs-001',
  },
  'restoration': {
    canonicalId: 'builtins-001-secondary',
    serviceContext: 'built-ins',
    projectId: 'builtins-001',
  },
  'fences': {
    canonicalId: 'fences-001-hero',
    serviceContext: 'fences',
    projectId: 'fences-001',
  },
};

/**
 * Load brand.v1.json authority
 */
function loadBrandAuthority() {
  try {
    const brandPath = join(__dirname, '../src/config/brand.v1.json');
    console.log('[RESOLVER] Loading brand authority from:', brandPath);
    const brandContent = readFileSync(brandPath, 'utf-8');
    return JSON.parse(brandContent);
  } catch (error) {
    console.error('[RESOLVER] Failed to load brand.v1.json:', error);
    return null;
  }
}

/**
 * Load media.v1.json authority
 */
function loadMediaAuthority() {
  try {
    const mediaPath = join(__dirname, '../src/config/media.v1.json');
    console.log('[RESOLVER] Loading media authority from:', mediaPath);
    const mediaContent = readFileSync(mediaPath, 'utf-8');
    return JSON.parse(mediaContent);
  } catch (error) {
    console.error('[RESOLVER] Failed to load media.v1.json:', error);
    return { media: [] };
  }
}

/**
 * Verify canonical media exists in authority and is valid
 */
function verifyCanonicalMedia(mediaId, serviceContext, authority = 'media.v1.json') {
  try {
    let media;
    
    if (authority === 'brand.v1.json') {
      const brandAuthority = loadBrandAuthority();
      if (!brandAuthority) {
        return {
          valid: false,
          reason: 'Brand authority not loaded',
        };
      }
      
      // For brand-hero, check if the mediaId exists in brand authority
      if (mediaId === 'brand-hero' && brandAuthority.homepageHero) {
        return {
          valid: true,
          media: {
            id: 'brand-hero',
            filename: 'brand-hero',
            service: null,
            hasWebVariant: false, // Brand media may not have same variant structure
            isBrandMedia: true,
          },
        };
      }
      
      return {
        valid: false,
        reason: 'Brand media ID not found in brand.v1.json authority',
      };
    }
    
    // Standard media.v1.json verification
    const mediaAuthority = loadMediaAuthority();
    media = mediaAuthority.media.find(m => m.id === mediaId);
    
    if (!media) {
      return {
        valid: false,
        reason: 'Media ID not found in media.v1.json authority',
      };
    }
    
    // Verify service context matches
    if (serviceContext && media.service !== serviceContext) {
      return {
        valid: false,
        reason: `Service context mismatch: expected ${serviceContext}, found ${media.service}`,
      };
    }
    
    // Verify physical file exists
    if (!media.variants?.web) {
      return {
        valid: false,
        reason: 'No web variant available',
      };
    }
    
    return {
      valid: true,
      media,
    };
  } catch (error) {
    return {
      valid: false,
      reason: `Verification failed: ${error.message}`,
    };
  }
}

/**
 * Build resolver evidence
 */
function buildResolverEvidence() {
  console.log('=== BUILDING LEGACY ASSIGNMENT RESOLVER ===');
  
  const evidence = [];
  
  for (const assignment of POISONED_ASSIGNMENTS) {
    const mapping = SERVICE_CANONICAL_MAP[assignment.serviceSlug];
    
    console.log(`\n[RESOLVER] Analyzing poisoned assignment:`, {
      serviceSlug: assignment.serviceSlug,
      poisonedId: assignment.poisonedId,
    });
    
    if (!mapping) {
      console.log(`[RESOLVER] No mapping found for service: ${assignment.serviceSlug}`);
      evidence.push({
        serviceSlug: assignment.serviceSlug,
        poisonedId: assignment.poisonedId,
        resolution: 'NO_MAPPING',
        reason: 'No service → canonical mapping defined',
      });
      continue;
    }
    
    if (!mapping.canonicalId) {
      console.log(`[RESOLVER] No canonical media ID for service: ${assignment.serviceSlug}`);
      evidence.push({
        serviceSlug: assignment.serviceSlug,
        poisonedId: assignment.poisonedId,
        resolution: 'MANUAL_VERIFICATION_REQUIRED',
        reason: 'Canonical ID not pre-mapped (brand media)',
      });
      continue;
    }
    
    // Determine which authority to use for verification
    const authority = mapping.authority || 'media.v1.json';
    const verification = verifyCanonicalMedia(mapping.canonicalId, mapping.serviceContext, authority);
    
    if (verification.valid) {
      console.log(`[RESOLVER] ✓ Canonical media verified:`, {
        canonicalId: mapping.canonicalId,
        filename: verification.media.filename,
        service: verification.media.service,
        authority: authority,
      });
      
      evidence.push({
        serviceSlug: assignment.serviceSlug,
        poisonedId: assignment.poisonedId,
        canonicalId: mapping.canonicalId,
        resolution: 'VERIFIED',
        authority: authority,
        canonicalMedia: {
          id: verification.media.id,
          filename: verification.media.filename,
          service: verification.media.service,
          hasWebVariant: !!verification.media.variants?.web,
          isBrandMedia: verification.media.isBrandMedia || false,
        },
      });
    } else {
      console.log(`[RESOLVER] ✗ Canonical media verification failed:`, verification.reason);
      
      evidence.push({
        serviceSlug: assignment.serviceSlug,
        poisonedId: assignment.poisonedId,
        canonicalId: mapping.canonicalId,
        resolution: 'VERIFICATION_FAILED',
        reason: verification.reason,
      });
    }
  }
  
  console.log('\n=== RESOLVER EVIDENCE COMPLETE ===');
  console.log(`[RESOLVER] Total assignments analyzed: ${evidence.length}`);
  console.log(`[RESOLVER] Verified mappings: ${evidence.filter(e => e.resolution === 'VERIFIED').length}`);
  console.log(`[RESOLVER] Failed verifications: ${evidence.filter(e => e.resolution === 'VERIFICATION_FAILED').length}`);
  console.log(`[RESOLVER] Manual verification required: ${evidence.filter(e => e.resolution === 'MANUAL_VERIFICATION_REQUIRED').length}`);
  
  return evidence;
}

// Run resolver if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const evidence = buildResolverEvidence();
    console.log('\n=== RESOLVER EVIDENCE ===');
    console.log(JSON.stringify(evidence, null, 2));
    
    // Write to file for debugging
    const outputPath = join(__dirname, 'resolver-evidence.json');
    writeFileSync(outputPath, JSON.stringify(evidence, null, 2));
    console.log('[RESOLVER] Evidence written to:', outputPath);
    
    process.exit(0);
  } catch (error) {
    console.error('[RESOLVER] Fatal error:', error);
    process.exit(1);
  }
}

export { buildResolverEvidence, POISONED_ASSIGNMENTS, SERVICE_CANONICAL_MAP };