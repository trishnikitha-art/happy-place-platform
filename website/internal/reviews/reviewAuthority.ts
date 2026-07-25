/**
 * ReviewAuthority (P5) — reviews are DATA, not copy.
 * Single source of truth: one review record, referenced everywhere
 * (homepage, reviews page, aggregate rating, estimate emails, analytics, CRM).
 * No review text is ever duplicated or manually copied from Google.
 * 
 * Uses canonical Review type from src/types/reviews.ts
 * Website never knows Google exists - Google is just an adapter.
 */
import type { Review, ReviewAggregate } from "../../src/types/reviews";
import { ReviewProvider } from "../../src/types/reviews";

export interface ReviewSource {
  /** Pull published reviews from the operational store (Google Sheet / API). */
  listPublished(): Promise<Review[]>;
}

/**
 * Aggregate rating derived from the single source — never recomputed from
 * copied strings. The homepage and reviews page both call this.
 */
export function aggregate(reviews: Review[]): ReviewAggregate {
  if (!reviews.length) {
    return {
      average: 0,
      count: 0,
      fiveStarCount: 0,
      fourStarCount: 0,
      threeStarCount: 0,
      twoStarCount: 0,
      oneStarCount: 0,
      verifiedCount: 0,
      featuredCount: 0,
      googleCount: 0,
      manualCount: 0,
    };
  }
  
  const sum = reviews.reduce((a, r) => a + r.rating, 0);
  const average = Math.round((sum / reviews.length) * 10) / 10;
  const count = reviews.length;
  
  const fiveStarCount = reviews.filter(r => r.rating === 5).length;
  const fourStarCount = reviews.filter(r => r.rating === 4).length;
  const threeStarCount = reviews.filter(r => r.rating === 3).length;
  const twoStarCount = reviews.filter(r => r.rating === 2).length;
  const oneStarCount = reviews.filter(r => r.rating === 1).length;
  const verifiedCount = reviews.filter(r => r.verified).length;
  const featuredCount = reviews.filter(r => r.featured).length;
  const googleCount = reviews.filter(r => r.provider === ReviewProvider.Google).length;
  const manualCount = reviews.filter(r => r.provider === ReviewProvider.Manual).length;
  
  const latestReview = [...reviews].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )[0];
  
  return {
    average,
    count,
    fiveStarCount,
    fourStarCount,
    threeStarCount,
    twoStarCount,
    oneStarCount,
    verifiedCount,
    featuredCount,
    googleCount,
    manualCount,
    latestReview,
  };
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
export function verifiedSocialProof(reviews: Review[], provider: ReviewProvider = ReviewProvider.Google): string {
  const n = reviews.filter((r) => r.provider === provider && r.verified).length;
  return `Based on ${n} verified ${provider} reviews.`;
}

export class ReviewAuthority {
  constructor(private source: ReviewSource) {}

  /**
   * Intent-based methods - website asks for what it needs, not how to slice
   */
  async getHomepageReviews(limit = 3): Promise<Review[]> {
    const all = await this.source.listPublished();
    const homepageEligible = all.filter(r => r.homepageEligible && r.featured);
    return homepageEligible.slice(0, limit);
  }

  async getHeroReviews(limit = 1): Promise<Review[]> {
    const all = await this.source.listPublished();
    const heroEligible = all.filter(r => r.heroEligible && r.featured);
    return heroEligible.slice(0, limit);
  }

  async getLatest(limit?: number): Promise<Review[]> {
    const all = await this.source.listPublished();
    const sorted = [...all].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return limit ? sorted.slice(0, limit) : sorted;
  }

  async getFeatured(): Promise<Review[]> {
    const all = await this.source.listPublished();
    return all.filter(r => r.featured);
  }

  async getVerified(): Promise<Review[]> {
    const all = await this.source.listPublished();
    return all.filter(r => r.verified);
  }

  async getServiceReviews(service: string): Promise<Review[]> {
    const all = await this.source.listPublished();
    return all.filter(r => r.service === service);
  }

  async getAggregate(): Promise<ReviewAggregate> {
    return aggregate(await this.source.listPublished());
  }
}
