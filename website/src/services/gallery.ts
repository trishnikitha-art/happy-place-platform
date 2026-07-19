import type { GalleryItem, Project } from "@/types";
import { galleryItems, galleryByService, featuredGallery } from "@/config/gallery";
import { getProjects, getProject, featuredProject } from "@/config/projects";

/**
 * Gallery/Projects data service — INTERFACE.
 *
 * Today it reads configuration. Later it could read from an API/Drive without
 * changing components. Components depend on this interface only.
 */
export interface GalleryService {
  all(): GalleryItem[];
  byService(slug: string): GalleryItem[];
  featured(limit?: number): GalleryItem[];
  /** Project Spotlights (completed-project stories). */
  getProjects(): Project[];
  getProject(slug: string): Project | undefined;
  featuredProject(): Project | undefined;
}

export const mockGalleryService: GalleryService = {
  all: () => galleryItems,
  byService: (slug) => galleryByService(slug),
  featured: (limit) => featuredGallery(limit),
  getProjects: () => getProjects(),
  getProject: (slug) => getProject(slug),
  featuredProject: () => featuredProject(),
};

export const galleryService: GalleryService = mockGalleryService;
