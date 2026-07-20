/**
 * Single source of truth for all imagery (Directive 031).
 *
 * Components NEVER reference raw image paths. They call `media.<intent>()` and
 * get a fully-resolved MediaImage ({ src, alt, width, height, blurDataURL, focal }).
 *
 * Today gallery.json is seeded empty → MediaImage falls back to the committed
 * SVG placeholders so the site renders. The moment `npm run images` populates
 * gallery.json from photo-intake/, every page upgrades to real photography with
 * ZERO component changes. Swapping local files for Google Drive later touches
 * only the pipeline + this loader, not the UI.
 */
import gallery from "@/config/gallery.json";

export interface MediaImage {
  src: string;
  alt: string;
  width: number;
  height: number;
  blurDataURL?: string;
  focal?: { x: number; y: number };
}

interface GalleryRecord {
  id: string;
  title: string;
  project: string;
  category: string;
  county: string;
  featured: boolean;
  before: boolean;
  after: boolean;
  hero: boolean;
  cover: boolean;
  alt: string;
  width: number;
  height: number;
  focal: { x: number; y: number };
  original: string;
  src: string | null;
  thumbnail?: string;
  blurDataURL?: string;
  variants?: { width: number; format: string; src: string }[];
}

const G = gallery as { projects: any[]; images: GalleryRecord[] };
const BY_ID = new Map(G.images.map((i) => [i.id, i]));

/**
 * INTENTIONAL CURATION (Directive 033). Photography has authority over copy.
 * We choose the most emotionally compelling image for each slot — never "the
 * first" — and keep hero / about / owner UNIQUE (no photo appears twice in the
 * marquee slots). `about`/`owner` intentionally resolve to the reserved
 * Taylor & Lanie portrait slot (single source) until a real portrait is shot.
 * Edit these IDs to re-route; components never change.
 */
const CURATION: Record<string, string> = {
  hero: "bathroom-remodeling/bathroom-wall", // best before→after transformation
  "service:bath-remodel": "bathroom-remodeling/bathroom-wall",
  "service:fences": "fences/fence-build",
  "service:built-ins": "built-ins/finishedcarpentry",
  "service:repairs": "repairs/trimrepair",
  "service:decks": "outdoor-living/img-0559", // no deck photo yet — real exterior beats an illustration
  "service:pergolas": "outdoor-living/img-0737",
  "service:kitchen-remodel": "outdoor-living/img-0535",
};

// Committed SVG placeholders — the deterministic fallback until real photos land.
const FALLBACK: Record<string, MediaImage> = {
  hero: { src: "/images/hero.svg", alt: "Happy Place Carpentry — custom carpentry in the Willamette Valley", width: 1600, height: 900 },
  about: { src: "/images/about.svg", alt: "Taylor & Lanie of Happy Place Carpentry", width: 1200, height: 900 },
  "service:decks": { src: "/images/services/decks.svg", alt: "Cedar decks & patios by Happy Place Carpentry", width: 800, height: 600 },
  "service:fences": { src: "/images/services/fences.svg", alt: "Cedar fences & gates by Happy Place Carpentry", width: 800, height: 600 },
  "service:pergolas": { src: "/images/services/pergolas.svg", alt: "Pergolas & outdoor structures by Happy Place Carpentry", width: 800, height: 600 },
  "service:kitchen-remodel": { src: "/images/services/kitchen.svg", alt: "Kitchen remodeling by Happy Place Carpentry", width: 800, height: 600 },
  "service:bath-remodel": { src: "/images/services/bath.svg", alt: "Bathroom remodeling by Happy Place Carpentry", width: 800, height: 600 },
  "service:built-ins": { src: "/images/services/builtins.svg", alt: "Built-ins & trim by Happy Place Carpentry", width: 800, height: 600 },
  "service:repairs": { src: "/images/services/repairs.svg", alt: "Repairs & handyman by Happy Place Carpentry", width: 800, height: 600 },
};

function toMedia(r: GalleryRecord): MediaImage {
  return {
    src: r.src ?? (r.variants?.find((v) => v.format === "webp")?.src ?? "/images/hero.svg"),
    alt: r.alt,
    width: r.width,
    height: r.height,
    blurDataURL: r.blurDataURL,
    focal: r.focal,
  };
}

/** Resolve an image by intent. Real photo if present in gallery.json, else fallback SVG. */
export function media(key: string): MediaImage {
  // 0) intentional curation overlay (Directive 033) — takes priority
  const curatedId = CURATION[key];
  if (curatedId) {
    const cr = BY_ID.get(curatedId);
    if (cr && cr.src) return toMedia(cr);
  }

  // 1) explicit record id (e.g. "deck-build-corvallis/hero")
  const rec = BY_ID.get(key);
  if (rec && rec.src) return toMedia(rec);

  // 2) intent keys resolve to REAL photos when present, else SVG fallback
  if (key === "hero") {
    const hit = G.images.find((i) => i.hero && i.src) ?? G.images.find((i) => i.after && i.src);
    return hit ? toMedia(hit) : FALLBACK.hero;
  }
  if (key === "about" || key === "owner") {
    // Reserved Taylor & Lanie portrait slot (Directive 033). ONE intentional
    // location, homepage owner section + About only. Until a real portrait is
    // shot this stays the reserved placeholder — never a random reused photo.
    return FALLBACK.about;
  }
  if (key.startsWith("service:")) {
    const slug = key.slice("service:".length);
    const cat = SERVICE_CATEGORY[slug];
    if (cat) {
      const hit = G.images.find((i) => i.category === cat && i.src && (i.hero || i.after || i.cover))
        ?? G.images.find((i) => i.category === cat && i.src);
      if (hit) return toMedia(hit);
    }
    return FALLBACK[key] ?? FALLBACK.hero;
  }
  // 3) project:<slug> → its hero
  if (key.startsWith("project:")) {
    const slug = key.slice("project:".length);
    const proj = G.projects.find((p: any) => p.slug === slug);
    const hero = proj?.images?.hero?.src ? BY_ID.get(proj.images.hero.id) : null;
    if (hero && hero.src) return toMedia(hero);
  }
  // 4) category:<name> → first real image
  if (key.startsWith("category:")) {
    const cat = key.slice("category:".length);
    const hit = G.images.find((i) => i.category === cat && i.src && (i.hero || i.after));
    if (hit) return toMedia(hit);
  }
  // 5) graceful last resort
  return FALLBACK[key] ?? FALLBACK.hero;
}

// Maps service slugs → pipeline category so real photos attach to the right card.
const SERVICE_CATEGORY: Record<string, string> = {
  "decks": "Decks",
  "fences": "Fencing",
  "pergolas": "Pergolas",
  "kitchen-remodel": "Kitchen Remodeling",
  "bath-remodel": "Bathroom Remodeling",
  "built-ins": "Custom Carpentry",
  "repairs": "Repairs",
};

export function hasRealPhotos(): boolean {
  return G.images.some((i) => i.src);
}

// Real pipeline images as GalleryItem[] (for the lightbox / full gallery grid).
const CATEGORY_SERVICE: Record<string, string> = {
  "Decks": "decks",
  "Fencing": "fences",
  "Pergolas": "pergolas",
  "Kitchen Remodeling": "kitchen-remodel",
  "Bathroom Remodeling": "bath-remodel",
  "Custom Carpentry": "built-ins",
  "Repairs": "repairs",
  "Outdoor Living": "outdoor-living",
};
export function realGalleryItems() {
  return G.images
    .filter((i) => i.src && !i.before)
    .map((i) => ({
      id: i.id,
      project: i.project,
      service: CATEGORY_SERVICE[i.category] ?? "decks",
      src: i.src as string,
      alt: i.alt,
      featured: Boolean(i.hero),
      beforeAfter: null,
      county: i.county,
      tags: [i.category.toLowerCase()],
      width: i.width,
      height: i.height,
      category: i.category,
      orientation: (i.width >= i.height ? "landscape" : "portrait") as "landscape" | "portrait" | "square",
      blurDataURL: i.blurDataURL,
    }));
}

export const galleryData = G;
