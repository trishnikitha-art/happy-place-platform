/**
 * Media Processing Contracts
 *
 * This module defines the authoritative contracts for media processing
 * that must be used consistently across all materialization and validation paths.
 *
 * SEPARATION OF CONCERNS:
 * - Materialization shape: Does the media have the correct structure?
 * - Physical proof: Do the actual bytes exist and match the hash?
 * - Public completeness: Both shape + proof for public presentation
 */

import type { Media } from '@/types/media';
import { RESPONSIVE_WIDTHS } from './media-constants';

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
 * Verifies that the contentHash is derived from actual bytes, not synthetic.
 * Synthetic hash = SHA256(canonicalId)
 * Real hash = SHA256(actual source bytes)
 */
export function hasRealContentHash(media: Media): boolean {
  if (!media.contentHash) {
    return false;
  }

  const crypto = require('crypto');
  const syntheticHash = crypto.createHash('sha256').update(media.id).digest('hex');
  return media.contentHash !== syntheticHash;
}

/**
 * Public Completeness Contract
 *
 * A media asset is publicly complete ONLY when it has:
 * 1. Correct materialization shape (structure is valid)
 * 2. Real content hash (not synthetic)
 * 3. Physical Blob proof (bytes exist and match hash)
 *
 * This is the NON-NEGOTIABLE contract for public presentation.
 * Any asset failing this check must not be rendered publicly.
 */
export async function isPubliclyComplete(media: Media): Promise<boolean> {
  // Check shape
  if (!hasMaterializationShape(media)) {
    return false;
  }

  // Check content hash is real
  if (!hasRealContentHash(media)) {
    return false;
  }

  // Check physical Blob proof
  if (media.contentHash) {
    try {
      const { getBlobMetadataByContentHash } = await import('@/lib/blob-storage');
      const blobMetadata = await getBlobMetadataByContentHash(media.contentHash);
      if (!blobMetadata) {
        return false;
      }
    } catch (error) {
      // Fail closed if Blob verification fails
      return false;
    }
  }

  return true;
}

/**
 * Materialization Completeness (Drive Ingest Context)
 *
 * Used by /api/drive/ingest to determine if an existing asset needs re-materialization.
 * This checks shape but not Blob proof (since Blob upload happens during ingest).
 *
 * An asset needs materialization if it lacks the correct shape or has synthetic hash.
 */
export function needsMaterialization(media: Media): boolean {
  return !hasMaterializationShape(media) || !hasRealContentHash(media);
}
