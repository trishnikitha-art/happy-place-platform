/**
 * Review Authority - Canonical Review Model Adapter
 * 
 * Architecture: Manual Reviews → Review Adapter → Canonical Review Model → Reviews UI
 *              Google Reviews → Review Adapter → Canonical Review Model → Reviews UI
 *              Future CRM → Review Adapter → Canonical Review Model → Reviews UI
 * 
 * This adapter provides a single interface for the UI to access reviews,
 * regardless of the source (manual, Google, CRM, etc.).
 */

import { Review, ReviewsManifest, ReviewService } from "@/types/reviews";
import { loadAuthority, clearAuthorityCache, findById, filterFeatured, filterByField } from "./authority-loader";

export type { ReviewService };

// Load the canonical reviews manifest using shared AuthorityLoader
export function loadReviewsManifest(): ReviewsManifest {
  return loadAuthority<ReviewsManifest>({
    path: "@/config/reviews.v1.json",
    fallback: {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      reviews: []
    },
    name: "Reviews"
  });
}

/**
 * Get all reviews
 */
export function getAllReviews(): Review[] {
  const manifest = loadReviewsManifest();
  return manifest.reviews;
}

/**
 * Get featured reviews only
 */
export function getFeaturedReviews(): Review[] {
  const reviews = getAllReviews();
  return filterFeatured(reviews);
}

/**
 * Get reviews by service
 */
export function getReviewsByService(service: ReviewService): Review[] {
  const reviews = getAllReviews();
  return filterByField(reviews, 'service' as any, service);
}

/**
 * Get reviews by project ID
 */
export function getReviewsByProject(projectId: string): Review[] {
  const reviews = getAllReviews();
  return filterByField(reviews, 'projectId' as any, projectId);
}

/**
 * Get verified reviews only
 */
export function getVerifiedReviews(): Review[] {
  const reviews = getAllReviews();
  return filterByField(reviews, 'verified' as any, true);
}

/**
 * Get reviews by source (manual, google, crm, etc.)
 */
export function getReviewsBySource(source: string): Review[] {
  const reviews = getAllReviews();
  return filterByField(reviews, 'source' as any, source);
}

/**
 * Get latest reviews (sorted by date, most recent first)
 */
export function getLatestReviews(limit?: number): Review[] {
  const reviews = getAllReviews();
  const sorted = [...reviews].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Get review by ID
 */
export function getReviewById(id: string): Review | null {
  const reviews = getAllReviews();
  return findById(reviews, id);
}

/**
 * Get review statistics
 */
export function getReviewStats() {
  const reviews = getAllReviews();
  const total = reviews.length;
  const averageRating = total > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / total 
    : 0;
  const verifiedCount = reviews.filter(r => r.verified).length;
  const featuredCount = reviews.filter(r => r.featured).length;
  
  // Count by rating
  const byRating = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };
  
  return {
    total,
    averageRating: Math.round(averageRating * 10) / 10,
    verifiedCount,
    featuredCount,
    byRating,
  };
}

/**
 * Validate review structure
 */
export function validateReview(review: unknown): review is Review {
  if (!review || typeof review !== 'object') return false;
  
  const r = review as Partial<Review>;
  
  return (
    typeof r.id === 'string' &&
    typeof r.source === 'string' &&
    typeof r.featured === 'boolean' &&
    typeof r.verified === 'boolean' &&
    typeof r.reviewer === 'object' &&
    typeof r.reviewer.name === 'string' &&
    typeof r.rating === 'number' &&
    r.rating >= 1 && r.rating <= 5 &&
    typeof r.date === 'string' &&
    typeof r.service === 'string' &&
    typeof r.body === 'string'
  );
}

/**
 * Clear cache (useful for testing or hot reload)
 */
export function clearReviewsCache(): void {
  clearAuthorityCache("@/config/reviews.v1.json");
}
