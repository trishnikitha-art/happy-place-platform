import type { GalleryItem } from "@/types";

/**
 * Gallery items are structured assets (not just files). Each carries metadata
 * so the UI can filter by service / before-after / county without touching the
 * image bytes. `src` points to a placeholder today; swap the file in
 * public/images and update `src` to use the real client-owned photo.
 *
 * `width`/`height` are required by next/image for layout stability.
 */
export const galleryItems: GalleryItem[] = [
  { id: "deck-corvallis", project: "Backyard Entertainer Deck", service: "decks",
    category: "Decks",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/deck-corvallis.svg", alt: "Cedar entertainer deck with built-in seating in Corvallis", featured: true, beforeAfter: null, county: "benton", tags: ["deck", "cedar", "seating"], width: 1200, height: 800 },
  { id: "deck-albany", project: "Multi-Tier Deck", service: "decks",
    category: "Decks",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/deck-albany.svg", alt: "Multi-level composite deck in Albany", featured: false, beforeAfter: "after", county: "linn", tags: ["deck", "composite"], width: 1200, height: 800 },
  { id: "deck-salem", project: "Wraparound Deck", service: "decks",
    category: "Decks",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/deck-salem.svg", alt: "Wraparound pressure-treated deck in Salem", featured: false, beforeAfter: "after", county: "marion", tags: ["deck"], width: 1200, height: 800 },
  { id: "fence-philomath", project: "Cedar Privacy Fence", service: "fences",
    category: "Fences",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/fence-philomath.svg", alt: "Straight cedar privacy fence in Philomath", featured: true, beforeAfter: null, county: "benton", tags: ["fence", "cedar", "privacy"], width: 1200, height: 800 },
  { id: "fence-lebanon", project: "Shadowbox Fence", service: "fences",
    category: "Fences",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/fence-lebanon.svg", alt: "Shadowbox fence with gate in Lebanon", featured: false, beforeAfter: "after", county: "linn", tags: ["fence", "shadowbox"], width: 1200, height: 800 },
  { id: "pergola-corvallis", project: "Patio Pergola", service: "pergolas",
    category: "Pergolas",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/pergola-corvallis.svg", alt: "Freestanding cedar pergola over a patio in Corvallis", featured: false, beforeAfter: null, county: "benton", tags: ["pergola", "cedar"], width: 1200, height: 800 },
  { id: "kitchen-salem", project: "Farmhouse Kitchen", service: "kitchen-remodel",
    category: "Kitchens",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/kitchen-salem.svg", alt: "White farmhouse kitchen remodel in Salem", featured: true, beforeAfter: "after", county: "marion", tags: ["kitchen", "remodel"], width: 1200, height: 800 },
  { id: "kitchen-albany", project: "Island Kitchen", service: "kitchen-remodel",
    category: "Kitchens",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/kitchen-albany.svg", alt: "Kitchen with new island and cabinets in Albany", featured: false, beforeAfter: "after", county: "linn", tags: ["kitchen", "island"], width: 1200, height: 800 },
  { id: "bath-corvallis", project: "Walk-In Shower", service: "bath-remodel",
    category: "Bathrooms",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/bath-corvallis.svg", alt: "Tiled walk-in shower bathroom remodel in Corvallis", featured: false, beforeAfter: "after", county: "benton", tags: ["bath", "shower", "tile"], width: 1200, height: 800 },
  { id: "builtin-corvallis", project: "Mudroom Built-Ins", service: "built-ins",
    category: "Cabinets",
    orientation: "landscape",
    priority: 5, src: "/images/gallery/builtin-corvallis.svg", alt: "Mudroom bench with cubbies and shelving in Corvallis", featured: false, beforeAfter: null, county: "benton", tags: ["built-in", "mudroom", "trim"], width: 1200, height: 800 },
];

export function galleryByService(slug: string): GalleryItem[] {
  return galleryItems.filter((g) => g.service === slug);
}

export function featuredGallery(limit = 6): GalleryItem[] {
  return galleryItems.filter((g) => g.featured).slice(0, limit);
}
