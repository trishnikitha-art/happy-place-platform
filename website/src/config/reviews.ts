import type { Review } from "@/types";

/**
 * Reviews. The "Reviews" page is the second main page per the brand brief.
 * These are public testimonials (no client secrets). Source attribution kept
 * generic; swap to a live review feed later via the reviews service interface.
 */
export const reviews: Review[] = [
  { id: "r1", author: "Sarah M.", location: "Corvallis, OR", rating: 5, title: "Our deck is everything we hoped for", body: "Taylor and the team built a cedar deck that totally changed how we use our backyard. Clean, on time, and they actually listened. Our happy place now has a deck.", date: "2026-05-12", service: "decks", source: "Google", verified: true },
  { id: "r2", author: "James T.", location: "Albany, OR", rating: 5, title: "Straight fence, fair price", body: "Got three quotes; Happy Place was the only one who explained the permit side and didn't upsell. Fence looks great a year later.", date: "2026-04-03", service: "fences", source: "Google", verified: true },
  { id: "r3", author: "Priya R.", location: "Salem, OR", rating: 5, title: "Kitchen remodel without the stress", body: "I was nervous about a full kitchen remodel but they kept the job site clean and walked me through every decision. Worth every penny.", date: "2026-03-21", service: "kitchen-remodel", source: "Google", verified: true },
  { id: "r4", author: "Dana K.", location: "Philomath, OR", rating: 5, title: "Pergola = summer upgrade", body: "The pergola they built is the best money we've spent on the house. Shade exactly where we wanted it.", date: "2026-02-18", service: "pergolas", source: "Google", verified: true },
  { id: "r5", author: "Mike L.", location: "Lebanon, OR", rating: 5, title: "Honest repair advice", body: "They could've sold me a bigger job but told me the simple fix was enough. Rare these days.", date: "2026-01-30", service: "repairs", source: "Google", verified: true },
  { id: "r6", author: "Elena S.", location: "Corvallis, OR", rating: 5, title: "Mudroom built-ins are perfect", body: "Custom mudroom bench and shelves fit our weird corner exactly. Craftsmanship you can see.", date: "2025-12-15", service: "built-ins", source: "Google", verified: true },
];

export function averageRating(): number {
  if (!reviews.length) return 0;
  return Math.round((reviews.reduce((a, r) => a + r.rating, 0) / reviews.length) * 10) / 10;
}
