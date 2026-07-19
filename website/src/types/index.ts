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
