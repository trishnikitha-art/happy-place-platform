import type { BeforeAfterPair } from "@/components/before-after-slider";

/**
 * Before/After pairs — grouped for the slider feature.
 *
 * Today these point at SVG placeholders (see public/images). When real
 * photography arrives (Directive 030 asset migration), swap `before.src` /
 * `after.src` to the optimized files — no component changes needed.
 *
 * Plan: group 4×8+ pairs by project so visitors can scrub through many
 * transformations on one page.
 */
export const beforeAfterPairs: BeforeAfterPair[] = [
  {
    id: "deck-corvallis-ba",
    title: "Backyard Entertainer Deck",
    county: "Benton County",
    service: "decks",
    before: { src: "/images/gallery/deck-corvallis.svg", alt: "Before: aging, rotting deck", width: 1200, height: 900 },
    after: { src: "/images/gallery/deck-corvallis.svg", alt: "After: finished cedar entertainer deck", width: 1200, height: 900 },
  },
  {
    id: "kitchen-salem-ba",
    title: "Farmhouse Kitchen Refresh",
    county: "Marion County",
    service: "kitchen-remodel",
    before: { src: "/images/gallery/kitchen-salem.svg", alt: "Before: dark closed-off kitchen", width: 1200, height: 900 },
    after: { src: "/images/gallery/kitchen-salem.svg", alt: "After: bright farmhouse kitchen", width: 1200, height: 900 },
  },
  {
    id: "fence-philomath-ba",
    title: "Cedar Privacy Fence",
    county: "Benton County",
    service: "fences",
    before: { src: "/images/gallery/fence-philomath.svg", alt: "Before: open yard, no privacy", width: 1200, height: 900 },
    after: { src: "/images/gallery/fence-philomath.svg", alt: "After: straight cedar privacy fence", width: 1200, height: 900 },
  },
  {
    id: "bath-corvallis-ba",
    title: "Walk-In Shower Remodel",
    county: "Benton County",
    service: "bath-remodel",
    before: { src: "/images/gallery/bath-corvallis.svg", alt: "Before: dated bathroom", width: 1200, height: 900 },
    after: { src: "/images/gallery/bath-corvallis.svg", alt: "After: tiled walk-in shower", width: 1200, height: 900 },
  },
];

export function getBeforeAfterByService(slug: string): BeforeAfterPair[] {
  return beforeAfterPairs.filter((p) => p.service === slug);
}
