/**
 * Canonical Review Model (P0)
 * 
 * Architecture: Manual Reviews → Review Adapter → Canonical Review Model → Reviews UI
 *              Google Reviews → Review Adapter → Canonical Review Model → Reviews UI
 *              Google Forms → Review Adapter → Canonical Review Model → Reviews UI
 *              Future CRM → Review Adapter → Canonical Review Model → Reviews UI
 * 
 * When Google comes online, only the adapter needs to be replaced.
 * The UI always reads from this canonical model.
 * 
 * Reviews reference Projects, not photos. Projects own the media.
 * 
 * Industry-Agnostic: Service types come from Services Registry, not hardcoded here.
 */

export enum ReviewProvider {
  Manual = "manual",
  Google = "google",
  CRM = "crm",
  Imported = "imported",
  Form = "form",
}

export enum ReviewStatus {
  Submitted = "submitted",
  Pending = "pending",
  Approved = "approved",
  Rejected = "rejected",
  Published = "published",
  Featured = "featured",
  Archived = "archived",
}

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
  provider: ReviewProvider;
  status: ReviewStatus;
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

  // Moderation workflow metadata
  submittedAt?: string; // ISO timestamp when review was submitted
  reviewedAt?: string; // ISO timestamp when owner reviewed
  reviewedBy?: string; // Owner ID who reviewed
  rejectionReason?: string; // Reason for rejection (spam, inappropriate, duplicate, etc.)
  moderationNotes?: string; // Internal moderation notes

  // External verification (future-ready)
  externalSource?: "google" | "yelp" | "houzz" | "manual" | null;
  externalUrl?: string | null;
  externalId?: string | null;

  // Google sync fields (provider-specific, not canonical)
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
  
  // Future-ready features
  photos?: string[]; // Array of media IDs for review photos
  projectAssociation?: string; // Project ID for contextual linking
  verificationIndicator?: boolean; // Badge for verified purchases/projects
}

export interface ReviewAggregate {
  average: number;
  count: number;
  fiveStarCount: number;
  fourStarCount: number;
  threeStarCount: number;
  twoStarCount: number;
  oneStarCount: number;
  verifiedCount: number;
  featuredCount: number;
  googleCount: number;
  manualCount: number;
  latestReview?: Review;
}

export interface ReviewsManifest {
  version: string;
  generatedAt: string;
  reviews: Review[];
}

/**
 * ReviewPublisher - publishes reviews to all consumers
 * 
 * Architecture: ReviewAuthority → ReviewPublisher → Website, Analytics, Emails, CRM, Homepage
 * 
 * Every consumer reads the SAME review through the publisher.
 * This ensures consistency across all platforms.
 */
export interface ReviewPublisher {
  /**
   * Publish review to website
   */
  publishToWebsite(review: Review): Promise<void>;
  
  /**
   * Publish review to analytics
   */
  publishToAnalytics(review: Review): Promise<void>;
  
  /**
   * Publish review to email system
   */
  publishToEmail(review: Review): Promise<void>;
  
  /**
   * Publish review to CRM (future)
   */
  publishToCRM(review: Review): Promise<void>;
  
  /**
   * Publish review to all consumers
   */
  publish(review: Review): Promise<void>;
}
