/**
 * Media Authority - Single Media Database
 * 
 * media.v1.json is the central media database.
 * Every image belongs to ONE media database.
 * Never duplicate metadata.
 * 
 * Architecture Principle: Type-safe lifecycle boundaries
 * - DriveReference: Source metadata only, never enters public presentation
 * - MaterializingMedia: Bytes in progress, never enters public presentation
 * - PublishedMediaAsset: Fully validated public asset, only this enters website
 * - StaleMedia: Needs refresh, never enters public presentation
 */

export type MediaRole = "hero" | "before" | "after" | "detail" | "progress" | "gallery" | "brand" | "portrait" | "logo";

export type MediaType = "image" | "video" | "document";

export type MediaOrientation = "landscape" | "portrait" | "square";

/**
 * Media Lifecycle States
 * 
 * SOURCE_REFERENCE: Drive metadata only, no bytes downloaded
 * MATERIALIZING: Bytes downloaded, content hash computed
 * MATERIALIZED: Master stored in Blob, derivatives ready
 * RENDITION_READY: All presentation variants generated
 * PUBLISHED: Available in production CDN
 * STALE: Master or derivatives need refresh
 */
export type MediaLifecycleState = 
  | 'source_reference'   // Drive metadata only
  | 'materializing'      // Downloading bytes
  | 'materialized'       // Master in Blob
  | 'rendition_ready'    // Derivatives generated
  | 'published'          // CDN available
  | 'stale';             // Needs refresh

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
  responsive?: Array<{
    width: number;
    webp: string;
    avif: string;
  }>;
}

/**
 * DriveReference - Source metadata only, never enters public presentation
 * 
 * Purpose: Workbench can browse/manage Drive references
 * Invariant: Cannot cross the public media boundary
 */
export interface DriveReference {
  id: string;
  lifecycleState: 'source_reference';
  sourceIdentityHash: string; // Hash of source identity (fileId + driveId)
  source: 'google-drive';
  drive: {
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
  dimensions?: MediaDimensions; // Optional for source references
  variants?: MediaVariants; // Optional for source references
  alt: string;
  description?: string;
  tags: string[];
  createdAt?: string;
  uploadedAt?: string;
  fileSize?: number;
  format?: string;
  colorSpace?: string;
}

/**
 * MaterializingMedia - Bytes in progress, never enters public presentation
 * 
 * Purpose: Track download/transcode progress
 * Invariant: Cannot cross the public media boundary
 */
export interface MaterializingMedia {
  id: string;
  lifecycleState: 'materializing';
  contentHash: string; // SHA-256 hash of actual bytes
  source: 'google-drive' | 'local';
  drive?: {
    fileId: string;
    driveId?: string;
    name: string;
    mimeType: string;
    webViewUrl?: string;
    modifiedTime?: string;
  };
  filename: string;
  type: MediaType;
  orientation: MediaOrientation;
  dimensions?: MediaDimensions; // Required once materialized
  variants?: MediaVariants; // Required once materialized
  alt: string;
  description?: string;
  tags: string[];
  createdAt?: string;
  uploadedAt?: string;
  fileSize?: number;
  format?: string;
  colorSpace?: string;
}

/**
 * PublishedMediaAsset - Fully validated public asset, only this enters website
 * 
 * Purpose: Public presentation - invariant: cannot contain Drive URLs
 * 
 * REQUIRED fields for published media:
 * - id: stable immutable identity
 * - contentHash: SHA-256 of actual bytes
 * - dimensions: non-zero width/height
 * - lifecycleState: 'published'
 * - source: 'local' (Drive-backed assets cannot be published)
 * - variants.original: actual public URL (not Drive proxy)
 * - No thumbnailProxyUrl
 * - No /api/drive/* URLs
 * - No drive field
 */
export interface PublishedMediaAsset {
  id: string;
  contentHash: string; // SHA-256 hash of actual bytes (REQUIRED)
  source: 'local'; // Published assets must be local (REQUIRED)
  lifecycleState: 'published'; // Only published state allowed (REQUIRED)
  filename: string;
  type: MediaType;
  orientation: MediaOrientation;
  dimensions: MediaDimensions; // Non-zero dimensions (REQUIRED)
  variants: MediaVariants; // At least one valid rendition (REQUIRED)
  alt: string;
  description?: string;
  tags: string[];
  createdAt?: string;
  uploadedAt?: string;
  fileSize?: number;
  format?: string;
  colorSpace?: string;
}

/**
 * StaleMedia - Needs refresh, never enters public presentation
 * 
 * Purpose: Track assets that need re-materialization
 * Invariant: Cannot cross the public media boundary
 */
export interface StaleMedia {
  id: string;
  lifecycleState: 'stale';
  contentHash: string; // Previous content hash
  source: 'google-drive' | 'local';
  drive?: {
    fileId: string;
    driveId?: string;
    name: string;
    mimeType: string;
    webViewUrl?: string;
    modifiedTime?: string;
  };
  filename: string;
  type: MediaType;
  orientation: MediaOrientation;
  dimensions: MediaDimensions;
  variants: MediaVariants;
  alt: string;
  description?: string;
  tags: string[];
  createdAt?: string;
  uploadedAt?: string;
  fileSize?: number;
  format?: string;
  colorSpace?: string;
}

/**
 * Media - Union type for all lifecycle states
 * 
 * Legacy type for compatibility - new code should use specific lifecycle types
 * 
 * DEPRECATED: Prefer specific lifecycle types (DriveReference, MaterializingMedia, PublishedMediaAsset, StaleMedia)
 */
export interface Media {
  id: string;
  contentHash?: string; // SHA-256 hash of actual bytes (null for source_reference)
  sourceIdentityHash?: string; // Hash of source identity (fileId + driveId) for source_reference
  source?: 'google-drive' | 'local'; // Source of the asset
  lifecycleState?: MediaLifecycleState; // Explicit lifecycle state
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

/**
 * Type guards for lifecycle states
 */
export function isDriveReference(media: Media): media is DriveReference {
  return media.lifecycleState === 'source_reference';
}

export function isMaterializingMedia(media: Media): media is MaterializingMedia {
  return media.lifecycleState === 'materializing';
}

export function isPublishedMediaAsset(media: Media): media is PublishedMediaAsset {
  return media.lifecycleState === 'published' && 
         media.source === 'local' && 
         typeof media.contentHash === 'string' &&
         media.contentHash.length > 0 &&
         media.dimensions.width > 0 &&
         media.dimensions.height > 0 &&
         !media.drive;
}

export function isStaleMedia(media: Media): media is StaleMedia {
  return media.lifecycleState === 'stale';
}

export interface MediaManifest {
  version: string;
  generatedAt: string;
  media: Media[];
}
