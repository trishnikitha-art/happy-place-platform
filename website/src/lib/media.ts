/**
 * Media Authority Adapter
 * 
 * NEW ARCHITECTURE: Media Authority (media.v1.json)
 * The new architecture uses media.v1.json as the single media database.
 * Components use intent-based adapters to access media by intent, not IDs.
 * 
 * Legacy functions (heroBackground, ownerPortrait, servicePhoto, photoFor, etc.)
 * have been removed. Use Brand Authority for homepage hero and owner portraits.
 * Use Media Authority adapters for project media.
 * 
 * Architecture:
 *   Authority → Adapter → Component
 * 
 * Never:
 *   Component → JSON
 *   Component → Hardcoded IDs
 */
import type { Media, MediaManifest } from "@/types/media";
import { getProjectsByServiceSlug } from "@/lib/projects";
import type { Project } from "@/types/projects";

let mediaCache: MediaManifest | null = null;

export function loadMediaManifest(): MediaManifest {
  if (mediaCache) return mediaCache;
  try {
    const data = require("@/config/media.v1.json");
    mediaCache = data as MediaManifest;
    return mediaCache;
  } catch (error) {
    console.error("Failed to load media manifest:", error);
    return { version: "1.0.0", generatedAt: new Date().toISOString(), media: [] };
  }
}

/**
 * Get the full media manifest (for Authority Editor)
 */
export function getMediaManifest(): MediaManifest {
  return loadMediaManifest();
}

/**
 * Get media by ID from media.v1.json
 */
export function getMediaById(id: string): Media | null {
  const manifest = loadMediaManifest();
  return manifest.media.find((m: Media) => m.id === id) || null;
}

/**
 * Clear media cache (useful for testing or hot reload)
 */
export function clearMediaCache(): void {
  mediaCache = null;
}

/**
 * INTENT-BASED MEDIA ADAPTER
 * 
 * These functions provide intent-based lookups instead of exposing media IDs.
 * UI components ask for intent (getProjectMedia, getProjectHero) rather than
 * knowing about media IDs or file paths. This creates a stable API that can
 * change its implementation without affecting UI components.
 */

/**
 * Get all media for a project, sorted by order
 */
export function getProjectMedia(projectId: string) {
  const manifest = loadMediaManifest();
  return manifest.media
    .filter((m: Media) => m.projectId === projectId)
    .sort((a: Media, b: Media) => (a.order ?? 999) - (b.order ?? 999));
}

/**
 * Get hero image for a project
 */
export function getProjectHero(projectId: string): Media | null {
  const projectMedia = getProjectMedia(projectId);
  return projectMedia.find((m: Media) => m.roles.includes('hero')) || null;
}

/**
 * Get thumbnail for a project (first gallery image or hero)
 */
export function getProjectThumbnail(projectId: string): Media | null {
  const projectMedia = getProjectMedia(projectId);
  return projectMedia.find((m: Media) => m.roles.includes('gallery')) || getProjectHero(projectId);
}

/**
 * Get before/after pair for a project
 */
export function getProjectBeforeAfter(projectId: string): { before: Media | null; after: Media | null } {
  const projectMedia = getProjectMedia(projectId);
  return {
    before: projectMedia.find((m: Media) => m.roles.includes('before')) || null,
    after: projectMedia.find((m: Media) => m.roles.includes('after')) || null,
  };
}

/**
 * Get media by role for a project
 */
export function getProjectMediaByRole(projectId: string, role: string): Media | null {
  const projectMedia = getProjectMedia(projectId);
  return projectMedia.find((m: Media) => m.roles.includes(role as any)) || null;
}

/**
 * Get featured media for a service
 * Returns the hero image of the highest-ranked project for that service
 */
export function getFeaturedServiceMedia(serviceSlug: string): Media | null {
  const manifest = loadMediaManifest();
  
  // Get projects for this service from Projects Authority
  const projects = getProjectsByServiceSlug(serviceSlug);
  
  // Filter for published and featured projects
  const featuredProjects = projects.filter((p: Project) => p.status === 'completed' && p.featured);
  
  // Sort by featured status and completion date (most recent first)
  featuredProjects.sort((a: Project, b: Project) => {
    const dateA = new Date(a.completionDate || 0).getTime();
    const dateB = new Date(b.completionDate || 0).getTime();
    return dateB - dateA;
  });
  
  // Get the top project
  const topProject = featuredProjects[0];
  if (!topProject) return null;
  
  // Get hero media for the top project
  const heroMediaId = topProject.media.hero;
  if (!heroMediaId) return null;
  
  return getMediaById(heroMediaId);
}
