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
  contentHash?: string; // SHA-256 hash of content for stable identity
  source?: 'google-drive' | 'local'; // Source of the asset
  drive?: {
    fileId: string;
    driveId?: string; // Shared Drive ID if applicable
    name: string;
    mimeType: string;
    webViewUrl?: string;
    modifiedTime?: string;
  };
  filename: string;
  type: MediaType;
  orientation: MediaOrientation;

  dimensions: MediaDimensions | null; // null until materialization (never fabricate 1920x1080)
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

  // Provenance (for reconciliation tracking)
  provenance?: {
    august3_driveId?: string;
    match_type?: string;
    confidence?: string;
    drive_canonical?: boolean;
    physical_deployment?: boolean;
    status?: string;
    current_authority?: boolean;
    preserved_at?: string;
  };
}

export interface MediaManifest {
  version: string;
  generatedAt: string;
  media: Media[];
}
