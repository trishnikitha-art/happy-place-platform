import type { GalleryItem, Project } from "@/types";
import { galleryItems, galleryByService, featuredGallery } from "@/config/gallery";
import { getProjects, getProject, featuredProject } from "@/config/projects";
import { createImageRegistry, type ImageRegistry, type ImageQuery } from "@/services/imageRegistry";

/**
 * Gallery/Projects data service — INTERFACE.
 *
 * Today it reads configuration. Later it could read from an API/Drive without
 * changing components. Components depend on this interface only.
 *
 * `registry()` exposes the intent-based Image Registry (Directive 032): the UI
 * asks for "featured decks" / "hero" instead of hardcoding file paths. Storage
 * provider changes never touch React.
 */
export interface GalleryService {
  all(): GalleryItem[];
  byService(slug: string): GalleryItem[];
  featured(limit?: number): GalleryItem[];
  /** Intent-based image queries (Drive-ready). */
  registry(): ImageRegistry;
  query(q?: ImageQuery): GalleryItem[];
  /** Project Spotlights (completed-project stories). */
  getProjects(): Project[];
  getProject(slug: string): Project | undefined;
  featuredProject(): Project | undefined;
}

export const mockGalleryService: GalleryService = {
  all: () => galleryItems,
  byService: (slug) => galleryByService(slug),
  featured: (limit) => featuredGallery(limit),
  registry: () => createImageRegistry(galleryItems),
  query: (q) => createImageRegistry(galleryItems).query(q),
  getProjects: () => getProjects(),
  getProject: (slug) => getProject(slug),
  featuredProject: () => featuredProject(),
};

export const galleryService: GalleryService = mockGalleryService;
