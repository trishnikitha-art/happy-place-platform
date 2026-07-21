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
 * HeroBackground is the primary full-width hero photograph (curated in
 * presentation.v1.json). Falls back to the abstract gradient if no photo is set.
 */
import gallery from "@/config/gallery.json";
import presentation from "@/config/presentation.v1.json";
import { buildPresentationAuthority } from "./presentation-authority";

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
  | "DeckCover"
  | "PergolaCover"
  | "BuiltInsCover"
  | "OutdoorLivingCover"
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

const G = gallery as unknown as { projects: any[]; images: GalleryRecord[] };
const BY_ID = new Map(G.images.map((i) => [i.id, i]));

// Build presentation authority once (constitutional index)
const PresentationAuthority = buildPresentationAuthority(presentation as any);

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
  const photoRoles = PresentationAuthority.getPhotoRoles();
  const hits = photoRoles.filter((m) => m.roles.includes(role) && m.quality.gallery)
    .sort((a, b) => b.priority - a.priority)
    .map((m) => BY_ID.get(m.id))
    .filter((r): r is GalleryRecord => !!r && !!r.src);
  return hits.length ? toMedia(hits[0]) : null;
}

/**
 * Photo for a service card by slug. Uses serviceCover mapping from presentation.v1.json
 * to get the specific cover role for each service. Returns null if no photo assigned.
 */
export function servicePhoto(slug: string): MediaImage | null {
  const coverRole = PresentationAuthority.getServiceCover(slug);
  if (!coverRole) return null;
  return photoFor(coverRole);
}

/**
 * HOMEPAGE = hand-curated, emotional (Directive 034). The creative director picks
 * — 6 max, story-led, distinct. The archive (galleryAll) is the automatic,
 * exhaustive product. Two different goals, two different selectors.
 * Sourced from presentation.v1.json.
 */

/** The single most important image after the hero. Sourced from presentation.v1.json. */
export function featuredTransformation(): MediaImage | null {
  return byId(PresentationAuthority.getFeaturedTransformationId());
}

/** Primary full-width hero background photograph. Sourced from presentation.v1.json. */
export function heroBackground(): MediaImage | null {
  return photoFor("HeroBackground");
}

/** Curated homepage set (magazine cover). Repairs excluded here — trust-builders,
 *  surfaced lower / in the archive, not as aspiration. */
export function homepageSelection(): MediaImage[] {
  const homepageCuration = PresentationAuthority.getHomepageCuration();
  return homepageCuration.map(byId).filter((m) => !!m) as MediaImage[];
}

function byId(id: string): MediaImage | null {
  const r = BY_ID.get(id);
  return r && r.src ? toMedia(r) : null;
}

/** Gallery selection — the FULL museum. Every cataloged photo, grouped by project,
 *  ordered by priority. Nothing is orphaned; nothing is hidden. */
export function galleryAll(): { project: string; category: string; images: MediaImage[] }[] {
  const photoRoles = PresentationAuthority.getPhotoRoles();
  const byProject = new Map<string, GalleryRecord[]>();
  for (const m of photoRoles) {
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
        .map((r) => ({ r, m: PresentationAuthority.getRole(r.id)! }))
        .sort((a, b) => b.m.priority - a.m.priority)
        .map((x) => toMedia(x.r)),
    }))
    .filter((g) => g.images.length > 0);
}

/** Reserved single Taylor & Lanie portrait (homepage owner section + About only). */
export function ownerPortrait(): MediaImage {
  return PresentationAuthority.getFallback("owner");
}

export function hasRealPhotos(): boolean {
  return G.images.some((i) => i.src);
}

// Real pipeline images as GalleryItem[] (for the lightbox / full gallery grid).
// Derived from serviceCategory mapping in presentation.v1.json.
export function realGalleryItems() {
  const photoRoles = PresentationAuthority.getPhotoRoles();
  const roleById = new Map(photoRoles.map((m) => [m.id, m]));
  
  return G.images
    .filter((i) => i.src)
    .map((i) => {
      const meta = roleById.get(i.id);
      // Check if any role indicates this is a "before" photo (excluded from gallery)
      const isBefore = meta?.roles?.some((r: string) => r.toLowerCase().includes("before")) ?? false;
      // Check if any role indicates this is a featured/hero photo
      const isFeatured = meta?.roles?.some((r: string) => 
        r.toLowerCase().includes("hero") || 
        r.toLowerCase().includes("featured") ||
        r === "ProjectCover"
      ) ?? false;
      
      return {
        id: i.id,
        project: i.project,
        service: PresentationAuthority.getServiceByCategory(i.category),
        src: i.src as string,
        alt: i.alt,
        featured: isFeatured,
        beforeAfter: null,
        county: i.county,
        tags: [i.category.toLowerCase()],
        width: i.width,
        height: i.height,
        category: i.category,
        orientation: (i.width >= i.height ? "landscape" : "portrait") as "landscape" | "portrait" | "square",
        blurDataURL: i.blurDataURL,
      };
    })
    .filter((i) => !i.beforeAfter);
}

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
  if (key === "owner" || key === "about") return PresentationAuthority.getFallback("owner");
  if (key === "hero") {
    const hero = heroBackground();
    if (hero) return hero;
    return PresentationAuthority.getFallback("owner");
  }
  const rec = BY_ID.get(key);
  if (rec && rec.src) return toMedia(rec);
  return PresentationAuthority.getFallback("owner");
}

export const galleryData = G;
