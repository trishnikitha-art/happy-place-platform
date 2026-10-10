/**
 * Canonical String Authority
 * 
 * Single authoritative source for all user-facing static strings.
 * Every user-facing static string should be traceable from canonical key → source → component → production UI.
 * 
 * Architecture Principle:
 * - Canonical identity → authority → component → presentation
 * - Same constitutional pattern as media: source identity → materialization → publication → presentation
 * 
 * Namespace Convention:
 * - nav.* - Navigation items
 * - homepage.* - Homepage-specific strings
 * - trust.* - Trust signals/statistics
 * - services.* - Services section strings
 * - featuredProjects.* - Featured projects section
 * - family.* - Family/owner section
 * - reviews.* - Reviews section
 * - about.* - About page
 * - contact.* - Contact page
 * - estimate.* - Estimate page
 * - workbench.* - Workbench UI
 * - newsletter.* - Newsletter signup
 * - cta.* - Call-to-action components
 * - serviceCard.* - Service card components
 * - placeholder.* - Placeholder sections
 * - beforeAfter.* - Before/after slider
 * - api.error.* - API error messages
 * - a11y.* - Accessibility strings
 */

import textCatalog from '@/config/strings.v1.json';
import { decodeTextCatalog } from './text-contract';
const editableText = decodeTextCatalog(textCatalog);

// Navigation (nav.*)
export const NAV = {
  home: "Home",
  services: "Services",
  ourWork: "Our Work",
  about: "About",
  reviews: "Reviews",
  estimate: "Get a Free Estimate",
} as const;

// Homepage (homepage.*)
export const HOMEPAGE = {
  hero: {
    title: editableText.fields['homepage.hero.title'].value,
    description: editableText.fields['homepage.hero.description'].value,
  },
  seeOurWork: editableText.fields['homepage.hero.secondaryAction'].value,
  tellUsPlanning: editableText.fields['home.copy.2'].value,
} as const;

// Trust Signals (trust.*)
export const TRUST = {
  licensed: "Licensed, Bonded & Insured",
  familyOwned: "Family-Owned",
  serviceArea: "Mid-Willamette Valley",
  projectsCompleted: "Projects Completed",
} as const;

// Services (services.*)
export const SERVICES = {
  title: editableText.fields['homepage.services.title'].value,
  description: editableText.fields['homepage.services.description'].value,
} as const;

// Featured Projects (featuredProjects.*)
export const FEATURED_PROJECTS = {
  title: editableText.fields['homepage.projects.title'].value,
  description: editableText.fields['homepage.projects.description'].value,
  seeAll: editableText.fields['home.copy.4'].value,
} as const;

// Family Section (family.*)
export const FAMILY = {
  tagline: editableText.fields['homepage.family.eyebrow'].value,
  title: editableText.fields['homepage.family.title'].value,
} as const;

// Reviews (reviews.*)
export const REVIEWS = {
  title: editableText.fields['homepage.reviews.title'].value,
  empty: editableText.fields['homepage.reviews.empty'].value,
  readAll: editableText.fields['home.copy.5'].value,
  helpingNeighbors: "Helping neighbors find their happy place",
  leaveReview: "Leave a Review",
} as const;

// About Page (about.*)
export const ABOUT = {
  serviceArea: {
    title: editableText.fields['about.area.title'].value,
  },
  cta: {
    title: editableText.fields['about.cta.title'].value,
  },
} as const;

// Contact Page (contact.*)
export const CONTACT = {
  title: editableText.fields['contact.hero.title'].value,
  phone: editableText.fields['contact.copy.2'].value,
  email: editableText.fields['contact.copy.3'].value,
  serviceArea: editableText.fields['contact.copy.4'].value,
  hours: editableText.fields['contact.copy.5'].value,
} as const;

// Estimate Page (estimate.*)
export const ESTIMATE = {
  title: "Let's scope your project",
  description: "About two minutes. Your details go straight to our inbox — no account, no spam.",
} as const;

// Workbench (workbench.*)
export const WORKBENCH = {
  login: {
    title: "Workbench Login",
    subtitle: "Administrative access required",
    password: "Password",
    placeholder: "Enter workbench password",
    button: "Login",
  },
  connectors: {
    title: "Connector Studio",
    connectDrive: "Connect Drive",
    openDrive: "Open Drive",
  },
  explorer: {
    title: "Google Drive Explorer",
    search: "Search files and folders...",
    useAsset: "Use This Asset",
  },
} as const;

// Newsletter (newsletter.*)
export const NEWSLETTER = {
  title: editableText.fields['newsletter.title'].value,
  description: editableText.fields['newsletter.description'].value,
  emailPlaceholder: "Email address",
  firstNamePlaceholder: "First name (optional)",
  subscribe: "Subscribe",
  noSpam: editableText.fields['newsletter.privacy'].value,
} as const;

// CTA Components (cta.*)
export const CTA = {
  startFreeEstimate: "Start Your Free Estimate",
} as const;

// Service Card (serviceCard.*)
export const SERVICE_CARD = {
  startQuote: "Start a quote",
  photosComingSoon: "Project photos coming soon",
} as const;

// Placeholder (placeholder.*)
export const PLACEHOLDER = {
  gallery: "Project Photos Coming Soon",
  galleryDescription: "We're currently building our portfolio. Check back soon to see our latest work.",
} as const;

// Before/After (beforeAfter.*)
export const BEFORE_AFTER = {
  before: "Before",
  after: "After",
} as const;

// API Errors (api.error.*)
export const API_ERROR = {
  unauthorized: "Unauthorized",
  workbenchAuthRequired: "Workbench authentication required",
  driveDiscoveryFailed: "Failed to discover Drive structure",
  driveFilesFailed: "Failed to list Drive files",
  estimateFailed: "Estimate submission failed",
  reviewValidationFailed: "Review validation failed",
  newsletterFailed: "Failed to subscribe to newsletter",
} as const;

// Accessibility (a11y.*)
export const A11Y = {
  theme: {
    toggle: "Toggle theme",
  },
  siteHeader: {
    home: "{company.name} home",
    primary: "Primary",
    mobile: "Mobile",
    closeMenu: "Close menu",
    openMenu: "Open menu",
  },
} as const;

// Dynamic Templates (with interpolation support)
export const DYNAMIC = {
  about: {
    heroTitle: (signature: string) => `Every family deserves a ${signature} place.`,
  },
  estimate: {
    preferTalk: (phone: string, email: string) => `Prefer to talk? Call ${phone} or email ${email}.`,
  },
  starRating: {
    aria: (rating: number) => `Rated ${rating} out of 5`,
  },
  stats: {
    average: (average: number, count: number) => `${average} / 5 across ${count} featured reviews from homeowners across the Willamette Valley.`,
  },
} as const;

/**
 * Helper function to get a string by key
 * This provides a typed lookup interface for string resolution
 */
export function getString(namespace: string, key: string): string {
  // This function will be expanded as needed for dynamic lookup
  // For now, direct namespace access is preferred for type safety
  throw new Error(`String lookup not yet implemented for ${namespace}.${key}`);
}

/**
 * Dynamic string interpolation helper
 */
export function interpolate(template: string, variables: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return variables[key]?.toString() || match;
  });
}
