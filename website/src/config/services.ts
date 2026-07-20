import type { Service } from "@/types";

/**
 * Services. Every service defines its own estimate questions so the wizard can
 * render dynamically (no hardcoded conditionals). Photos upload is a global
 * step in the wizard; per-service questions focus on WHAT work + WHERE.
 *
 * Image paths under /images/... are placeholders today; drop real client-owned
 * photos in public/images and update `src` here. The file is the only change.
 */
export const services: Service[] = [
  {
    slug: "decks",
    title: "Decks & Patios",
    category: "outdoor-living",
    summary: "Custom decks built for Oregon weather and your lifestyle.",
    description:
      "From ground-level patios to multi-tier entertainer decks, we design and build decks that extend your happy place outdoors. Pressure-treated, cedar, or composite — built to code and built to last.",
    icon: "Layers",
    stat: "150+ built",
    heroImage: "/images/services/decks.svg",
    galleryRefs: ["deck-corvallis", "deck-albany", "deck-salem"],
    estimateQuestions: [
      { id: "deck_size", label: "Rough size of the deck (sq ft)?", type: "number", placeholder: "e.g. 300", required: true },
      { id: "deck_height", label: "Is it ground-level or elevated?", type: "select", options: ["Ground level", "Low (1–3 steps)", "Elevated (2nd story)"], required: true },
      { id: "deck_material", label: "Preferred material?", type: "select", options: ["Not sure", "Pressure-treated", "Cedar", "Composite / Trex"], required: false },
      { id: "deck_features", label: "Any features?", type: "textarea", placeholder: "railings, stairs, pergola, built-in seating, lighting…", required: false },
    ],
    seo: { title: "Custom Deck Builders in the Mid-Willamette Valley", description: "Decks and patios built for Oregon weather by Happy Place Carpentry.", keywords: ["deck builder", "composite deck", "cedar deck", "Oregon deck"] },
  },
  {
    slug: "fences",
    title: "Fences & Gates",
    category: "outdoor-living",
    summary: "Privacy, security, and curb appeal — done right.",
    description:
      "Wood, vinyl, or metal fencing and gates installed straight, plumb, and built to handle the elements. We handle permits and property-line care.",
    icon: "Fence",
    stat: "Cedar & vinyl",
    heroImage: "/images/services/fences.svg",
    galleryRefs: ["fence-philomath", "fence-lebanon"],
    estimateQuestions: [
      { id: "fence_length", label: "Approximate total length (linear ft)?", type: "number", placeholder: "e.g. 120", required: true },
      { id: "fence_height", label: "Desired height?", type: "select", options: ["4 ft", "6 ft", "8 ft", "Other"], required: true },
      { id: "fence_material", label: "Material preference?", type: "select", options: ["Not sure", "Cedar", "Pressure-treated", "Vinyl", "Metal"], required: false },
      { id: "fence_style", label: "Style notes?", type: "textarea", placeholder: "privacy, shadowbox, picket, horizontal slat…", required: false },
    ],
    seo: { title: "Fence Installation in Benton, Linn, Marion & Polk Counties", description: "Cedar, vinyl, and wood fence installation by Happy Place Carpentry.", keywords: ["fence installer", "cedar fence", "privacy fence", "Oregon fencing"] },
  },
  {
    slug: "pergolas",
    title: "Pergolas & Outdoor Structures",
    category: "outdoor-living",
    summary: "Shade and structure that makes a yard a destination.",
    description:
      "Pergolas, arbors, and covered outdoor structures crafted to complement your home and create comfortable outdoor rooms.",
    icon: "Tent",
    stat: "Custom shade",
    heroImage: "/images/services/pergolas.svg",
    galleryRefs: ["pergola-corvallis"],
    estimateQuestions: [
      { id: "pergola_size", label: "Rough footprint (ft x ft)?", type: "text", placeholder: "e.g. 12x14", required: true },
      { id: "pergola_roof", label: "Open rafters or solid cover?", type: "select", options: ["Open", "Partial shade", "Solid roof"], required: true },
      { id: "pergola_attach", label: "Attached to house or freestanding?", type: "select", options: ["Freestanding", "Attached"], required: false },
    ],
    seo: { title: "Pergola Builders in the Willamette Valley", description: "Custom pergolas and outdoor structures by Happy Place Carpentry.", keywords: ["pergola", "outdoor structure", "shade structure"] },
  },
  {
    slug: "kitchen-remodel",
    title: "Kitchen Remodeling",
    category: "remodeling",
    summary: "The heart of the home, rebuilt around how you live.",
    description:
      "Cabinetry, islands, flooring, and layout changes — full or partial kitchen remodels handled with care and clean job sites.",
    icon: "Refrigerator",
    stat: "Islands & more",
    heroImage: "/images/services/kitchen.svg",
    galleryRefs: ["kitchen-salem", "kitchen-albany"],
    estimateQuestions: [
      { id: "kitchen_scope", label: "Scope of work?", type: "select", options: ["Full gut remodel", "Cabinets + counters", "Island only", "Flooring + paint", "Not sure"], required: true },
      { id: "kitchen_layout", label: "Changing the layout?", type: "boolean", required: false },
      { id: "kitchen_appliances", label: "Appliance changes?", type: "textarea", placeholder: "range, fridge, dishwasher relocation…", required: false },
    ],
    seo: { title: "Kitchen Remodeling in the Mid-Willamette Valley", description: "Kitchen remodels by Happy Place Carpentry.", keywords: ["kitchen remodel", "cabinet install", "kitchen renovation"] },
  },
  {
    slug: "bath-remodel",
    title: "Bathroom Remodeling",
    category: "remodeling",
    summary: "Calm, clean, and built to handle moisture right.",
    description:
      "Showers, vanities, tile, and full bath remodels with proper waterproofing and ventilation done the right way.",
    icon: "Bath",
    stat: "Waterproofed",
    heroImage: "/images/services/bath.svg",
    galleryRefs: ["bath-corvallis"],
    estimateQuestions: [
      { id: "bath_count", label: "How many bathrooms?", type: "number", placeholder: "1", required: true },
      { id: "bath_scope", label: "Scope?", type: "select", options: ["Full remodel", "Shower/tub only", "Vanity + fixtures", "Tile + paint"], required: true },
      { id: "bath_fixtures", label: "Fixture notes?", type: "textarea", placeholder: "walk-in shower, double vanity, freestanding tub…", required: false },
    ],
    seo: { title: "Bathroom Remodeling in the Willamette Valley", description: "Bathroom remodels by Happy Place Carpentry.", keywords: ["bathroom remodel", "walk-in shower", "tile bath"] },
  },
  {
    slug: "built-ins",
    title: "Built-Ins & Trim",
    category: "custom-carpentry",
    summary: "Custom storage and detail that fits your home exactly.",
    description:
      "Built-in shelving, mudroom benches, wainscoting, and trim work crafted to your space and style.",
    icon: "BookOpen",
    stat: "Fit to your home",
    heroImage: "/images/services/builtins.svg",
    galleryRefs: ["builtin-corvallis"],
    estimateQuestions: [
      { id: "builtin_type", label: "What are you envisioning?", type: "textarea", placeholder: "mudroom bench, bookshelf wall, window seat, wainscoting…", required: true },
      { id: "builtin_location", label: "Which room?", type: "text", placeholder: "e.g. living room", required: false },
    ],
    seo: { title: "Custom Built-Ins & Trim Carpentry", description: "Built-ins and trim by Happy Place Carpentry.", keywords: ["built-ins", "custom shelving", "trim carpentry", "wainscoting"] },
  },
  {
    slug: "repairs",
    title: "Repairs & Handyman",
    category: "repairs",
    summary: "The small stuff that keeps a home happy.",
    description:
      "Dry rot repair, trim, doors, and general carpentry repairs — honest advice and reliable work.",
    icon: "Wrench",
    stat: "Honest advice",
    heroImage: "/images/services/repairs.svg",
    galleryRefs: [],
    estimateQuestions: [
      { id: "repair_what", label: "What needs fixing?", type: "textarea", placeholder: "describe the issue…", required: true },
      { id: "repair_urgent", label: "Is it urgent / safety-related?", type: "boolean", required: false },
    ],
    seo: { title: "Carpentry Repairs & Handyman Services", description: "Reliable carpentry repairs by Happy Place Carpentry.", keywords: ["carpentry repair", "handyman", "dry rot repair"] },
  },
];

export function getService(slug: string): Service | undefined {
  return services.find((s) => s.slug === slug);
}

export function servicesByCategory(categorySlug: string): Service[] {
  return services.filter((s) => s.category === categorySlug);
}
