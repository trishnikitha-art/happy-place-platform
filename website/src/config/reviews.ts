import type { Review } from "@/types";

/**
 * Reviews. The "Reviews" page is the second main page per the brand brief.
 *
 * No authentic testimonials available yet. Fabricated reviews damage real trust.
 * Empty array until Google Places API integration is implemented (PHASE 7).
 */
export const reviews: Review[] = [];

export function averageRating(): number {
  if (!reviews.length) return 0;
  return Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10;
}
