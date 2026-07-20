/**
 * ReviewAuthority (P5) — reviews are DATA, not copy.
 * Single source of truth: one review record, referenced everywhere
 * (homepage, reviews page, aggregate rating, estimate emails, analytics, CRM).
 * No review text is ever duplicated or manually copied from Google.
 */
import type { Review } from "../sheets/schema";

export interface ReviewSource {
  /** Pull published reviews from the operational store (Google Sheet / API). */
  listPublished(): Promise<Review[]>;
}

/**
 * Aggregate rating derived from the single source — never recomputed from
 * copied strings. The homepage and reviews page both call this.
 */
export function aggregate(reviews: Review[]): { average: number; count: number } {
  if (!reviews.length) return { average: 0, count: 0 };
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  return { average: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

/**
 * Pipeline stub (P2 of the roadmap): Project Complete → follow-up automation →
 * internal satisfaction check → Google review request → import → publish.
 * The website reads only `published` reviews. Manual copying is eliminated.
 */
/** Follow-up timeline (P4) — automated, never manual copy. */
export const FOLLOW_UP_TIMELINE = [
  { day: 2,   message: "How is everything settling in?" },
  { day: 30,  message: "Is there anything you would like adjusted?" },
  { day: 180, message: "Seasonal maintenance tips for your new project." },
  { day: 365, message: "We would love to see how its holding up." },
] as const;

/** Social-proof snippet for estimate emails / CTAs: "Based on 87 verified Google reviews." */
export function verifiedSocialProof(reviews: Review[], source: "google" = "google"): string {
  const n = reviews.filter((r) => r.source === source && r.published).length;
  return `Based on ${n} verified Google reviews.`;
}

export class ReviewAuthority {
  constructor(private source: ReviewSource) {}

  async getForHomepage(limit = 3): Promise<Review[]> {
    const all = await this.source.listPublished();
    return all.slice(0, limit);
  }

  async getAggregate() {
    return aggregate(await this.source.listPublished());
  }
}
