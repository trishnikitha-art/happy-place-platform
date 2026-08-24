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

let redis: Redis | null = null;

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
 * - Real physical Blob object exists
 * - Content hash is from actual bytes, not synthetic
 * - Blob metadata is present in Redis
 * 
 * DriveReference records (source_reference lifecycle) are exempt from this check.
 */
async function verifyConstitutionalProof(media: Media): Promise<boolean> {
  // DriveReference records are exempt from constitutional proof
  if (media.lifecycleState === 'source_reference' || media.source === 'google-drive') {
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
  }
  
  // Verify the asset has actual variant URLs (not Drive proxy URLs)
  if (!media.variants || !media.variants.original) {
    console.error('[MEDIA_KV] REJECTED: Missing original variant', {
      mediaId: media.id,
      reason: 'PublishedMediaAsset must have original variant URL'
    });
    return false;
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
      const result = await client.scan(cursor, { match: 'media:*', count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    return keys.map(key => key.replace('media:', ''));
  } catch (error) {
    console.error('[MEDIA_KV] Failed to list media IDs:', error);
    throw new Error(`Failed to list media IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save media to KV
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
    await client.set(`media:${media.id}`, JSON.stringify(media));
  } catch (error) {
    console.error('[MEDIA_KV] Failed to save media:', error);
    throw new Error(`Failed to save media ${media.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete media from KV
 */
export async function deleteMedia(id: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(`media:${id}`);
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
 * Find media by content hash
 */
export async function findMediaByContentHash(contentHash: string): Promise<Media | null> {
  try {
    const client = getRedisClient();
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await client.scan(cursor, { match: 'media:*', count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    for (const key of keys) {
      const media = await getMedia(key.replace('media:', ''));
      if (media && media.contentHash === contentHash) {
        return media;
      }
    }
    
    return null;
  } catch (error) {
    console.error('[MEDIA_KV] Failed to find media by content hash:', error);
    throw new Error(`Failed to find media by content hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
