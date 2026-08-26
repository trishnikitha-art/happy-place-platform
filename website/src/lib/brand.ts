/**
 * Brand Authority Adapter
 * 
 * Provides intent-based access to brand assets.
 * Components never import brand.v1.json directly.
 * 
 * All authority loading flows through AuthorityLoader (CEO 051 constitutional requirement).
 */

import type { BrandManifest, BrandHero, BrandOwnerPortrait } from "@/types/brand";
import { loadAuthority, clearAuthorityCache } from "./authority-loader";

export function loadBrandManifest(): BrandManifest {
  return loadAuthority<BrandManifest>({
    path: "@/config/brand.v1.json",
    fallback: {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      homepageHero: {
        id: "fallback-hero",
        mediaId: null,
        alt: "Fallback hero",
        fallback: { gradient: true, overlay: true },
      },
      ownerPortrait: {
        id: "fallback-owner",
        mediaId: null,
        alt: "Fallback owner portrait",
        names: [],
      },
      logo: {
        id: "fallback-logo",
        mediaId: null,
        alt: "Fallback logo",
      },
      team: [],
      office: {
        id: "fallback-office",
        mediaId: null,
        alt: "Fallback office",
      },
      marketingAssets: [],
    },
    name: "Brand",
  });
}

/**
 * Get homepage hero image
 * Returns brand hero or null if not set
 * Applies runtime assignment from persistent store if available
 * Uses public media gate to ensure only PublishedMediaAsset can be returned
 */
export async function getHomepageHero(): Promise<BrandHero | null> {
  const requestId = `hero-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const manifest = loadBrandManifest();
  
  console.log('[PUBLIC_READER] HOMEPAGE_HERO_REQUEST', { requestId });
  
  // Try to load runtime assignment for brand-hero
  try {
    const { getServiceCardAssignment } = await import('@/lib/assignment-store');
    const assignment = await getServiceCardAssignment('brand-hero', requestId);
    
    if (assignment && assignment.mediaId) {
      console.log('[PUBLIC_READER] ASSIGNMENT_FOUND', { 
        requestId, 
        key: 'service-card-assignment:brand-hero',
        mediaId: assignment.mediaId 
      });
      
      // Resolve mediaId through public media gate (rejects Drive references)
      const { resolvePublicMedia } = await import('@/lib/media');
      const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
      
      if (resolvedMedia) {
        console.log('[PUBLIC_MEDIA_GATE] BRAND_HERO_APPROVED', { 
          requestId, 
          mediaId: assignment.mediaId,
          resolvedMediaId: resolvedMedia.id 
        });
        // Return hero with runtime mediaId (only if it passed public media gate)
        return {
          ...manifest.homepageHero,
          mediaId: assignment.mediaId,
        };
      } else {
        console.error('[PUBLIC_MEDIA_GATE] BRAND_HERO_REJECTED', {
          requestId,
          mediaId: assignment.mediaId
        });
        // Reject assignment if it doesn't resolve to PublishedMediaAsset
        // P0 FIX: Do NOT fall back to static without independent verification
        // Static authority may contain incomplete media that also fails public proof
      }
    }
  } catch (error) {
    console.error('[PUBLIC_READER] ASSIGNMENT_LOAD_FAILED - FAILING CLOSED', { requestId, error });
  }

  // P0 FIX: No static fallback - return null mediaId if no runtime assignment
  // This prevents authority bypass and resurrection of deleted/rejected media
  console.log('[PUBLIC_READER] NO_RUNTIME_ASSIGNMENT - RETURNING_NULL_MEDIAID', { requestId });
  return {
    ...manifest.homepageHero,
    mediaId: null, // No image without runtime assignment
  };
}

/**
 * Get owner portrait
 * Returns owner portrait or null if not set
 * Applies runtime assignment from persistent store if available
 * Uses public media gate to ensure only PublishedMediaAsset can be returned
 */
export async function getOwnerPortrait(): Promise<BrandOwnerPortrait | null> {
  const requestId = `portrait-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const manifest = loadBrandManifest();
  
  console.log('[BRAND] OWNER_PORTRAIT_REQUEST', { requestId });
  
  // Try to load runtime assignment for brand-portrait
  try {
    const { getServiceCardAssignment } = await import('@/lib/assignment-store');
    const assignment = await getServiceCardAssignment('brand-portrait', requestId);
    
    if (assignment && assignment.mediaId) {
      console.log('[BRAND] Runtime assignment loaded for portrait:', { requestId, mediaId: assignment.mediaId });
      
      // Resolve mediaId through public media gate (rejects Drive references)
      const { resolvePublicMedia } = await import('@/lib/media');
      const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
      
      if (resolvedMedia) {
        console.log('[PUBLIC_MEDIA_GATE] BRAND_PORTRAIT_APPROVED', { 
          requestId, 
          mediaId: assignment.mediaId,
          resolvedMediaId: resolvedMedia.id 
        });
        // Return portrait with runtime mediaId (only if it passed public media gate)
        return {
          ...manifest.ownerPortrait,
          mediaId: assignment.mediaId,
        };
      } else {
        console.error('[PUBLIC_MEDIA_GATE] BRAND_PORTRAIT_REJECTED', {
          requestId,
          mediaId: assignment.mediaId
        });
        // Reject assignment if it doesn't resolve to PublishedMediaAsset
        // P0 FIX: Do NOT fall back to static without independent verification
      }
    }
  } catch (error) {
    console.error('[BRAND] ASSIGNMENT_LOAD_FAILED - FAILING CLOSED', { requestId, error });
  }

  // P0 FIX: No static fallback - return null mediaId if no runtime assignment
  console.log('[BRAND] NO_RUNTIME_ASSIGNMENT - RETURNING_NULL_MEDIAID', { requestId });
  return {
    ...manifest.ownerPortrait,
    mediaId: null, // No image without runtime assignment
  };
}

/**
 * Get logo
 */
export function getLogo() {
  const manifest = loadBrandManifest();
  return manifest.logo;
}

/**
 * Get team photos
 */
export function getTeamPhotos() {
  const manifest = loadBrandManifest();
  return manifest.team;
}

/**
 * Get office photo
 */
export function getOfficePhoto() {
  const manifest = loadBrandManifest();
  return manifest.office;
}

/**
 * Get marketing assets
 */
export function getMarketingAssets() {
  const manifest = loadBrandManifest();
  return manifest.marketingAssets;
}

/**
 * Clear brand cache (useful for testing or hot reload)
 */
export function clearBrandCache(): void {
  clearAuthorityCache("@/config/brand.v1.json");
}
