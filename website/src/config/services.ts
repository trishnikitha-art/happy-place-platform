import type { Service } from "@/types";

/**
 * Services. Every service defines its own estimate questions so the wizard can
 * render dynamically (no hardcoded conditionals). Photos upload is a global
 * step in the wizard; per-service questions focus on WHAT work + WHERE.
 *
 * Service photos are now sourced from media.ts via servicePhoto() - no hardcoded paths.
 */
export const services: Service[] = [
  {
    slug: "decks",
    title: "Decks & Patios",
    category: "outdoor-living",
    summary: "New decks, rebuilds, repairs, and refinishing for outdoor spaces you'll use every day.",
    description:
      "From ground-level patios to multi-tier entertainer decks, we design and build outdoor spaces meant for daily use — pressure-treated, cedar, or composite, built to code and detailed to last. We also repair, refinish, and stain existing decks.",
    icon: "Layers",
    stat: "150+ built",
    galleryRefs: ["deck-corvallis", "deck-albany", "deck-salem"],
    estimateQuestions: [
      { id: "deck_scope", label: "Scope of work?", type: "select", options: ["New build", "Repair / board replacement", "Resurface / re-stain only", "Painting / staining only"], required: true, isScopeQuestion: true },
      { id: "deck_size", label: "Rough size of the deck (sq ft)?", type: "number", placeholder: "e.g. 300", required: true },
      { id: "deck_height", label: "Is it ground-level or elevated?", type: "select", options: ["Ground level", "Low (1-3 steps)", "Elevated (2nd story)"], required: true },
      { id: "deck_material", label: "Preferred material?", type: "select", options: ["Not sure", "Pressure-treated", "Cedar", "Composite / Trex"], required: false },
      { id: "deck_features", label: "Any features?", type: "textarea", placeholder: "railings, stairs, pergola, built-in seating, lighting…", required: false },
    ],
    seo: { title: "Custom Deck Builders in the Mid-Willamette Valley", description: "Decks and patios built for Oregon weather by Happy Place Carpentry.", keywords: ["deck builder", "composite deck", "cedar deck", "Oregon deck"] },
  },
  {
    slug: "pergolas",
    title: "Pergolas & Outdoor Structures",
    category: "outdoor-living",
    summary: "Pergolas and covered structures that create comfortable outdoor spaces in every season.",
    description:
      "Pergolas, arbors, and covered structures built to complement the home and create comfortable outdoor rooms you will actually use. We also repair and refinish existing structures.",
    icon: "Tent",
    stat: "Custom shade",
    galleryRefs: ["pergola-corvallis"],
    estimateQuestions: [
      { id: "pergola_size", label: "Rough footprint (ft x ft)?", type: "text", placeholder: "e.g. 12x14", required: true },
      { id: "pergola_roof", label: "Open rafters or solid cover?", type: "select", options: ["Open", "Partial shade", "Solid roof"], required: true },
      { id: "pergola_attach", label: "Attached to house or freestanding?", type: "select", options: ["Freestanding", "Attached"], required: false },
    ],
    seo: { title: "Pergola Builders in the Willamette Valley", description: "Custom pergolas and outdoor structures by Happy Place Carpentry.", keywords: ["pergola", "outdoor structure", "shade structure"] },
  },
  {
    slug: "fences",
    title: "Fences & Gates",
    category: "fencing",
    summary: "Privacy fences, decorative fencing, repairs, staining, and gates built to last.",
    description:
      "Cedar, vinyl, or metal fencing and gates set straight and plumb, detailed to sit naturally with the home. We handle permits and respect property lines. We also repair, stain, and refinish existing fences.",
    icon: "Fence",
    stat: "Cedar & vinyl",
    galleryRefs: ["fence-philomath", "fence-lebanon"],
    estimateQuestions: [
      { id: "fence_scope", label: "Scope of work?", type: "select", options: ["New fence", "Repair (1-3 sections)", "Full replacement", "Painting / staining only"], required: true, isScopeQuestion: true },
      { id: "fence_length", label: "Approximate total length (linear ft)?", type: "number", placeholder: "e.g. 120", required: true },
      { id: "fence_height", label: "Desired height?", type: "select", options: ["4 ft", "6 ft", "8 ft", "Other"], required: true },
      { id: "fence_material", label: "Material preference?", type: "select", options: ["Not sure", "Cedar", "Pressure-treated", "Vinyl", "Metal"], required: false },
      { id: "fence_style", label: "Style notes?", type: "textarea", placeholder: "privacy, shadowbox, picket, horizontal slat…", required: false },
    ],
    seo: { title: "Fence Installation in Benton, Linn, Marion & Polk Counties", description: "Cedar, vinyl, and wood fence installation by Happy Place Carpentry.", keywords: ["fence installer", "cedar fence", "privacy fence", "Oregon fencing"] },
  },
  {
    slug: "kitchen-remodel",
    title: "Kitchen Remodeling",
    category: "remodeling",
    summary: "Kitchen updates ranging from cabinet installation to full remodels.",
    description:
      "Cabinetry, islands, flooring, and layout changes — full or partial remodels handled with clear communication and a clean job site.",
    icon: "Refrigerator",
    stat: "Islands & more",
    galleryRefs: ["kitchen-salem", "kitchen-albany"],
    estimateQuestions: [
      { id: "kitchen_scope", label: "Scope of work?", type: "select", options: ["Full gut remodel", "Cabinets + counters", "Island only", "Flooring + paint", "Cabinet painting only", "Not sure"], required: true, isScopeQuestion: true },
      { id: "kitchen_layout", label: "Changing the layout?", type: "boolean", required: false },
      { id: "kitchen_appliances", label: "Appliance changes?", type: "textarea", placeholder: "range, fridge, dishwasher relocation…", required: false },
    ],
    seo: { title: "Kitchen Remodeling in the Mid-Willamette Valley", description: "Kitchen remodels by Happy Place Carpentry.", keywords: ["kitchen remodel", "cabinet install", "kitchen renovation"] },
  },
  {
    slug: "bath-remodel",
    title: "Bathroom Remodeling",
    category: "remodeling",
    summary: "Bathrooms rebuilt with careful waterproofing, quality finishes, and long-term durability.",
    description:
      "Showers, vanities, tile, and full bath remodels with proper waterproofing and ventilation — done carefully and verified.",
    icon: "Bath",
    stat: "Waterproofed",
    galleryRefs: ["bath-corvallis"],
    estimateQuestions: [
      { id: "bath_count", label: "How many bathrooms?", type: "number", placeholder: "1", required: true },
      { id: "bath_scope", label: "Scope?", type: "select", options: ["Full remodel", "Shower/tub only", "Vanity + fixtures", "Tile + paint", "Painting only"], required: true, isScopeQuestion: true },
      { id: "bath_fixtures", label: "Fixture notes?", type: "textarea", placeholder: "walk-in shower, double vanity, freestanding tub…", required: false },
    ],
    seo: { title: "Bathroom Remodeling in the Willamette Valley", description: "Bathroom remodels by Happy Place Carpentry.", keywords: ["bathroom remodel", "walk-in shower", "tile bath"] },
  },
  {
    slug: "built-ins",
    title: "Cabinetry, Built-Ins & Trim",
    category: "finish-carpentry",
    summary: "Custom cabinetry, built-ins, trim, refacing, installation, and finish carpentry.",
    description:
      "Built-in shelving, mudroom benches, wainscoting, and trim work crafted to your space, your style, and the details that make it feel finished. We also install, reface, and refinish cabinets.",
    icon: "BookOpen",
    stat: "Fit to your home",
    galleryRefs: ["builtin-corvallis"],
    estimateQuestions: [
      { id: "builtin_scope", label: "Scope of project?", type: "select", options: ["Single small piece", "Multi-piece project"], required: true, isScopeQuestion: true },
      { id: "builtin_type", label: "What are you envisioning?", type: "textarea", placeholder: "mudroom bench, bookshelf wall, window seat, wainscoting…", required: true },
      { id: "builtin_location", label: "Which room?", type: "text", placeholder: "e.g. living room", required: false },
    ],
    seo: { title: "Custom Built-Ins & Trim Carpentry", description: "Built-ins and trim by Happy Place Carpentry.", keywords: ["built-ins", "custom shelving", "trim carpentry", "wainscoting"] },
  },
  {
    slug: "repairs",
    title: "Restoration & Repairs",
    category: "restoration-repair",
    summary: "Dry rot, water damage, structural repairs, drywall, trim, and restoration work done right.",
    description:
      "Dry rot repair, trim restoration, door repair, water damage repair, drywall repair, and structural carpentry — straightforward advice and reliable work focused on restoration rather than quick fixes.",
    icon: "Wrench",
    stat: "Honest advice",
    galleryRefs: [],
    estimateQuestions: [
      { id: "repair_what", label: "What needs restoration or repair?", type: "textarea", placeholder: "describe the issue…", required: true },
      { id: "repair_urgent", label: "Is it urgent / safety-related?", type: "boolean", required: false },
    ],
    seo: { title: "Carpentry Restoration & Repair Services", description: "Reliable carpentry restoration and repairs by Happy Place Carpentry.", keywords: ["carpentry repair", "dry rot repair", "trim restoration", "structural repair"] },
  },
  {
    slug: "painting",
    title: "Painting & Surface Restoration",
    category: "painting",
    summary: "Interior and exterior painting, staining, and meticulous surface preparation for finishes that last.",
    description:
      "Interior and exterior painting, deck staining, fence staining, cabinet painting, and surface restoration — proper prep, quality materials, and clean application that lasts.",
    icon: "Paintbrush",
    stat: "Interior & exterior",
    galleryRefs: [],
    estimateQuestions: [
      { id: "painting_location", label: "Interior or exterior?", type: "select", options: ["Interior", "Exterior", "Both"], required: true, isScopeQuestion: true },
      { id: "painting_surface", label: "What needs painting?", type: "select", options: ["Walls / ceilings", "Trim / baseboards", "Cabinets", "Deck", "Fence", "Multiple surfaces", "Not sure"], required: true },
      { id: "painting_sqft", label: "Approximate square footage?", type: "number", placeholder: "e.g. 1500", required: false, help: "Total surface area to be painted. Leave blank if unsure." },
      { id: "painting_prep", label: "Prep complexity?", type: "select", options: ["Minimal - good condition", "Standard - typical wear", "Extensive - scraping/repair needed"], required: true },
      { id: "painting_coats", label: "Number of coats?", type: "select", options: ["1 coat", "2 coats", "3 coats"], required: true },
      { id: "painting_details", label: "Additional details?", type: "textarea", placeholder: "color changes, specific areas, access issues…", required: false },
    ],
    seo: { title: "Painting & Surface Restoration in the Willamette Valley", description: "Interior and exterior painting, staining, and surface restoration by Happy Place Carpentry.", keywords: ["house painting", "deck staining", "fence staining", "cabinet painting", "surface restoration"] },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function servicesByCategory(categorySlug: string): Service[] {
  return services.filter((s) => s.category === categorySlug);
}

// Canonical service slug type — derived from the services array.
// Import this instead of re-declaring service identifier unions.
export type ServiceSlug = typeof services[number]["slug"];

