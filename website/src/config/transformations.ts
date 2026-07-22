import type { MediaImage } from "@/lib/media";
import { photoFor } from "@/lib/media";

export interface Transformation {
  id: string;
  title: string;
  summary: string;
  county?: string;
  service?: string;
  image: MediaImage;
  problem?: string;
  solution?: string;
  result?: string;
  timeline?: string;
  scope?: string;
  servicesInvolved?: string[];
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
  opts: { 
    county?: string; 
    service?: string;
    problem?: string;
    solution?: string;
    result?: string;
    timeline?: string;
    scope?: string;
    servicesInvolved?: string[];
  } = {},
): Transformation {
  const image = photoFor(role);
  return {
    id,
    title,
    summary,
    county: opts.county,
    service: opts.service,
    problem: opts.problem,
    solution: opts.solution,
    result: opts.result,
    timeline: opts.timeline,
    scope: opts.scope,
    servicesInvolved: opts.servicesInvolved,
    image: image ?? { src: "/images/about.svg", alt: title, width: 1200, height: 900 },
  };
}

export const Transformation: Transformation[] = [
  // Aspirational first — the homepage leads with what life looks like.
  t("fence-build", "From Overgrown to Private Retreat", "A cedar fence that defines the space and creates a peaceful backyard.", "FenceCover", { 
    county: "Willamette Valley", 
    service: "Fences",
    problem: "Backyard lacked privacy and definition from neighbors.",
    solution: "Built a custom cedar fence with proper post spacing and professional staining.",
    result: "Homeowners now enjoy a private outdoor space that feels like an extension of their home.",
    timeline: "3 days",
    scope: "60 linear feet, 6ft height",
    servicesInvolved: ["Fences", "Staining"]
  }),
  t("bathroom-wall", "From Water Damage to Spa Bathroom", "Complete bathroom rebuild with proper waterproofing and modern finishes.", "BathroomCover", { 
    county: "Willamette Valley", 
    service: "Bathroom",
    problem: "Old bathroom had water damage behind tile and outdated fixtures.",
    solution: "Complete gut remodel with new waterproofing, tile, vanity, and fixtures.",
    result: "A calm, modern bathroom that feels like a spa retreat.",
    timeline: "2 weeks",
    scope: "Full bathroom remodel",
    servicesInvolved: ["Bathroom Remodeling", "Tile", "Plumbing"]
  }),
  t("vanity", "From Builder Grade to Custom Storage", "Cabinet refacing and custom built-ins that maximize space.", "KitchenCover", { 
    county: "Willamette Valley", 
    service: "Built-Ins",
    problem: "Kitchen had generic builder-grade cabinets with wasted space.",
    solution: "Refaced cabinets and added custom built-in storage solutions.",
    result: "Kitchen feels custom and organized with storage that fits the family's needs.",
    timeline: "1 week",
    scope: "Cabinet refacing + built-ins",
    servicesInvolved: ["Cabinetry", "Built-Ins"]
  }),
  // Trust-builders lower — repairs earn their place, they do not lead.
  t("trim-repair", "From Rot to Restored", "Corner board rebuilt and sealed against the foundation.", "GalleryHighlight", { 
    county: "Willamette Valley", 
    service: "Repairs",
    problem: "Rotting corner board was allowing water intrusion near foundation.",
    solution: "Removed damaged wood, rebuilt corner board with proper sealing and flashing.",
    result: "Home is protected from water damage and exterior looks restored.",
    timeline: "1 day",
    scope: "Corner board replacement",
    servicesInvolved: ["Restoration & Repairs"]
  }),
  t("gutter-clean", "From Clogged to Flowing", "Gutters restored to proper function and appearance.", "GallerySupporting", { 
    county: "Willamette Valley", 
    service: "Repairs",
    problem: "Gutters were clogged with moss and not draining properly.",
    solution: "Cleaned gutters, repaired damaged sections, and installed guards.",
    result: "Water flows correctly away from the home, protecting the foundation.",
    timeline: "1 day",
    scope: "Gutter cleaning and repair",
    servicesInvolved: ["Restoration & Repairs"]
  }),
  t("flooring", "From Worn to Welcoming", "Flooring refreshed from worn carpet to clean finished floor.", "ServicesFeature", { 
    county: "Willamette Valley", 
    service: "Repairs",
    problem: "Old carpet was worn and dated the entire room.",
    solution: "Removed carpet and installed new finished flooring.",
    result: "Room feels modern, clean, and welcoming.",
    timeline: "2 days",
    scope: "Flooring replacement",
    servicesInvolved: ["Restoration & Repairs", "Flooring"]
  }),
];
