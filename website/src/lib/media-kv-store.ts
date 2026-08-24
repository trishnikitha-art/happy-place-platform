/**
 * KV Media Store
 * 
 * Manages PublishedMediaAsset records in Upstash Redis KV.
 * Rejects synthetic content identity (SHA256(canonicalId) rather than actual bytes).
 * Requires physical Blob verification for constitutional proof.
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import type { Media } from '@/types/media';
import { verifyBlobHash } from '@/lib/blob-storage';

let redis: Redis | null = null;

// KV key prefixes
const MEDIA_PREFIX = 'media:';
const CONTENT_HASH_PREFIX = 'content_hash:';

function getRedisClient(): Redis {
  if (!redis) {
    let url = process.env.KV_REST_API_URL;
    let token = process.env.KV_REST_API_TOKEN;
    
    // Check integration-generated variables
    const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
    const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;
    const readOnlyToken = process.env.KV_REST_API__KV_REST_API_READ_ONLY_TOKEN;
    
    // Use integration credentials if primary not set
    if (!url && integrationUrl) {
      url = integrationUrl;
    }
    if (!token && integrationToken) {
      token = integrationToken;
    }
    
    if (!url || !token) {
      throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

/**
 * Compute synthetic content hash (SHA256 of canonical ID)
 * This is used to detect and reject synthetic content identity
 */
function computeSyntheticHash(canonicalId: string): string {
  return crypto.createHash('sha256').update(canonicalId).digest('hex');
}

/**
 * Check if a content hash is synthetic (derived from canonical ID rather than actual bytes)
 */
function isSyntheticContentHash(canonicalId: string, actualContentHash: string): boolean {
  const syntheticHash = computeSyntheticHash(canonicalId);
  return actualContentHash === syntheticHash;
}

/**
 * Verify that a PublishedMediaAsset has constitutional proof:
 * - Real physical Blob object exists with matching bytes
 * - Content hash is from actual bytes, not synthetic
 * - Blob metadata is present in Redis
 * 
 * DriveReference records (source_reference lifecycle) are exempt from this check.
 */
async function verifyConstitutionalProof(media: Media): Promise<boolean> {
  // DriveReference records are exempt from constitutional proof
  if (media.lifecycleState === 'source_reference') {
    return true;
  }
  
  // Reject synthetic content identity (only if contentHash exists)
  if (media.contentHash && isSyntheticContentHash(media.id, media.contentHash)) {
    console.error('[MEDIA_KV] REJECTED: Synthetic content identity', {
      mediaId: media.id,
      contentHash: media.contentHash,
      reason: 'Content hash is SHA256(canonicalId), not actual bytes'
    });
    return false;
  }
  
  // Verify Blob metadata exists (only if contentHash exists)
  if (media.contentHash) {
    const client = getRedisClient();
    const blobMetadata = await client.get(`blob_metadata:${media.contentHash}`);
    
    if (!blobMetadata) {
      console.error('[MEDIA_KV] REJECTED: Missing Blob metadata', {
        mediaId: media.id,
        contentHash: media.contentHash,
        reason: 'No blob_metadata record found for content hash'
      });
      return false;
    }
    
    // Verify the asset has actual variant URLs (not Drive proxy URLs)
    if (!media.variants || !media.variants.original) {
      console.error('[MEDIA_KV] REJECTED: Missing original variant', {
        mediaId: media.id,
        reason: 'PublishedMediaAsset must have original variant URL'
      });
      return false;
    }
    
    // Real physical verification: fetch Blob bytes and verify hash
    const blobUrl = media.variants.original;
    const hashMatches = await verifyBlobHash(blobUrl, media.contentHash);
    
    if (!hashMatches) {
      console.error('[MEDIA_KV] REJECTED: Blob hash verification failed', {
        mediaId: media.id,
        contentHash: media.contentHash,
        blobUrl,
        reason: 'Physical Blob bytes do not match content hash'
      });
      return false;
    }
  }
  
  return true;
}

/**
 * Get media by ID from KV
 * Returns null if not found or if constitutional proof fails
 * DriveReference records are exempt from constitutional proof
 */
export async function getMedia(id: string): Promise<Media | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(`media:${id}`);
    
    if (!data) {
      return null;
    }
    
    // Handle both JSON strings and already-deserialized objects
    const media = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Verify constitutional proof before returning (only for PublishedMediaAsset)
    if (media.lifecycleState === 'published' && media.source === 'local') {
      const hasConstitutionalProof = await verifyConstitutionalProof(media);
      if (!hasConstitutionalProof) {
        console.warn('[MEDIA_KV] Media failed constitutional proof check', { id });
        return null;
      }
    }
    
    return media;
  } catch (error) {
    console.error('[MEDIA_KV] Failed to get media:', error);
    throw new Error(`Failed to get media ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all media IDs in KV
 */
export async function listMediaIds(): Promise<string[]> {
  try {
    const client = getRedisClient();
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await client.scan(cursor, { match: `${MEDIA_PREFIX}*`, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    return keys.map(key => key.replace(MEDIA_PREFIX, ''));
  } catch (error) {
    console.error('[MEDIA_KV] Failed to list media IDs:', error);
    throw new Error(`Failed to list media IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save media to KV
 * Stores media record and maintains content hash index for O(1) deduplication
 */
export async function saveMedia(media: Media): Promise<void> {
  try {
    // Verify constitutional proof before saving (only for PublishedMediaAsset)
    if (media.lifecycleState === 'published' && media.source === 'local') {
      const hasConstitutionalProof = await verifyConstitutionalProof(media);
      if (!hasConstitutionalProof) {
        throw new Error(`Cannot save media ${media.id}: Failed constitutional proof check`);
      }
    }
    
    const client = getRedisClient();
    
    // Store media record
    await client.set(`${MEDIA_PREFIX}${media.id}`, JSON.stringify(media));
    
    // Index by content hash for O(1) deduplication
    if (media.contentHash) {
      await client.set(`${CONTENT_HASH_PREFIX}${media.contentHash}`, media.id);
    }
  } catch (error) {
    console.error('[MEDIA_KV] Failed to save media:', error);
    throw new Error(`Failed to save media ${media.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete media from KV
 * Also removes content hash index entry
 */
export async function deleteMedia(id: string): Promise<void> {
  try {
    const client = getRedisClient();
    
    // Get media record to retrieve content hash for index cleanup
    const media = await getMedia(id);
    
    // Delete media record
    await client.del(`${MEDIA_PREFIX}${id}`);
    
    // Delete content hash index entry
    if (media && media.contentHash) {
      await client.del(`${CONTENT_HASH_PREFIX}${media.contentHash}`);
    }
  } catch (error) {
    console.error('[MEDIA_KV] Failed to delete media:', error);
    throw new Error(`Failed to delete media ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Alias for saveMedia for backward compatibility
 */
export const storeMedia = saveMedia;

/**
 * Find media by content hash using O(1) index lookup
 * Returns null if not found
 */
export async function findMediaByContentHash(contentHash: string): Promise<Media | null> {
  try {
    const client = getRedisClient();
    
    // O(1) lookup via content hash index
    const mediaId = await client.get(`${CONTENT_HASH_PREFIX}${contentHash}`);
    
    if (!mediaId) {
      return null;
    }
    
    // Retrieve the media record
    return await getMedia(mediaId as string);
  } catch (error) {
    console.error('[MEDIA_KV] Failed to find media by content hash:', error);
    throw new Error(`Failed to find media by content hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
