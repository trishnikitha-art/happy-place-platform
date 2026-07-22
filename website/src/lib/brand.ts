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
 */
export function getHomepageHero(): BrandHero | null {
  const manifest = loadBrandManifest();
  return manifest.homepageHero;
}

/**
 * Get owner portrait
 * Returns owner portrait or null if not set
 */
export function getOwnerPortrait(): BrandOwnerPortrait | null {
  const manifest = loadBrandManifest();
  return manifest.ownerPortrait;
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
