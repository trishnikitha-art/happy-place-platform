import type { GalleryItem } from "@/types";
import { galleryItems, galleryByService, featuredGallery } from "@/config/gallery";

/**
 * Gallery data service — INTERFACE.
 *
 * Today it reads configuration. Later it could read from an API/Drive without
 * changing components. Components depend on this interface only.
 */
export interface GalleryService {
  all(): GalleryItem[];
  byService(slug: string): GalleryItem[];
  featured(limit?: number): GalleryItem[];
}

export const mockGalleryService: GalleryService = {
  all: () => galleryItems,
  byService: (slug) => galleryByService(slug),
  featured: (limit) => featuredGallery(limit),
};
