/**
 * Presentation Authority — constitutional index for human-curated decisions.
 *
 * This module builds a single index from presentation.json once, eliminating
 * repeated JSON parsing and lookups in media.ts functions.
 *
 * Architecture:
 *   presentation.json → PresentationAuthority → React
 *
 * Instead of:
 *   React → presentation.json → React → presentation.json → presentation.json
 */

import type { Role } from "./media";

interface PhotoMeta {
  id: string;
  category: string;
  roles: Role[];
  priority: number;
  quality: { hero: boolean; gallery: boolean; service: boolean };
}

interface PresentationData {
  photoRoles: PhotoMeta[];
  homepageCuration: string[];
  featuredTransformationId: string;
  serviceCategory: Record<string, string>;
  serviceCover: Record<string, Role>;
  fallback: Record<string, any>;
}

export class PresentationAuthority {
  private photoRoles: PhotoMeta[];
  private homepageCuration: string[];
  private featuredTransformationId: string;
  private serviceCategory: Record<string, string>;
  private serviceCover: Record<string, Role>;
  private fallback: Record<string, any>;
  
  // Indexes for fast lookup
  private roleById: Map<string, PhotoMeta>;
  private categoryService: Record<string, string>;

  constructor(presentation: PresentationData) {
    this.photoRoles = presentation.photoRoles || [];
    this.homepageCuration = presentation.homepageCuration || [];
    this.featuredTransformationId = presentation.featuredTransformationId || "";
    this.serviceCategory = presentation.serviceCategory || {};
    this.serviceCover = presentation.serviceCover || {};
    this.fallback = presentation.fallback || {};

    // Build indexes
    this.roleById = new Map(this.photoRoles.map((m) => [m.id, m]));
    this.categoryService = this.invertMap(this.serviceCategory);
  }

  private invertMap(m: Record<string, string>): Record<string, string> {
    const r: Record<string, string> = {};
    for (const k of Object.keys(m)) r[m[k]] = k;
    return r;
  }

  /**
   * Get photo metadata by ID.
   */
  getRole(id: string): PhotoMeta | undefined {
    return this.roleById.get(id);
  }

  /**
   * Get all photo roles.
   */
  getPhotoRoles(): PhotoMeta[] {
    return this.photoRoles;
  }

  /**
   * Get homepage curation IDs.
   */
  getHomepageCuration(): string[] {
    return this.homepageCuration;
  }

  /**
   * Get featured transformation ID.
   */
  getFeaturedTransformationId(): string {
    return this.featuredTransformationId;
  }

  /**
   * Get service cover role by service slug.
   */
  getServiceCover(slug: string): Role | undefined {
    return this.serviceCover[slug];
  }

  /**
   * Get service category by service slug.
   */
  getServiceCategory(slug: string): string | undefined {
    return this.serviceCategory[slug];
  }

  /**
   * Get service slug by category (inverse mapping).
   */
  getServiceByCategory(category: string): string {
    return this.categoryService[category] ?? "decks";
  }

  /**
   * Get fallback image by key.
   */
  getFallback(key: string): any {
    return this.fallback[key];
  }

  /**
   * Check if an ID has a specific role.
   */
  hasRole(id: string, role: Role): boolean {
    const meta = this.roleById.get(id);
    return meta?.roles.includes(role) ?? false;
  }

  /**
   * Get all IDs for a specific role.
   */
  getIdsForRole(role: Role): string[] {
    return this.photoRoles
      .filter((m) => m.roles.includes(role))
      .map((m) => m.id);
  }

  /**
   * Get IDs for a role, sorted by priority (highest first).
   */
  getIdsForRoleSorted(role: Role): string[] {
    return this.photoRoles
      .filter((m) => m.roles.includes(role))
      .sort((a, b) => b.priority - a.priority)
      .map((m) => m.id);
  }
}

/**
 * Build PresentationAuthority from presentation data.
 */
export function buildPresentationAuthority(presentation: PresentationData): PresentationAuthority {
  return new PresentationAuthority(presentation);
}
