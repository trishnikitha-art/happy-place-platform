/**
 * Single source of truth for all imagery (Directive 031 / 033).
 *
 * COMPONENTS NEVER reference raw image paths or filenames. They ask for an
 * IMAGE ROLE — e.g. photoFor("FeaturedTransformation"), servicePhoto("fences"),
 * galleryAll() — and get a fully-resolved MediaImage. This is "content
 * authority": every page asks the photo system for the best image by role,
 * never by filename, so routing logic lives in exactly one place.
 *
 * Human curation decisions (roles, priorities, homepage picks, featured image)
 * live in `presentation.v1.json`. Machine-generated image records live in
 * `gallery.json`. This file merges them at runtime.
 *
 * The 18 real owner photos are cataloged in presentation.v1.json — each with
 * roles, a priority (0-100), and quality gates (hero/gallery/service). No
 * image is orphaned: every photo carries at least one role. When new photos
 * arrive, you edit presentation.v1.json; components don't change.
 *
 * Until a truly premium WIDE exterior exists, HeroBackground is intentionally
 * vacant — the hero is an abstract, confident composition (no stretched photo).
 */
import gallery from "@/config/gallery.json";
import presentation from "@/config/presentation.v1.json";

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

export type Role =
  | "HeroBackground"
  | "FeaturedTransformation"
  | "FenceCover"
  | "BathroomCover"
  | "KitchenCover"
  | "GalleryHighlight"
  | "GallerySupporting"
  | "HomepageFeature"
  | "ServicesFeature"
  | "AboutPortrait"
  | "OwnerPortrait"
  | "ProjectCover"
  | "ReviewBackground";

interface PhotoMeta {
  id: string;
  category: string;
  roles: Role[];
  priority: number; // 0-100, higher = more compelling for that role
  quality: { hero: boolean; gallery: boolean; service: boolean };
}

/**
 * PHOTO ROLES — sourced from presentation.v1.json (Directive 033).
 * Human curation lives in the JSON file; this module reads it at import time.
 * Edit presentation.v1.json to re-route the whole site.
 */
const PHOTO_ROLES: PhotoMeta[] = (presentation as any).photoRoles;

const G = gallery as unknown as { projects: any[]; images: GalleryRecord[] };
const BY_ID = new Map(G.images.map((i) => [i.id, i]));
const ROLE_BY_ID = new Map(PHOTO_ROLES.map((m) => [m.id, m]));

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

/** Best photo for a role (highest priority with a real src). Null if none. */
export function photoFor(role: Role): MediaImage | null {
  const hits = PHOTO_ROLES.filter((m) => m.roles.includes(role) && m.quality.gallery)
    .sort((a, b) => b.priority - a.priority)
    .map((m) => BY_ID.get(m.id))
    .filter((r): r is GalleryRecord => !!r && !!r.src);
  return hits.length ? toMedia(hits[0]) : null;
}

/**
 * Photo for a service card by slug. Prefers that service's own category; if a
 * service has no native photo yet (e.g. decks/pergolas/kitchen), it returns null
 * to show a tasteful placeholder state. No proxy images — honest placeholder
 * until real photography arrives.
 */
export function servicePhoto(slug: string): MediaImage | null {
  const cat = SERVICE_CATEGORY[slug];
  if (!cat) return null;
  const hits = PHOTO_ROLES.filter(
    (m) => m.category === cat && m.quality.service,
  )
    .sort((a, b) => b.priority - a.priority)
    .map((m) => BY_ID.get(m.id))
    .filter((r): r is GalleryRecord => !!r && !!r.src);
  if (hits.length) return toMedia(hits[0]);
  // Return null for services without real photos — component shows placeholder
  return null;
}

/**
 * HOMEPAGE = hand-curated, emotional (Directive 034). The creative director picks
 * — 6 max, story-led, distinct. The archive (galleryAll) is the automatic,
 * exhaustive product. Two different goals, two different selectors.
 * Sourced from presentation.v1.json.
 */
const HOMEPAGE_CURATION: string[] = (presentation as any).homepageCuration;

/** The single most important image after the hero. Sourced from presentation.v1.json. */
export function featuredTransformation(): MediaImage | null {
  return byId((presentation as any).featuredTransformationId);
}

/** Curated homepage set (magazine cover). Repairs excluded here — trust-builders,
 *  surfaced lower / in the archive, not as aspiration. */
export function homepageSelection(): MediaImage[] {
  return HOMEPAGE_CURATION.map(byId).filter((m) => !!m) as MediaImage[];
}

function byId(id: string): MediaImage | null {
  const r = BY_ID.get(id);
  return r && r.src ? toMedia(r) : null;
}

/** Gallery selection — the FULL museum. Every cataloged photo, grouped by project,
 *  ordered by priority. Nothing is orphaned; nothing is hidden. */
export function galleryAll(): { project: string; category: string; images: MediaImage[] }[] {
  const byProject = new Map<string, GalleryRecord[]>();
  for (const m of PHOTO_ROLES) {
    const r = BY_ID.get(m.id);
    if (!r || !r.src) continue;
    if (!byProject.has(r.project)) byProject.set(r.project, []);
    byProject.get(r.project)!.push(r);
  }
  return [...byProject.entries()]
    .map(([project, recs]) => ({
      project,
      category: recs[0]?.category ?? "",
      images: recs
        .map((r) => ({ r, m: ROLE_BY_ID.get(r.id)! }))
        .sort((a, b) => b.m.priority - a.m.priority)
        .map((x) => toMedia(x.r)),
    }))
    .filter((g) => g.images.length > 0);
}

/** Reserved single Taylor & Lanie portrait (homepage owner section + About only). */
export function ownerPortrait(): MediaImage {
  return FALLBACK.owner;
}

export function hasRealPhotos(): boolean {
  return G.images.some((i) => i.src);
}

// Maps service slugs → pipeline category (from presentation.v1.json).
const SERVICE_CATEGORY: Record<string, string> = (presentation as any).serviceCategory;

// Real pipeline images as GalleryItem[] (for the lightbox / full gallery grid).
// Derived from SERVICE_CATEGORY — these are inverses.
function invertMap(m: Record<string, string>): Record<string, string> {
  const r: Record<string, string> = {};
  for (const k of Object.keys(m)) r[m[k]] = k;
  return r;
}
const CATEGORY_SERVICE = invertMap(SERVICE_CATEGORY);
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

// Committed reserved placeholders (only the owner portrait is intentionally
// reserved until a real Taylor & Lanie portrait is shot).
// Sourced from presentation.v1.json.
const FALLBACK: Record<string, MediaImage> = {
  owner: (presentation as any).fallback.owner,
};

/**
 * Backward-compatible intent resolver. New code should use photoFor /
 * servicePhoto / homepageHighlights / galleryAll. Kept so existing call sites
 * (hero falls through to abstract; service cards resolve by slug) keep working.
 */
export function media(key: string): MediaImage {
  if (key.startsWith("service:")) {
    const slug = key.slice("service:".length);
    const hit = servicePhoto(slug);
    if (hit) return hit;
  }
  if (key === "owner" || key === "about") return FALLBACK.owner;
  if (key === "hero") return FALLBACK.owner; // hero is abstract; no bg photo
  const rec = BY_ID.get(key);
  if (rec && rec.src) return toMedia(rec);
  return FALLBACK.owner;
}

export const galleryData = G;
