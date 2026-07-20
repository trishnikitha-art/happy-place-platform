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
  // 1) explicit project/hero id
  const rec = BY_ID.get(key);
  if (rec && rec.src) return toMedia(rec);
  // 2) intent key (hero, about, service:decks, ...)
  if (FALLBACK[key]) return FALLBACK[key];
  // 3) any project whose slug matches `project:<slug>` → its hero
  if (key.startsWith("project:")) {
    const slug = key.slice("project:".length);
    const proj = G.projects.find((p: any) => p.slug === slug);
    const hero = proj?.images?.hero?.src ? BY_ID.get(proj.images.hero.id) : null;
    if (hero && hero.src) return toMedia(hero);
  }
  // 4) category → first featured real image, else fallback by category
  if (key.startsWith("category:")) {
    const cat = key.slice("category:".length);
    const hit = G.images.find((i) => i.category === cat && i.src && (i.hero || i.after));
    if (hit) return toMedia(hit);
  }
  // 5) graceful last resort
  return FALLBACK.hero;
}

export function hasRealPhotos(): boolean {
  return G.images.some((i) => i.src);
}

export const galleryData = G;
