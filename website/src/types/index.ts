/**
 * Stable domain objects for the Contractor Platform.
 *
 * These names are the future platform language. Even though the MVP has no
 * backend, every component references these types so that when a real API
 * replaces the mock services, only the service implementation changes — not
 * the components. Do not invent UI-specific models.
 */

export interface Company {
  name: string;
  legalName: string;
  tagline: string;
  description: string;
  ccbNumber: string;
  email: string;
  phone: string;
  phoneDisplay: string;
  address: {
    city: string;
    region: string;
    country: string;
  };
  serviceArea: string;
  businessHours: string;
  social: SocialProfile[];
  /** Public owners/faces of the company (partnership). */
  owners: {
    name: string;
    title: string;
    focus: string;
  }[];
  /** Micro-proof woven through the site (no big "why choose us" block needed). */
  proof: {
    projectsCompleted: string; // "150+"
    estimateResponse: string;  // "Most estimates within 1–2 business days"
    yearsInBusiness: string;   // "12"
    insured: boolean;
    bonded: boolean;
    serviceCounties: string[];
  };
}

export interface SocialProfile {
  platform: "facebook" | "instagram" | "youtube" | "linkedin" | "google" | "yelp";
  label: string;
  url: string;
}

export interface ServiceCategory {
  slug: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  order: number;
}

export interface EstimateQuestion {
  /** stable key used by the estimate wizard */
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "number" | "boolean";
  options?: string[];
  required?: boolean;
  placeholder?: string;
  help?: string;
}

export interface Service {
  slug: string;
  title: string;
  category: string; // ServiceCategory.slug
  summary: string;
  description: string;
  icon: string; // lucide icon name
  heroImage: string; // image asset path or id
  galleryRefs: string[]; // GalleryItem.id[]
  /** Micro-proof line shown on the card (e.g. "150+ completed"). Optional. */
  stat?: string;
  estimateQuestions: EstimateQuestion[];
  seo: SeoMeta;
}

export interface GalleryItem {
  id: string;
  project: string;
  service: string; // Service.slug
  src: string; // image asset path
  alt: string;
  featured: boolean;
  beforeAfter?: "before" | "after" | null;
  county?: string;
  tags: string[];
  width: number;
  height: number;
  /** Image Registry metadata (Directive 032): intent-based curation. */
  category?: string; // Decks | Kitchens | Fences | Owner | BeforeAfter | ...
  orientation?: "landscape" | "portrait" | "square";
  hero?: boolean;
  priority?: number; // 1–10; higher = more likely featured
  /** optional base64 blur placeholder for next/image placeholder="blur" */
  blurDataURL?: string;
}

export interface Review {
  id: string;
  author: string;
  location: string;
  rating: number; // 1-5
  title: string;
  body: string;
  date: string; // ISO
  project?: string;
  service?: string; // Service.slug
  source?: string; // e.g. "Google"
  verified?: boolean;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
}

export interface County {
  slug: string;
  name: string;
  cities?: string[];
}

/** ---- Estimate Request aggregate (submitted via the wizard) ---- */

export interface Customer {
  name: string;
  email: string;
  phone: string;
}

export interface Property {
  address: string;
  city: string;
  county: string;
  details?: string;
}

export interface EstimateRequest {
  customer: Customer;
  property: Property;
  service: string; // Service.slug
  answers: Record<string, string | boolean | number>;
  photos: { name: string; size: number }[]; // metadata only; bytes never leave the browser in MVP
  notes?: string;
  submittedAt: string; // ISO
}

/** ---- Contact (simple) ---- */

export interface ContactRequest {
  name: string;
  email: string;
  phone?: string;
  message: string;
  submittedAt: string;
}

export interface SeoMeta {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}

/** ---- Structured image asset (image pipeline is a first-class feature) ---- */
export interface ImageAsset {
  /** path to the display image (optimized variant or original) */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** tiny base64 blur placeholder (data URL) for next/image placeholder="blur" */
  blurDataURL?: string;
  caption?: string;
}

/** ---- Project (Project Spotlight: tells a completed-project story) ---- */
export interface Project {
  slug: string;
  title: string;
  service: string; // Service.slug
  county?: string;
  summary: string;
  challenge: string;
  solution: string;
  materials: string[];
  outcome: string;
  /** ordered photos; first is the hero */
  photos: ImageAsset[];
  featured?: boolean;
  completedAt?: string; // ISO
}

