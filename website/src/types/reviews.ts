/**
 * Canonical Review Model (P0)
 * 
 * Architecture: Manual Reviews → Review Adapter → Canonical Review Model → Reviews UI
 *              Google Reviews → Review Adapter → Canonical Review Model → Reviews UI
 *              Future CRM → Review Adapter → Canonical Review Model → Reviews UI
 * 
 * When Google comes online, only the adapter needs to be replaced.
 * The UI always reads from this canonical model.
 * 
 * Reviews reference Projects, not photos. Projects own the media.
 * 
 * Industry-Agnostic: Service types come from Services Registry, not hardcoded here.
 */

export type ReviewSource = "manual" | "google" | "crm" | "referral" | "future";

export type ReviewService = string; // Service slug from Services Registry (industry-agnostic)

export type SyncStatus = "synced" | "pending" | "failed" | "manual";

export interface Reviewer {
  name: string;
  initials?: string;
}

export interface ReviewLocation {
  city: string;
  county: string;
}

export interface OwnerResponse {
  author: string;
  body: string;
  date?: string;
}

export interface Review {
  id: string;
  source: ReviewSource;
  featured: boolean;
  verified: boolean;

  reviewer: Reviewer;
  rating: number; // 1-5
  date: string; // ISO date string

  service: ReviewService;
  projectId?: string; // References projects.v1.json, not photos

  location?: ReviewLocation;

  title?: string;
  body: string;

  ownerResponse?: OwnerResponse;

  // Google sync fields
  googleReviewId?: string;
  syncStatus?: SyncStatus;
  importedAt?: string; // ISO date string
  lastSynced?: string; // ISO date string
  originalUrl?: string | null; // Google review URL (null for manual)

  // Editorial metadata
  highlight?: boolean; // Highlighted for special treatment
  featuredWeight?: number; // 0-100, for sorting featured reviews
  heroEligible?: boolean; // Can become the giant hero review
  homepageEligible?: boolean; // Can appear on homepage
}

export interface ReviewsManifest {
  version: string;
  generatedAt: string;
  reviews: Review[];
}
