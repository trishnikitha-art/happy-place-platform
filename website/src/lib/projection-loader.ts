/**
 * Constitutional Projection Loader
 * 
 * Loads projection artifacts that were generated at build time.
 * These are static JSON imports that work in both server and client.
 * React components receive static JSON as immutable data.
 */

import heroProjection from '../../.generated/hero-projection.json';
import galleryProjection from '../../.generated/gallery-projection.json';
import serviceProjection from '../../.generated/service-projection.json';

import type { HeroProjection } from '@/types/projections';
import type { GalleryProjection } from '@/types/projections';
import type { ServiceProjection } from '@/types/projections';

/**
 * Load hero projection
 */
export function loadHeroProjection(): HeroProjection {
  return heroProjection as HeroProjection;
}

/**
 * Load gallery projection
 */
export function loadGalleryProjection(): GalleryProjection {
  return galleryProjection as GalleryProjection;
}

/**
 * Load service projection
 */
export function loadServiceProjection(): ServiceProjection {
  return serviceProjection as ServiceProjection;
}
