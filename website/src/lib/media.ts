/**
 * Single source of truth for all imagery (Directive 031 / 033).
 *
 * COMPONENTS NEVER reference raw image paths or filenames. They ask for an
 * IMAGE ROLE — e.g. photoFor("FeaturedTransformation"), servicePhoto("fences"),
 * galleryAll() — and get a fully-resolved MediaImage. This is "content
 * authority": every page asks the photo system for the best image by role,
 * never by filename, so routing logic lives in exactly one place.
 *
 * The 18 real owner photos are cataloged in PHOTO_ROLES below — each with
 * roles, a priority (0-100), and quality gates (hero/gallery/service). No
 * image is orphaned: every photo carries at least one role. When new photos
 * arrive, you add one entry here; components don't change.
 *
 * Until a truly premium WIDE exterior exists, HeroBackground is intentionally
 * vacant — the hero is an abstract, confident composition (no stretched photo).
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
 * PHOTO ROLES — the catalog (Directive 033).
 * Every one of the 18 real photos has a home. No orphans.
 * Edit priority/roles here to re-route the whole site.
 */
const PHOTO_ROLES: PhotoMeta[] = [
  { id: "bathroom-remodeling/bathroom-wall", category: "Bathroom Remodeling", roles: ["FeaturedTransformation", "BathroomCover", "HomepageFeature", "GalleryHighlight"], priority: 95, quality: { hero: false, gallery: true, service: true } },
  { id: "fences/fence-build", category: "Fencing", roles: ["FenceCover", "ServicesFeature", "HomepageFeature", "GalleryHighlight"], priority: 90, quality: { hero: false, gallery: true, service: true } },
  { id: "fences/fencerebuildmatchingstain", category: "Fencing", roles: ["FeaturedTransformation", "FenceCover", "GalleryHighlight"], priority: 85, quality: { hero: false, gallery: true, service: true } },
  { id: "built-ins/finishedcarpentry", category: "Custom Carpentry", roles: ["GalleryHighlight", "ServicesFeature", "KitchenCover"], priority: 80, quality: { hero: false, gallery: true, service: true } },
  { id: "repairs/trimrepair", category: "Repairs", roles: ["GalleryHighlight", "ServicesFeature", "FenceCover"], priority: 80, quality: { hero: false, gallery: true, service: true } },
  { id: "outdoor-living/img-0737", category: "Outdoor Living", roles: ["GalleryHighlight", "HomepageFeature"], priority: 62, quality: { hero: false, gallery: true, service: false } },
  { id: "outdoor-living/img-0841", category: "Outdoor Living", roles: ["GalleryHighlight", "ProjectCover"], priority: 58, quality: { hero: false, gallery: true, service: false } },
  { id: "outdoor-living/img-0559", category: "Outdoor Living", roles: ["GalleryHighlight", "HomepageFeature", "ServicesFeature"], priority: 60, quality: { hero: false, gallery: true, service: false } },
  { id: "outdoor-living/img-0535", category: "Outdoor Living", roles: ["GallerySupporting", "HomepageFeature"], priority: 55, quality: { hero: false, gallery: true, service: false } },
  { id: "outdoor-living/img-0555", category: "Outdoor Living", roles: ["GallerySupporting", "ProjectCover"], priority: 50, quality: { hero: false, gallery: true, service: false } },
  { id: "outdoor-living/img-0805", category: "Outdoor Living", roles: ["GallerySupporting", "ProjectCover"], priority: 50, quality: { hero: false, gallery: true, service: false } },
  { id: "repairs/floor0", category: "Repairs", roles: ["GallerySupporting", "ServicesFeature"], priority: 65, quality: { hero: false, gallery: true, service: true } },
  { id: "repairs/floor", category: "Repairs", roles: ["GallerySupporting", "ServicesFeature"], priority: 60, quality: { hero: false, gallery: true, service: true } },
  { id: "repairs/guttercleaning", category: "Repairs", roles: ["GallerySupporting", "ServicesFeature"], priority: 60, quality: { hero: false, gallery: true, service: true } },
  { id: "repairs/drywall", category: "Repairs", roles: ["GallerySupporting", "ServicesFeature"], priority: 55, quality: { hero: false, gallery: true, service: true } },
  { id: "repairs/img-0544", category: "Repairs", roles: ["GallerySupporting"], priority: 40, quality: { hero: false, gallery: true, service: false } },
  { id: "repairs/img-0546", category: "Repairs", roles: ["GallerySupporting"], priority: 38, quality: { hero: false, gallery: true, service: false } },
  { id: "built-ins/finishedcarpentry0", category: "Custom Carpentry", roles: ["GallerySupporting", "ServicesFeature"], priority: 70, quality: { hero: false, gallery: true, service: true } },
];

const G = gallery as { projects: any[]; images: GalleryRecord[] };
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
 * service has no native photo yet (e.g. decks/pergolas/kitchen), it uses an honest
 * proxy from a related category so the card is never blank. Last resort: a
 * homepage highlight. Nothing maps to the reserved owner placeholder.
 */
const SERVICE_PROXY: Record<string, string> = {
  decks: "Outdoor Living",        // no deck photo yet — real exterior stands in
  pergolas: "Outdoor Living",     // no pergola photo yet — real exterior stands in
  "kitchen-remodel": "Custom Carpentry", // no kitchen photo yet — real vanity/cabinetry stands in
};
export function servicePhoto(slug: string): MediaImage | null {
  const cat = SERVICE_CATEGORY[slug];
  if (!cat) return null;
  const score = (m: PhotoMeta) =>
    (m.category === cat ? 100 : 0) + (SERVICE_PROXY[slug] === m.category ? 60 : 0) + m.priority;
  const hits = PHOTO_ROLES.filter(
    (m) => (m.category === cat || SERVICE_PROXY[slug] === m.category) && m.quality.service,
  )
    .sort((a, b) => score(b) - score(a))
    .map((m) => BY_ID.get(m.id))
    .filter((r): r is GalleryRecord => !!r && !!r.src);
  if (hits.length) return toMedia(hits[0]);
  // never blank: borrow the strongest homepage highlight
  const hl = homepageSelection();
  return hl.length ? hl[0] : null;
}

/**
 * HOMEPAGE = hand-curated, emotional (Directive 034). The creative director picks
 * — 6 max, story-led, distinct. The archive (galleryAll) is the automatic,
 * exhaustive product. Two different goals, two different selectors.
 */
const HOMEPAGE_CURATION: string[] = [
  "fences/fence-build",                  // opening emotional image: warm cedar
  "outdoor-living/img-0737",            // outdoor living = emotional glue
  "bathroom-remodeling/bathroom-wall",  // bathroom transformation (grouped, not scattered)
  "fences/fencerebuildmatchingstain",   // fence staining transformation
  "outdoor-living/img-0841",            // project cover (garage sequence)
  "built-ins/finishedcarpentry",        // craftsmanship detail
];

/** The single most important image after the hero: warm + aspirational cedar fence. */
export function featuredTransformation(): MediaImage | null {
  return byId("fences/fence-build");
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

// Maps service slugs → pipeline category so real photos attach to the right card.
const SERVICE_CATEGORY: Record<string, string> = {
  decks: "Decks",
  fences: "Fencing",
  pergolas: "Pergolas",
  "kitchen-remodel": "Kitchen Remodeling",
  "bath-remodel": "Bathroom Remodeling",
  "built-ins": "Custom Carpentry",
  repairs: "Repairs",
};

export function hasRealPhotos(): boolean {
  return G.images.some((i) => i.src);
}

// Real pipeline images as GalleryItem[] (for the lightbox / full gallery grid).
const CATEGORY_SERVICE: Record<string, string> = {
  Decks: "decks",
  Fencing: "fences",
  Pergolas: "pergolas",
  "Kitchen Remodeling": "kitchen-remodel",
  "Bathroom Remodeling": "bath-remodel",
  "Custom Carpentry": "built-ins",
  Repairs: "repairs",
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

// Committed reserved placeholders (only the owner portrait is intentionally
// reserved until a real Taylor & Lanie portrait is shot).
const FALLBACK: Record<string, MediaImage> = {
  owner: { src: "/images/about.svg", alt: "Taylor & Lanie of Happy Place Carpentry", width: 1200, height: 900 },
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
