/**
 * Project Authority - Business Database
 * 
 * projects.v1.json is the central business database.
 * All project data hangs from this structure.
 * 
 * Architecture: Google Drive → Photo Pipeline → Project Authority → Website Presentation
 * 
 * Every project should already support future expansion.
 * Even if fields are empty, they should exist to avoid schema updates later.
 */

export type ProjectService = 
  | "decks"
  | "fences"
  | "kitchens"
  | "bathrooms"
  | "painting"
  | "finish-carpentry"
  | "restoration"
  | "outdoor-living"
  | "repairs"
  | "built-ins"
  | "pergolas"
  | "adus"
  | "pole-barns"
  | "other";

export type ProjectStatus = "completed" | "in-progress" | "planned" | "on-hold" | "archived";

export interface ProjectLocation {
  city: string;
  county: string;
  state: string;
  zip?: string;
  neighborhood?: string;
  address?: string; // For internal use only, never displayed publicly
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ProjectMedia {
  hero: string; // Main hero image ID from media.v1.json
  before?: string; // Before state image ID
  after?: string; // After state image ID
  gallery: string[]; // Gallery image IDs
  details?: string[]; // Detail shot IDs
  progress?: string[]; // Progress/construction photos
  documents?: string[]; // Document IDs (permits, plans, etc.)
}

export interface ProjectStory {
  challenge: string;
  solution: string;
  outcome: string;
  clientGoals?: string;
  specialFeatures?: string[];
  timeline?: string;
  designNotes?: string;
  challenges?: string[];
}

export interface ProjectEstimate {
  estimatedRange: {
    low: number;
    high: number;
  };
  finalCost?: number;
  services: string[];
  materials?: string[];
  timeline?: string;
  estimateDate?: string; // ISO date string
  acceptedDate?: string; // ISO date string
  notes?: string;
}

export interface ProjectWarranty {
  hasWarranty: boolean;
  warrantyType?: string;
  warrantyYears?: number;
  warrantyDetails?: string;
  warrantyStartDate?: string; // ISO date string
  warrantyEndDate?: string; // ISO date string
}

export interface ProjectSEO {
  slug: string;
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
  ogImage?: string; // Image ID from media.v1.json
  canonicalUrl?: string;
  sitemapPriority?: number; // 0.0 to 1.0
  sitemapChangeFreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
}

export interface ProjectServices {
  primary: ProjectService;
  secondary?: ProjectService[];
  customServices?: string[];
}

export interface ProjectMaterials {
  primary?: string;
  secondary?: string[];
  customMaterials?: string[];
  suppliers?: string[];
}

export interface ProjectFeatures {
  custom?: string[];
  accessibility?: string[];
  sustainability?: string[];
  smartHome?: string[];
}

export interface ProjectTimeline {
  estimatedStart?: string; // ISO date string
  estimatedEnd?: string; // ISO date string
  actualStart?: string; // ISO date string
  actualEnd?: string; // ISO date string
  phases?: Array<{
    name: string;
    start?: string;
    end?: string;
    status?: "pending" | "in-progress" | "completed";
  }>;
}

export interface ProjectTeam {
  leadCarpenter?: string;
  crew?: string[];
  designer?: string;
  architect?: string;
  subcontractors?: Array<{
    role: string;
    company: string;
  }>;
}

export interface ProjectClient {
  name?: string; // For internal use only
  contactMethod?: string; // For internal use only
  referralSource?: string; // How they found us
  firstTimeClient?: boolean;
}

export interface ProjectRelated {
  relatedProjectIds?: string[]; // IDs of related projects
  similarProjects?: string[]; // IDs of similar projects
  beforeAfterPair?: string; // ID of project this is before/after pair with
}

export interface Project {
  // Core identity
  id: string;
  title: string;
  service: ProjectService;
  status: ProjectStatus;
  
  // Location
  location: ProjectLocation;
  
  // Timeline
  completionDate?: string; // ISO date string
  startDate?: string; // ISO date string
  
  // Media (references media.v1.json)
  media: ProjectMedia;
  
  // Story
  story?: ProjectStory;
  
  // Business
  estimate?: ProjectEstimate;
  warranty?: ProjectWarranty;
  
  // Classification
  tags: string[];
  reviews: string[]; // Review IDs from reviews.v1.json
  
  // Editorial
  featured?: boolean;
  heroEligible?: boolean;
  homepageEligible?: boolean;
  
  // SEO
  seo?: ProjectSEO;
  
  // Services
  services?: ProjectServices;
  
  // Materials
  materials?: ProjectMaterials;
  
  // Features
  features?: ProjectFeatures;
  
  // Timeline
  timeline?: ProjectTimeline;
  
  // Team
  team?: ProjectTeam;
  
  // Client (internal)
  client?: ProjectClient;
  
  // Related projects
  related?: ProjectRelated;
  
  // Internal
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  publishedAt?: string; // ISO date string
  archivedAt?: string; // ISO date string
  
  // Version control
  version?: number;
  lastModifiedBy?: string;
}

export interface ProjectsManifest {
  version: string;
  generatedAt: string;
  projects: Project[];
}
