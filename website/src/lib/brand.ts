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
 * Uses static configuration from brand.v1.json
 * Uses public media gate to ensure only PublishedMediaAsset can be returned
 * DEVELOPMENT FALLBACK: Uses static authority when KV is unavailable for development testing
 */
export async function getHomepageHero(): Promise<BrandHero | null> {
  const requestId = `hero-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const manifest = loadBrandManifest();
  
  console.log('[PUBLIC_READER] HOMEPAGE_HERO_REQUEST', { requestId });
  
  // Use static configuration directly for brand hero
  // Brand media is authoritative in brand.v1.json, not through runtime assignments
  if (manifest.homepageHero.mediaId) {
    console.log('[PUBLIC_READER] STATIC_BRAND_HERO_MEDIA_ID', {
      requestId,
      mediaId: manifest.homepageHero.mediaId
    });
    
    // Resolve mediaId through public media gate (rejects Drive references)
    const { resolvePublicMedia, getMediaByIdAsync } = await import('@/lib/media');
    const resolvedMedia = await resolvePublicMedia(manifest.homepageHero.mediaId);
    
    if (resolvedMedia) {
      console.log('[PUBLIC_MEDIA_GATE] BRAND_HERO_APPROVED', { 
        requestId, 
        mediaId: manifest.homepageHero.mediaId,
        resolvedMediaId: resolvedMedia.id 
      });
      // Return the full resolved Media object
      return {
        ...manifest.homepageHero,
        mediaId: manifest.homepageHero.mediaId,
        resolvedMedia,
      };
    } else {
      console.error('[PUBLIC_MEDIA_GATE] BRAND_HERO_REJECTED', {
        requestId,
        mediaId: manifest.homepageHero.mediaId
      });
      
      // Development fallback: try static authority when KV is unavailable
      if (process.env.NODE_ENV === 'development') {
        try {
          const staticMedia = await getMediaByIdAsync(manifest.homepageHero.mediaId);
          if (staticMedia && staticMedia.storage === 'static') {
            console.log('[BRAND] STATIC_FALLBACK_RESOLUTION', { 
              requestId, 
              mediaId: manifest.homepageHero.mediaId,
              reason: 'KV authority unavailable, using static fallback' 
            });
            return {
              ...manifest.homepageHero,
              mediaId: manifest.homepageHero.mediaId,
              resolvedMedia: staticMedia,
            };
          }
        } catch (error) {
          console.error('[BRAND] STATIC_FALLBACK_FAILED', { 
            requestId, 
            mediaId: manifest.homepageHero.mediaId,
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }
  }

  // P0 FIX: No static fallback - return null mediaId if no valid media
  console.log('[PUBLIC_READER] NO_STATIC_MEDIA_ID - RETURNING_NULL_MEDIAID', { requestId });
  return {
    ...manifest.homepageHero,
    mediaId: null, // No image without valid media
  };
}

/**
 * Get owner portrait
 * Returns owner portrait or null if not set
 * Uses static configuration from brand.v1.json
 * Uses public media gate to ensure only PublishedMediaAsset can be returned
 * DEVELOPMENT FALLBACK: Uses static authority when KV is unavailable for development testing
 */
export async function getOwnerPortrait(): Promise<BrandOwnerPortrait | null> {
  const requestId = `portrait-get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const manifest = loadBrandManifest();
  
  console.log('[BRAND] OWNER_PORTRAIT_REQUEST', { requestId });
  
  // Use static configuration directly for owner portrait
  // Brand media is authoritative in brand.v1.json, not through runtime assignments
  if (manifest.ownerPortrait.mediaId) {
    console.log('[BRAND] STATIC_OWNER_PORTRAIT_MEDIA_ID', {
      requestId,
      mediaId: manifest.ownerPortrait.mediaId
    });
    
    // Resolve mediaId through public media gate (rejects Drive references)
    const { resolvePublicMedia, getMediaByIdAsync } = await import('@/lib/media');
    const resolvedMedia = await resolvePublicMedia(manifest.ownerPortrait.mediaId);
    
    if (resolvedMedia) {
      console.log('[PUBLIC_MEDIA_GATE] BRAND_PORTRAIT_APPROVED', { 
        requestId, 
        mediaId: manifest.ownerPortrait.mediaId,
        resolvedMediaId: resolvedMedia.id 
      });
      // Return the full resolved Media object
      return {
        ...manifest.ownerPortrait,
        mediaId: manifest.ownerPortrait.mediaId,
        resolvedMedia,
      };
    } else {
      console.error('[PUBLIC_MEDIA_GATE] BRAND_PORTRAIT_REJECTED', {
        requestId,
        mediaId: manifest.ownerPortrait.mediaId
      });
      
      // Development fallback: try static authority when KV is unavailable
      if (process.env.NODE_ENV === 'development') {
        try {
          const staticMedia = await getMediaByIdAsync(manifest.ownerPortrait.mediaId);
          if (staticMedia && staticMedia.storage === 'static') {
            console.log('[BRAND] STATIC_FALLBACK_RESOLUTION', { 
              requestId, 
              mediaId: manifest.ownerPortrait.mediaId,
              reason: 'KV authority unavailable, using static fallback' 
            });
            return {
              ...manifest.ownerPortrait,
              mediaId: manifest.ownerPortrait.mediaId,
              resolvedMedia: staticMedia,
            };
          }
        } catch (error) {
          console.error('[BRAND] STATIC_FALLBACK_FAILED', { 
            requestId, 
            mediaId: manifest.ownerPortrait.mediaId,
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }
    }
  }

  // P0 FIX: No static fallback - return null mediaId if no valid media
  console.log('[BRAND] NO_STATIC_MEDIA_ID - RETURNING_NULL_MEDIAID', { requestId });
  return {
    ...manifest.ownerPortrait,
    mediaId: null, // No image without valid media
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
export function getOffice() {
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
