/**
 * Operational database schema — Google Sheets as the source of truth (P3).
 * The website stays static; everything operational flows through Sheets/API.
 * Each record carries provenance: source, effectiveDate, confidence, lastVerified.
 */

export interface Provenance {
  source: string;          // e.g. "owner-input", "google-places", "supplier-quote"
  effectiveDate: string;   // ISO date the record became valid
  confidence: number;      // 0–1
  lastVerified: string;    // ISO date last checked
}

export interface Customer extends Provenance {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  county: string;
  source: string;
}

export interface Project extends Provenance {
  projectId: string;
  customerId: string;
  service: string;          // Service.slug
  title: string;
  status: "inquiry" | "estimate" | "scheduled" | "in-progress" | "complete";
  startDate?: string;
  completionDate?: string;
}

export interface Quote extends Provenance {
  quoteId: string;
  projectId: string;
  planningRange: [number, number];
  actualQuote?: number;
  accepted?: boolean;
  finalInvoice?: number;
  profitability?: number;
  materialsUsed?: string[];
  daysRequired?: number;
}

export interface Review extends Provenance {
  reviewId: string;
  projectId?: string;
  author: string;
  location: string;
  rating: number;
  title: string;
  body: string;
  source: "google" | "internal" | "manual";
  published: boolean;
}

export interface PhotoCatalogRecord extends Provenance {
  photoId: string;
  projectId?: string;
  service?: string;
  before?: boolean;
  after?: boolean;
  materials?: string[];
  techniques?: string[];
  exterior?: boolean;
  interior?: boolean;
  style?: string;
  mood?: string;
  primaryFeature?: string;
  secondaryFeature?: string;
  orientation?: "portrait" | "landscape" | "square";
  heroScore?: number;
  homepageScore?: number;
  galleryScore?: number;
  season?: string;
  tags?: string[];
  focalPoint?: { x: number; y: number };
}

export interface FollowUp extends Provenance {
  followUpId: string;
  projectId: string;
  stage: "internal-satisfaction" | "google-request" | "referral-ask" | "maintenance-reminder";
  sentAt?: string;
  responded?: boolean;
  outcome?: string;
}

export interface Referral extends Provenance {
  referralId: string;
  projectId: string;
  referredName?: string;
  referredContact?: string;
  converted?: boolean;
}

export interface EstimateAnalytic extends Provenance {
  estimateId: string;
  requestedServices: string[];
  zip: string;
  city: string;
  planningRange: [number, number];
  actualQuote?: number;
  accepted?: boolean;
  finalInvoice?: number;
  completionDate?: string;
  profitability?: number;
  materialsUsed?: string[];
  daysRequired?: number;
}

export interface MaterialPricing extends Provenance {
  materialId: string;
  name: string;
  unit: string;
  priceRange: [number, number];
}

export interface KnowledgeBaseEntry extends Provenance {
  entryId: string;
  category:
    | "materials"
    | "labor"
    | "oregon-practices"
    | "permit-guidance"
    | "supplier-costs"
    | "seasonal"
    | "historical-estimates"
    | "completed-projects"
    | "confidence-models";
  body: string;
}

/** The ten operational sheets, in the order the CEO specified. */
export const SHEET_NAMES = [
  "Customers",
  "Projects",
  "Quotes",
  "Reviews",
  "Photo Catalog",
  "Follow Ups",
  "Referrals",
  "Estimate Analytics",
  "Material Pricing",
  "Knowledge Base",
] as const;

export type SheetName = (typeof SHEET_NAMES)[number];
