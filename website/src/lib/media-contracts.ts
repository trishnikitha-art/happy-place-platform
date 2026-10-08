/**
 * Media Processing Contracts
 *
 * This module defines the authoritative contracts for media processing
 * that must be used consistently across all materialization and validation paths.
 *
 * SEPARATION OF CONCERNS:
 * - Materialization shape: Does the media have the correct structure?
 * - Physical proof: Are required storage objects and public URLs accessible?
 * - Public completeness: Stored shape plus the applicable physical proof
 */

import { isPublishedMediaAsset, type Media } from '@/types/media';
import { RESPONSIVE_WIDTHS } from './media-constants';
import staticManifest from '@/config/media.v1.json';

// Release-time image QA proves these committed files exist. Runtime records
// cannot claim an arbitrary /images/ path as physical static authority.
const staticAssets = staticManifest.media;

/**
 * Materialization Shape Contract
 *
 * Verifies that a Media record has the correct structure and required fields.
 * This does NOT verify that the physical bytes actually exist or are valid.
 *
 * A media record has correct shape if it has:
 * - contentHash (not necessarily real, could be synthetic)
 * - original variant
 * - thumbnail variant
 * - blur placeholder
 * - responsive variants at required widths
 * - WebP and AVIF at each width
 * - source: 'local'
 * - lifecycleState: 'published'
 * - No Drive dependency
 */
export function hasMaterializationShape(media: Media): boolean {
  // Must be a PublishedMediaAsset structure
  if (media.lifecycleState !== 'published' || media.source !== 'local') {
    return false;
  }

  // Must have content hash
  if (!media.contentHash) {
    return false;
  }

  // Must have variants
  if (!media.variants) {
    return false;
  }

  // Must have original
  if (!media.variants.original) {
    return false;
  }

  // Must have thumbnail
  if (!media.variants.thumbnail) {
    return false;
  }

  // Must have blur
  if (!media.variants.blur) {
    return false;
  }

  // Must have responsive variants
  if (!media.variants.responsive || !Array.isArray(media.variants.responsive)) {
    return false;
  }

  // Must have WebP and AVIF at every required width
  const imageWidth = media.dimensions?.width || 1920;
  const requiredWidths = RESPONSIVE_WIDTHS.filter(w => w <= imageWidth);

  for (const width of requiredWidths) {
    const responsiveEntry = media.variants.responsive.find(r => r.width === width);
    if (!responsiveEntry) {
      return false;
    }

    if (!responsiveEntry.webp) {
      return false;
    }

    if (!responsiveEntry.avif) {
      return false;
    }
  }

  // Must not have Drive dependency
  if (media.drive) {
    return false;
  }

  return true;
}

/**
 * Real Content Hash Check
 *
 * Rejects malformed hashes and the known ID-derived synthetic identity.
 * This check alone does not prove that a hash matches physical bytes.
 */
export function hasRealContentHash(media: Media): boolean {
  if (typeof media.contentHash !== 'string' || !/^[a-f0-9]{64}$/i.test(media.contentHash)) {
    return false;
  }

  const crypto = require('crypto');
  const syntheticHash = crypto.createHash('sha256').update(media.id).digest('hex');
  return media.contentHash.toLowerCase() !== syntheticHash;
}

/** Stored shape is necessary, but does not establish public eligibility. */
export function hasPublicMediaStructure(media: Media): boolean {
  if (!isPublishedMediaAsset(media) || !['static', 'r2'].includes(media.storage ?? '')
    || (media as Media & { thumbnailProxyUrl?: string }).thumbnailProxyUrl
    || !media.variants || typeof media.variants.original !== 'string' || !media.variants.original) return false;

  if (!/^[a-f0-9]{64}$/i.test(media.contentHash ?? '') || !hasRealContentHash(media)) return false;
  if (media.storage === 'static') {
    const approved = staticAssets.find(asset => asset.contentHash === media.contentHash
      && asset.variants.original === media.variants.original);
    if (!approved) return false;
    // Static identity and every emitted variant must match a committed,
    // release-verified asset. A known path alone is not content identity.
    return Object.entries(approved.variants).every(([key, value]) =>
      (media.variants as Record<string, unknown>)[key] === value)
      && Object.entries(media.variants).every(([key, value]) =>
        (approved.variants as Record<string, unknown>)[key] === value);
  }
  // R2 ingestion content-addresses the original by its SHA-256. A record
  // cannot borrow an existing object's URL while claiming another identity.
  try {
    const filename = decodeURIComponent(new URL(media.variants.original).pathname.split('/').at(-1) ?? '').toLowerCase();
    const prefix = `${media.contentHash!.toLowerCase()}-original`;
    if (!filename.startsWith(`${prefix}.`) && !filename.startsWith(`${prefix}-`)) return false;
  } catch { return false; }
  const validUrls = (value: unknown, field = ''): boolean => {
    if (typeof value === 'string') {
      if (field === 'blur' && value.startsWith('data:image/')) return true;
      try {
        const url = new URL(value);
        return url.protocol === 'https:' && !url.username && !url.password;
      } catch { return false; }
    }
    if (Array.isArray(value)) return value.every(entry => validUrls(entry, field));
    if (value && typeof value === 'object') return Object.entries(value).every(([key, entry]) => validUrls(entry, key));
    return typeof value === 'number' && Number.isFinite(value);
  };
  return validUrls(media.variants);
}

/**
 * Public Completeness Contract
 *
 * Final predicate for public resolution, Workbench eligibility and assignment.
 * Static assets must match the committed manifest verified by release image QA.
 * R2 assets require the full materialization shape, authenticated existence and
 * anonymous image access for every variant, including responsive renditions.
 * Byte-level content integrity is established at ingestion and can be audited
 * separately; a HEAD request cannot establish a SHA-256 byte match.
 */
export async function isPubliclyComplete(media: Media): Promise<boolean> {
  if (!hasPublicMediaStructure(media)) return false;

  // The committed static pipeline has its own release-time image proof. It
  // does not emit the Drive materializer's blur/responsive record shape.
  if (media.storage === 'static') return true;

  // Check shape
  if (!hasMaterializationShape(media)) {
    return false;
  }

  // Check rendition-level physical completeness
  // This upgrades the contract from "primary hash exists" to "every required rendition exists"
  // P0 FIX: For R2, verify keys exist without downloading bytes
  if (media.storage === 'r2') {
    try {
      const { verifyR2RenditionCompleteness } = await import('@/lib/r2-storage');
      const renditionCheck = await verifyR2RenditionCompleteness(media);
      if (!renditionCheck.complete) {
        console.log('[PUBLIC_COMPLETE] R2_RENDITION_INCOMPLETE', {
          mediaId: media.id,
          details: renditionCheck.details,
        });
        return false;
      }
    } catch (error) {
      // Fail closed if rendition verification fails
      console.error('[PUBLIC_COMPLETE] R2_RENDITION_VERIFICATION_ERROR', {
        mediaId: media.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  return true;
}

/**
 * Materialization Completeness (Drive Ingest Context)
 *
 * Used by /api/drive/ingest to determine if an existing asset needs re-materialization.
 * This checks shape but not storage proof (upload happens during ingest).
 *
 * An asset needs materialization if it lacks the correct shape or has synthetic hash.
 */
export function needsMaterialization(media: Media): boolean {
  return !hasMaterializationShape(media) || !hasRealContentHash(media);
}

/**
 * Materialization Completeness (Shape Context)
 *
 * Checks if a media asset has correct materialization shape and real content hash.
 * This is the same as !needsMaterialization() but expressed positively.
 *
 * For public presentation with storage and URL proof, use isPubliclyComplete().
 */
export function isMaterializationComplete(media: Media): boolean {
  return hasMaterializationShape(media) && hasRealContentHash(media);
}
