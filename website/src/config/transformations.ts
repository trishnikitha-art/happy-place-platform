import type { MediaImage } from "@/lib/media";
import { photoFor } from "@/lib/media";

export interface Transformation {
  id: string;
  title: string;
  summary: string;
  county?: string;
  service?: string;
  image: MediaImage;
}

/**
 * Transformation stories for the homepage "Real transformations" section.
 * These use the REAL before→after composite photos (single split-screen
 * frames) — shown honestly as transformation cards, not fake sliders.
 * Each pulls its image by ROLE from the photo authority, so adding a photo
 * to media.ts (with the right role) updates this automatically.
 */
function t(
  id: string,
  title: string,
  summary: string,
  role: Parameters<typeof photoFor>[0],
  opts: { county?: string; service?: string } = {},
): Transformation {
  const image = photoFor(role);
  return {
    id,
    title,
    summary,
    county: opts.county,
    service: opts.service,
    image: image ?? { src: "/images/about.svg", alt: title, width: 1200, height: 900 },
  };
}

export const Transformation: Transformation[] = [
  // Aspirational first — the homepage leads with what life looks like.
  t("fence-build", "Cedar Fence, Built", "Straight lines, matched stain, posts that stay put.", "FenceCover", { county: "Willamette Valley", service: "Fences" }),
  t("bathroom-wall", "Bathroom Remodel", "Tile, fixtures, and finish — built to feel calm.", "BathroomCover", { county: "Willamette Valley", service: "Bathroom" }),
  t("vanity", "Vanity Reface", "Custom carpentry that fits the room.", "KitchenCover", { county: "Willamette Valley", service: "Built-Ins" }),
  // Trust-builders lower — repairs earn their place, they do not lead.
  t("trim-repair", "Rotten Trim, Repaired", "Corner board rebuilt and sealed against the foundation.", "GalleryHighlight", { county: "Willamette Valley", service: "Repairs" }),
  t("gutter-clean", "Gutters, Restored", "From moss-covered to clean and maintained.", "GallerySupporting", { county: "Willamette Valley", service: "Repairs" }),
  t("flooring", "Flooring, Refreshed", "From worn carpet to clean finished floor.", "ServicesFeature", { county: "Willamette Valley", service: "Repairs" }),
];
