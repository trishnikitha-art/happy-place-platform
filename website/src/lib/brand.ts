/**
 * Brand Authority Adapter
 * 
 * Provides intent-based access to brand assets.
 * Components never import brand.v1.json directly.
 */

import brand from "@/config/brand.v1.json";
import type { BrandManifest, BrandHero, BrandOwnerPortrait } from "@/types/brand";
import { clearAuthorityCache } from "./authority-loader";

let brandCache: BrandManifest | null = null;

export function loadBrandManifest(): BrandManifest {
  if (brandCache) return brandCache;
  brandCache = brand as BrandManifest;
  return brandCache;
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
  brandCache = null;
  // Note: brand.ts uses static import, so we only clear the local cache
  // The module itself remains loaded by Next.js
}
