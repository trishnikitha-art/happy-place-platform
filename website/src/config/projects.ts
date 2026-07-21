import type { Project } from "@/types";

/**
 * Project Spotlights — completed-project stories (Challenge/Solution/Materials/
 * Outcome/Photos). These build trust better than an image grid. Reusable across
 * any service business; content lives here, not in components.
 *
 * Photos are now sourced from media.ts galleryAll() - no hardcoded paths.
 * The photos array is empty here; real project photos come from the pipeline.
 */
export const projects: Project[] = [
  {
    slug: "corvallis-entertainer-deck",
    title: "Backyard Entertainer Deck",
    service: "decks",
    county: "benton",
    summary: "A tired, rotting deck became a multi-zone cedar entertaining space with built-in seating.",
    challenge:
      "The homeowners loved to host but their 15-year-old deck was rotting, undersized, and unsafe — with a single step down that guests kept tripping on. They wanted more room, built-in seating, and something that would age gracefully in Oregon's wet winters.",
    solution:
      "We removed the old structure, re-footed to code, and built a two-tier cedar deck that defines a dining zone and a lounge zone. Built-in bench seating with hidden storage replaced bulky furniture, and wide, gentle steps solved the trip hazard while opening the deck to the yard.",
    materials: ["Western red cedar decking", "Hidden fasteners", "Galvanized structural hardware", "Cedar bench framing", "Penetrating UV-stable sealer"],
    outcome:
      "The family gained roughly 40% more usable space and a low-maintenance surface built for the climate. It passed inspection on the first visit and has become the center of their summer gatherings.",
    photos: [],
    featured: true,
    completedAt: "2026-05-20",
  },
  {
    slug: "salem-farmhouse-kitchen",
    title: "Farmhouse Kitchen Refresh",
    service: "kitchen-remodel",
    county: "marion",
    summary: "A dark, closed-off kitchen reworked into a bright farmhouse space with an island and better flow.",
    challenge:
      "A 1990s kitchen felt dark and cramped, with a peninsula that blocked traffic and too little prep space. The owners wanted a brighter, more open room without moving major plumbing or blowing the budget.",
    solution:
      "We removed the peninsula, added a properly sized island with seating, refaced and extended cabinetry, and installed new counters and lighting. Keeping the existing plumbing and appliance locations kept costs down while the layout change did the heavy lifting.",
    materials: ["Shaker cabinetry", "Quartz countertops", "Soft-close hardware", "Under-cabinet LED lighting", "Custom island trim"],
    outcome:
      "The kitchen reads twice as large, seats four at the island, and gained significant prep and storage space — delivered on schedule with the plumbing untouched.",
    photos: [],
    featured: false,
    completedAt: "2026-03-15",
  },
];

export function getProjects(): Project[] {
  return projects;
}

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function featuredProject(): Project | undefined {
  return projects.find((p) => p.featured) ?? projects[0];
}
