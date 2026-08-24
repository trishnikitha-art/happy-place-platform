/**
 * Media Authority Adapter
 * 
 * NEW ARCHITECTURE: Media Authority (media.v1.json)
 * The new architecture uses media.v1.json as the single media database.
 * Components use intent-based adapters to access media by intent, not IDs.
 * 
 * Legacy functions (heroBackground, ownerPortrait, servicePhoto, photoFor, etc.)
 * have been removed. Use Brand Authority for homepage hero and owner portraits.
 * Use Media Authority adapters for project media.
 * 
 * Architecture:
 *   Authority ΓåÆ Adapter ΓåÆ Component
 * 
 * Never:
 *   Component ΓåÆ JSON
 *   Component ΓåÆ Hardcoded IDs
 */
import type { Media, MediaManifest } from "@/types/media";
import { isDriveReference, isMaterializingMedia, isPublishedMediaAsset, isStaleMedia } from "@/types/media";

// Re-export type guards for convenience
export { isDriveReference, isMaterializingMedia, isPublishedMediaAsset, isStaleMedia };
import { getProjectsByServiceSlug } from "@/lib/projects";
import type { Project } from "@/types/projects";
import { loadAuthority, clearAuthorityCache, findById, sortByOrder } from "./authority-loader";

// Load media manifest using shared AuthorityLoader
export function loadMediaManifest(): MediaManifest {
  return loadAuthority<MediaManifest>({
    path: "@/config/media.v1.json",
    fallback: { version: "1.0.0", generatedAt: new Date().toISOString(), media: [] },
    name: "Media"
  });
}

/**
 * Get the full media manifest (for Authority Editor)
 */
export function getMediaManifest(): MediaManifest {
  return loadMediaManifest();
}

/**
 * Get media by ID from media.v1.json (static) or KV (dynamic Drive records)
 */
export function getMediaById(id: string): Media | null {
  // First check static media.v1.json (existing HP images)
  const manifest = loadMediaManifest();
  const staticMedia = findById(manifest.media, id);
  if (staticMedia) {
    return staticMedia;
  }

  // Check dynamic KV cache (Drive records preloaded via loadDynamicMedia)
  const dynamicMedia = findById(dynamicMediaCache, id);
  if (dynamicMedia) {
    return dynamicMedia;
  }

  return null;
}

/**
 * Async version that checks KV directly (for dynamic loading)
 * 
 * AUTHORITY PRECEDENCE: Runtime KV first, static authority as fallback
 * 
 * This ensures that materialized PublishedMediaAsset records take precedence
 * over static canonical records. Static authority serves as fallback for
 * legacy compatibility when runtime records are not available.
 */
export async function getMediaByIdAsync(id: string): Promise<Media | null> {
  // FIRST: Check KV store for runtime PublishedMediaAsset records
  // Runtime authority (materialized assets) takes precedence
  try {
    const { getMedia } = await import('@/lib/media-kv-store');
    const dynamicMedia = await getMedia(id);
    if (dynamicMedia) {
      // Cache it for future synchronous access
      dynamicMediaCache.push(dynamicMedia);
      return dynamicMedia;
    }
  } catch (error) {
    console.log('[MEDIA] KV lookup failed:', error);
  }

  // SECOND: Fall back to static media.v1.json for legacy compatibility
  // Static authority is fallback when runtime records are not available
  const staticMedia = getMediaById(id);
  if (staticMedia) {
    return staticMedia;
  }

  return null;
}

/**
 * Public Media Materialization Gate
 * 
 * STRICT CONTRACT: Only returns published/public MediaAssets for production presentation.
 * Rejects source references, materializing state, stale assets, and Drive proxy URLs.
 * 
 * This enforces the Drive → public delivery boundary:
 * - Workbench can see DriveReferences
 * - Website can ONLY see published MediaAssets with public URLs
 * 
 * @param id - Media ID to resolve
 * @returns Published MediaAsset OR null (explicit unavailable state)
 * 
 * Rejected states:
 * - drive-prefixed IDs (source references)
 * - lifecycleState === 'source_reference'
 * - lifecycleState === 'materializing'
 * - lifecycleState === 'stale'
 * - Media with /api/drive/* URLs
 * - Media with thumbnailProxyUrl
 * - Media without contentHash
 * - Media without valid dimensions
 * - Media without valid rendition
 * - Media with drive field
 * - Media with source !== 'local'
 */
export async function resolvePublicMedia(id: string): Promise<Media | null> {
  console.log('[PUBLIC_MEDIA_GATE] Resolving public media:', { id });

  // REJECT: drive-prefixed IDs (source references)
  // drive- and drive-ref- prefixes are reserved for DriveReference only
  if (id.startsWith('drive-') || id.startsWith('drive-ref-')) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: drive-prefixed ID', { id });
    return null;
  }

  // Resolve media via standard path
  const media = await getMediaByIdAsync(id);
  if (!media) {
    console.log('[PUBLIC_MEDIA_GATE] NOT_FOUND:', { id });
    return null;
  }

  // REJECT: source_reference lifecycle state using type guard
  if (isDriveReference(media)) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: source_reference lifecycle state', { id, lifecycleState: media.lifecycleState });
    return null;
  }

  // REJECT: materializing lifecycle state using type guard
  if (isMaterializingMedia(media)) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: materializing lifecycle state', { id, lifecycleState: media.lifecycleState });
    return null;
  }

  // REJECT: stale lifecycle state using type guard
  if (isStaleMedia(media)) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: stale lifecycle state', { id, lifecycleState: media.lifecycleState });
    return null;
  }

  // VALIDATE: Must satisfy PublishedMediaAsset contract using type guard
  if (!isPublishedMediaAsset(media)) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: not a valid PublishedMediaAsset', { 
      id, 
      lifecycleState: media.lifecycleState,
      source: media.source,
      hasContentHash: typeof media.contentHash === 'string' && media.contentHash.length > 0,
      hasValidDimensions: media.dimensions.width > 0 && media.dimensions.height > 0,
      hasDrive: !!media.drive
    });
    return null;
  }

  // ADDITIONAL VALIDATION: Check for Drive URLs in variants
  const checkForDriveUrl = (obj: any): boolean => {
    if (!obj) return false;
    if (typeof obj === 'string' && obj.startsWith('/api/drive/')) {
      return true;
    }
    if (typeof obj === 'object') {
      return Object.values(obj).some((val) => checkForDriveUrl(val));
    }
    return false;
  };

  if (checkForDriveUrl(media.variants)) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: contains /api/drive/* URL in variants', { id });
    return null;
  }

  // REJECT: Media with thumbnailProxyUrl (Drive reference)
  if ((media as any).thumbnailProxyUrl) {
    console.error('[PUBLIC_MEDIA_GATE] REJECTED: contains thumbnailProxyUrl', { id, thumbnailProxyUrl: (media as any).thumbnailProxyUrl });
    return null;
  }

  console.log('[PUBLIC_MEDIA_GATE] APPROVED: published public media', { id });
  return media;
}

/**
 * Preload dynamic media from KV into memory cache
 * Call this during app initialization or when Drive operations are expected
 * Fails closed in production (no silent in-memory fallback when KV unavailable)
 */
export async function loadDynamicMedia(): Promise<void> {
  try {
    const { getPublishedMediaAssets } = await import('@/lib/visual-asset-registry');
    const publishedAssets = await getPublishedMediaAssets();

    console.log('[MEDIA] Loaded PublishedMediaAssets from KV:', publishedAssets.length);

    // Cache the published assets for on-demand lookup
    dynamicMediaCache.push(...publishedAssets);
  } catch (error) {
    // Check if this is a KV configuration error
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      console.error('[MEDIA] KV not configured - fail-closed for production media authority:', error.message);
      // Fail closed: KV unavailable is different from empty media authority
      // Throw to prevent silent authority disconnect
      throw new Error('KV_MEDIA_AUTHORITY_UNAVAILABLE: KV not configured for dynamic media');
    }
    console.error('[MEDIA] Failed to preload dynamic media (KV unavailable or misconfigured):', error);
    // Fail closed for production media authority
    throw new Error('KV_MEDIA_AUTHORITY_FAILURE: Failed to load dynamic media from KV');
  }
}

/**
 * Get the dynamic media cache (for accessing Drive records)
 */
export function getDynamicMediaCache(): Media[] {
  return dynamicMediaCache;
}

/**
 * Clear dynamic media cache
 */
export function clearDynamicMediaCache(): void {
  dynamicMediaCache = [];
}

// In-memory cache for dynamic KV media
let dynamicMediaCache: Media[] = [];

/**
 * Clear media cache (useful for testing or hot reload)
 */
export function clearMediaCache(): void {
  clearAuthorityCache("@/config/media.v1.json");
}

/**
 * INTENT-BASED MEDIA ADAPTER
 * 
 * These functions provide intent-based lookups instead of exposing media IDs.
 * UI components ask for intent (getProjectMedia, getProjectHero) rather than
 * knowing about media IDs or file paths. This creates a stable API that can
 * change its implementation without affecting UI components.
 */

/**
 * Get all media for a project, sorted by order
 */
export function getProjectMedia(projectId: string) {
  const manifest = loadMediaManifest();
  const projectMedia = manifest.media.filter((m: Media) => m.projectId === projectId);
  return sortByOrder(projectMedia);
}

/**
 * Get hero image for a project
 */
export function getProjectHero(projectId: string): Media | null {
  const projectMedia = getProjectMedia(projectId);
  return projectMedia.find((m: Media) => m.roles.includes('hero')) || null;
}

/**
 * Get thumbnail for a project (first gallery image or hero)
 */
export function getProjectThumbnail(projectId: string): Media | null {
  const projectMedia = getProjectMedia(projectId);
  return projectMedia.find((m: Media) => m.roles.includes('gallery')) || getProjectHero(projectId);
}

/**
 * Get before/after pair for a project
 */
export function getProjectBeforeAfter(projectId: string): { before: Media | null; after: Media | null } {
  const projectMedia = getProjectMedia(projectId);
  return {
    before: projectMedia.find((m: Media) => m.roles.includes('before')) || null,
    after: projectMedia.find((m: Media) => m.roles.includes('after')) || null,
  };
}

/**
 * Get media by role for a project
 */
export function getProjectMediaByRole(projectId: string, role: string): Media | null {
  const projectMedia = getProjectMedia(projectId);
  return projectMedia.find((m: Media) => m.roles.includes(role as any)) || null;
}

/**
 * Get featured media for a service
 * Returns the hero image of the highest-ranked project for that service
 * 
 * Priority:
 * 1. Featured completed project (most recent)
 * 2. Newest completed project
 * 3. Null (intentional empty state)
 */
export function getFeaturedServiceMedia(serviceSlug: string): Media | null {
  const manifest = loadMediaManifest();
  
  // Get projects for this service from Projects Authority
  const projects = getProjectsByServiceSlug(serviceSlug);
  
  // Filter for completed projects
  const completedProjects = projects.filter((p: Project) => p.status === 'completed');
  
  if (completedProjects.length === 0) return null;
  
  // First try: featured projects
  const featuredProjects = completedProjects.filter((p: Project) => p.featured);
  
  // Sort by completion date (most recent first)
  const sortProjects = (a: Project, b: Project) => {
    const dateA = new Date(a.completionDate || 0).getTime();
    const dateB = new Date(b.completionDate || 0).getTime();
    return dateB - dateA;
  };
  
  featuredProjects.sort(sortProjects);
  completedProjects.sort(sortProjects);
  
  // Get the top project (featured first, otherwise newest)
  const topProject = featuredProjects[0] || completedProjects[0];
  if (!topProject) return null;
  
  // Get hero media for the top project
  const heroMediaId = topProject.media.hero;
  if (!heroMediaId) return null;
  
  return getMediaById(heroMediaId);
}
