import type { GalleryItem } from "@/types";

/**
 * Image Registry — the single source of truth for curated photography.
 *
 * Architecture (Directive 032): Drive → Image Registry → Website.
 * Today the registry is fed from local config (gallery items / SVGs). Tomorrow
 * a Drive watcher populates the same shape; the website only ever asks the
 * registry for what it needs (e.g. "featured decks", "hero", "before/after of
 * project X"). Swapping the storage provider never touches React.
 */
export interface ImageAssetMeta {
  id: string;
  category: string; // Decks | Kitchens | Fences | Owner | BeforeAfter | ...
  orientation: "landscape" | "portrait" | "square";
  featured: boolean;
  hero: boolean;
  beforeAfter?: string; // id linking a before/after pair
  location?: string;
  tags: string[];
  priority: number; // 1–10; higher = more likely to be featured
}

/** Query the registry the way the UI does — intent, not file paths. */
export interface ImageQuery {
  category?: string;
  featured?: boolean;
  hero?: boolean;
  beforeAfter?: string;
  limit?: number;
  sortBy?: "priority" | "location";
}

export interface ImageRegistry {
  query(q?: ImageQuery): GalleryItem[];
  hero(): GalleryItem | undefined;
  featuredByCategory(category: string, limit?: number): GalleryItem[];
}

export function createImageRegistry(items: GalleryItem[]): ImageRegistry {
  const sortByPriority = (a: GalleryItem, b: GalleryItem) =>
    (b as GalleryItem & { priority?: number }).priority ?? 0 - ((a as GalleryItem & { priority?: number }).priority ?? 0);

  return {
    query(q: ImageQuery = {}) {
      let out = [...items];
      if (q.category) out = out.filter((i) => i.category === q.category);
      if (q.featured !== undefined) out = out.filter((i) => i.featured === q.featured);
      if (q.beforeAfter) out = out.filter((i) => i.beforeAfter === q.beforeAfter);
      out.sort(sortByPriority);
      return q.limit ? out.slice(0, q.limit) : out;
    },
    hero() {
      return [...items].sort(sortByPriority)[0];
    },
    featuredByCategory(category, limit = 4) {
      return this.query({ category, featured: true, limit });
    },
  };
}
