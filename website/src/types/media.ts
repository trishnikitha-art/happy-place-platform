/**
 * Media Authority - Single Media Database
 * 
 * media.v1.json is the central media database.
 * Every image belongs to ONE media database.
 * Never duplicate metadata.
 */

export type MediaRole = "hero" | "before" | "after" | "detail" | "progress" | "gallery" | "brand" | "portrait" | "logo";

export type MediaType = "image" | "video" | "document";

export type MediaOrientation = "landscape" | "portrait" | "square";

export interface MediaDimensions {
  width: number;
  height: number;
}

export interface MediaVariants {
  original?: string;
  webp?: string;
  avif?: string;
  thumbnail?: string;
  blur?: string; // Base64 blur data URL
  web?: string; // Simplified web variant for vertical slice
}

export interface Media {
  id: string;
  driveId?: string; // Google Drive ID
  filename: string;
  type: MediaType;
  orientation: MediaOrientation;
  
  dimensions: MediaDimensions;
  variants: MediaVariants;
  
  alt: string;
  description?: string;
  
  // Classification
  service?: string;
  city?: string;
  county?: string;
  state?: string;
  projectId?: string;
  tags: string[];
  
  // Roles
  roles: MediaRole[];
  
  // Ordering
  order?: number; // Display order within project
  
  // Editorial
  featured?: boolean;
  heroEligible?: boolean;
  homepageEligible?: boolean;
  
  // Metadata
  createdAt?: string; // ISO date string
  updatedAt?: string; // ISO date string
  uploadedAt?: string; // ISO date string
  
  // Technical
  fileSize?: number;
  format?: string;
  colorSpace?: string;
}

export interface MediaManifest {
  version: string;
  generatedAt: string;
  media: Media[];
}
