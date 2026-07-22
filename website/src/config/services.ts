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
    slug: "painting",
    title: "Painting & Surface Restoration",
    category: "painting",
    summary: "Paint, stain, and refinish surfaces that have weathered over time.",
    description:
      "Interior and exterior painting, deck staining, fence staining, cabinet painting, and surface restoration — proper prep, quality materials, and clean application that lasts.",
    icon: "Paintbrush",
    stat: "Interior & exterior",
    galleryRefs: [],
    estimateQuestions: [
      { id: "painting_location", label: "Interior or exterior?", type: "select", options: ["Interior", "Exterior", "Both"], required: true, isScopeQuestion: true },
      { id: "painting_surface", label: "What are we working on?", type: "select", options: ["Walls / ceilings", "Trim / baseboards", "Cabinets", "Doors", "Multiple rooms", "Other"], required: true },
      { id: "painting_size", label: "Approximate size?", type: "select", options: ["Small", "Medium", "Large", "Not sure"], required: true },
      { id: "painting_condition", label: "Current condition?", type: "select", options: ["Excellent", "Normal wear", "Peeling paint", "Weathered wood", "Water damage", "Visible rot", "Not sure"], required: true },
      { id: "painting_prep_pressure_wash", label: "Pressure washing", type: "boolean", required: false },
      { id: "painting_prep_scraping", label: "Scraping", type: "boolean", required: false },
      { id: "painting_prep_sanding", label: "Sanding", type: "boolean", required: false },
      { id: "painting_prep_caulking", label: "Caulking", type: "boolean", required: false },
      { id: "painting_prep_priming", label: "Priming", type: "boolean", required: false },
      { id: "painting_prep_wood_repairs", label: "Minor wood repairs", type: "boolean", required: false },
      { id: "painting_details", label: "Anything else we should know?", type: "textarea", placeholder: "color changes, specific areas, access issues…", required: false },
    ],
    seo: { title: "Painting & Surface Restoration in the Willamette Valley", description: "Interior and exterior painting, staining, and surface restoration by Happy Place Carpentry.", keywords: ["house painting", "deck staining", "fence staining", "cabinet painting", "surface restoration"] },
  },
  {
    slug: "repairs",
    title: "Restoration & Repairs",
    category: "restoration-repair",
    summary: "Repair dry rot, water damage, drywall, trim, and structural problems before they get worse.",
    description:
      "Dry rot repair, trim restoration, door repair, water damage repair, drywall repair, and structural carpentry — straightforward advice and reliable work focused on restoration rather than quick fixes.",
    icon: "Wrench",
    stat: "Honest advice",
    galleryRefs: [],
    estimateQuestions: [
      { id: "repair_what", label: "What needs attention?", type: "select", options: ["Dry rot", "Water damage", "Drywall", "Trim", "Siding", "Deck", "Door", "Window", "Floor", "Other"], required: true, isScopeQuestion: true },
      { id: "repair_location", label: "Where is it?", type: "select", options: ["Interior", "Exterior"], required: true },
      { id: "repair_severity", label: "How severe does it appear?", type: "select", options: ["Small area", "One room", "Multiple areas", "Not sure"], required: true },
      { id: "repair_unsafe", label: "Is anything unsafe?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "repair_details", label: "Anything else?", type: "textarea", placeholder: "describe the issue…", required: false },
    ],
    seo: { title: "Carpentry Restoration & Repair Services", description: "Reliable carpentry restoration and repairs by Happy Place Carpentry.", keywords: ["carpentry repair", "dry rot repair", "trim restoration", "structural repair"] },
  },
  {
    slug: "built-ins",
    title: "Cabinetry, Built-Ins & Trim",
    category: "finish-carpentry",
    summary: "Add custom storage, shelving, and trim work that fits your home perfectly.",
    description:
      "Built-in shelving, mudroom benches, wainscoting, and trim work crafted to your space, your style, and the details that make it feel finished. We also install, reface, and refinish cabinets.",
    icon: "BookOpen",
    stat: "Fit to your home",
    galleryRefs: ["builtin-corvallis"],
    estimateQuestions: [
      { id: "builtin_scope", label: "Single piece or whole room?", type: "select", options: ["Single piece", "Whole room"], required: true, isScopeQuestion: true },
      { id: "builtin_type", label: "What are you imagining?", type: "textarea", placeholder: "mudroom bench, bookshelf wall, window seat, wainscoting…", required: true },
      { id: "builtin_location", label: "Which room?", type: "select", options: ["Living room", "Bedroom", "Office", "Mudroom", "Kitchen", "Other"], required: true },
      { id: "builtin_style", label: "Style?", type: "textarea", placeholder: "modern, traditional, farmhouse, craftsman…", required: true },
      { id: "builtin_finish", label: "Paint or stain?", type: "select", options: ["Paint", "Stain", "Not sure"], required: true },
      { id: "builtin_details", label: "Anything else?", type: "textarea", placeholder: "describe your vision…", required: false },
    ],
    seo: { title: "Custom Built-Ins & Trim Carpentry", description: "Built-ins and trim by Happy Place Carpentry.", keywords: ["built-ins", "custom shelving", "trim carpentry", "wainscoting"] },
  },
  {
    slug: "bath-remodel",
    title: "Bathroom Remodeling",
    category: "remodeling",
    summary: "Rebuild your bathroom with proper waterproofing and finishes that last.",
    description:
      "Showers, vanities, tile, and full bath remodels with proper waterproofing and ventilation — done carefully and verified.",
    icon: "Bath",
    stat: "Waterproofed",
    galleryRefs: ["bath-corvallis"],
    estimateQuestions: [
      { id: "bath_scope", label: "What are you planning?", type: "select", options: ["Full remodel", "Shower/tub", "Vanity + fixtures", "Tile", "Painting only", "Not sure"], required: true, isScopeQuestion: true },
      { id: "bath_fixtures", label: "Fixtures?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "bath_tile", label: "Tile work?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "bath_shower", label: "Shower/tub?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "bath_vanity", label: "Vanity?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "bath_waterproofing", label: "Waterproofing?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "bath_ventilation", label: "Ventilation?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "bath_details", label: "Anything else?", type: "textarea", placeholder: "walk-in shower, double vanity, freestanding tub…", required: false },
    ],
    seo: { title: "Bathroom Remodeling in the Willamette Valley", description: "Bathroom remodels by Happy Place Carpentry.", keywords: ["bathroom remodel", "walk-in shower", "tile bath"] },
  },
  {
    slug: "kitchen-remodel",
    title: "Kitchen Remodeling",
    category: "remodeling",
    summary: "Update your kitchen with new cabinets, counters, or a full remodel.",
    description:
      "Cabinetry, islands, flooring, and layout changes — full or partial remodels handled with clear communication and a clean job site.",
    icon: "Refrigerator",
    stat: "Islands & more",
    galleryRefs: ["kitchen-salem", "kitchen-albany"],
    estimateQuestions: [
      { id: "kitchen_scope", label: "What are you planning?", type: "select", options: ["Cabinets", "Countertops", "Flooring", "Full remodel", "Not sure"], required: true, isScopeQuestion: true },
      { id: "kitchen_layout", label: "Changing the layout?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "kitchen_plumbing", label: "Moving plumbing?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "kitchen_electrical", label: "Moving electrical?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "kitchen_appliances", label: "New appliances?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "kitchen_goals", label: "Design goals?", type: "textarea", placeholder: "more storage, open concept, modern style…", required: false },
    ],
    seo: { title: "Kitchen Remodeling in the Mid-Willamette Valley", description: "Kitchen remodels by Happy Place Carpentry.", keywords: ["kitchen remodel", "cabinet install", "kitchen renovation"] },
  },
  {
    slug: "fences",
    title: "Fences & Gates",
    category: "fencing",
    summary: "Add privacy, security, and curb appeal with a new fence or gate.",
    description:
      "Cedar, vinyl, or metal fencing and gates set straight and plumb, detailed to sit naturally with the home. We handle permits and respect property lines. We also repair, stain, and refinish existing fences.",
    icon: "Fence",
    stat: "Cedar & vinyl",
    galleryRefs: ["fence-philomath", "fence-lebanon"],
    estimateQuestions: [
      { id: "fence_scope", label: "What are you planning?", type: "select", options: ["New fence", "Repair", "Replacement", "Stain existing"], required: true, isScopeQuestion: true },
      { id: "fence_length", label: "Approximate length?", type: "select", options: ["Small", "Medium", "Large", "Not sure"], required: true },
      { id: "fence_height", label: "Height?", type: "select", options: ["4 ft", "6 ft", "8 ft", "Not sure"], required: true },
      { id: "fence_material", label: "Material?", type: "select", options: ["Cedar", "Pressure treated", "Vinyl", "Metal", "Not sure"], required: true },
      { id: "fence_gate", label: "Gate?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "fence_details", label: "Anything else?", type: "textarea", placeholder: "privacy, shadowbox, picket, horizontal slat…", required: false },
    ],
    seo: { title: "Fence Installation in Benton, Linn, Marion & Polk Counties", description: "Cedar, vinyl, and wood fence installation by Happy Place Carpentry.", keywords: ["fence installer", "cedar fence", "privacy fence", "Oregon fencing"] },
  },
  {
    slug: "decks",
    title: "Decks & Patios",
    category: "outdoor-living",
    summary: "Build or restore an outdoor deck for entertaining and relaxation.",
    description:
      "From ground-level patios to multi-tier entertainer decks, we design and build outdoor spaces meant for daily use — pressure-treated, cedar, or composite, built to code and detailed to last. We also repair, refinish, and stain existing decks.",
    icon: "Layers",
    stat: "150+ built",
    galleryRefs: ["deck-corvallis", "deck-albany", "deck-salem"],
    estimateQuestions: [
      { id: "deck_scope", label: "What are you planning?", type: "select", options: ["New deck", "Replacement", "Repair", "Refinish / stain"], required: true, isScopeQuestion: true },
      { id: "deck_height", label: "Ground level or elevated?", type: "select", options: ["Ground level", "Elevated"], required: true },
      { id: "deck_size", label: "Approximate size?", type: "select", options: ["Small", "Medium", "Large", "Not sure"], required: true },
      { id: "deck_material", label: "Material preference?", type: "select", options: ["Composite", "Cedar", "Pressure treated", "Not sure"], required: true },
      { id: "deck_railing", label: "Railing?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "deck_stairs", label: "Stairs?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "deck_roof", label: "Roof?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "deck_lighting", label: "Lighting?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "deck_seating", label: "Built-in seating?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "deck_details", label: "Anything else?", type: "textarea", placeholder: "describe your vision…", required: false },
    ],
    seo: { title: "Custom Deck Builders in the Mid-Willamette Valley", description: "Decks and patios built for Oregon weather by Happy Place Carpentry.", keywords: ["deck builder", "composite deck", "cedar deck", "Oregon deck"] },
  },
  {
    slug: "pergolas",
    title: "Pergolas & Outdoor Structures",
    category: "outdoor-living",
    summary: "Add shade and comfort to your yard with a pergola or covered structure.",
    description:
      "Pergolas, arbors, and covered structures built to complement the home and create comfortable outdoor rooms you will actually use. We also repair and refinish existing structures.",
    icon: "Tent",
    stat: "Custom shade",
    galleryRefs: ["pergola-corvallis"],
    estimateQuestions: [
      { id: "pergola_attach", label: "Attached or freestanding?", type: "select", options: ["Attached", "Freestanding"], required: true, isScopeQuestion: true },
      { id: "pergola_size", label: "Approximate size?", type: "select", options: ["Small", "Medium", "Large", "Not sure"], required: true },
      { id: "pergola_roof", label: "Roof style?", type: "select", options: ["Open rafters", "Partial shade", "Solid roof"], required: true },
      { id: "pergola_lighting", label: "Lighting?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "pergola_fans", label: "Fans?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "pergola_electrical", label: "Electrical?", type: "select", options: ["Yes", "No", "Not sure"], required: true },
      { id: "pergola_details", label: "Anything else?", type: "textarea", placeholder: "describe your vision…", required: false },
    ],
    seo: { title: "Pergola Builders in the Willamette Valley", description: "Custom pergolas and outdoor structures by Happy Place Carpentry.", keywords: ["pergola", "outdoor structure", "shade structure"] },
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

