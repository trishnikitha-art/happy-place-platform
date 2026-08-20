/**
 * Media Metadata KV Store
 *
 * Provides persistent storage for Media records using Upstash Redis.
 * Stores and retrieves Media objects by ID.
 * 
 * Contract corrections:
 * - Fail-closed in production (no silent in-memory fallback)
 * - Schema validation on Media objects
 * - Eliminate silent empty array returns
 */

import { Redis } from '@upstash/redis';
import type { Media } from '@/types/media';

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    
    if (!url || !token) {
      throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
}

const MEDIA_PREFIX = 'media:';
const CONTENT_HASH_PREFIX = 'content_hash:';

/**
 * Validate Media object schema at runtime
 * @param data - Data to validate
 * @returns True if valid, false otherwise
 */
function validateMedia(data: unknown): data is Media {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const candidate = data as Record<string, unknown>;
  
  // Core Media fields validation
  if (typeof candidate.id !== 'string' || candidate.id.trim().length === 0) {
    return false;
  }
  
  if (typeof candidate.contentHash !== 'string' || candidate.contentHash.trim().length === 0) {
    return false;
  }
  
  if (typeof candidate.source !== 'string') {
    return false;
  }
  
  if (typeof candidate.type !== 'string') {
    return false;
  }
  
  // Validate dimensions
  if (candidate.dimensions && typeof candidate.dimensions === 'object') {
    const dims = candidate.dimensions as Record<string, unknown>;
    if (typeof dims.width !== 'number' || dims.width <= 0) {
      return false;
    }
    if (typeof dims.height !== 'number' || dims.height <= 0) {
      return false;
    }
  }
  
  // Validate variants
  if (candidate.variants && typeof candidate.variants === 'object') {
    const variants = candidate.variants as Record<string, unknown>;
    if (typeof variants.original !== 'string' || variants.original.trim().length === 0) {
      return false;
    }
  }
  
  return true;
}

/**
 * Store a Media record in KV with schema validation
 * @param media - Media object to store
 */
export async function storeMedia(media: Media): Promise<void> {
  // Extract ID before validation for error messages
  const mediaId = (media as unknown as Record<string, unknown>)?.id as string || 'unknown';
  
  // Validate Media schema before storage
  if (!validateMedia(media)) {
    console.error('[MEDIA_KV] Schema validation failed for media:', mediaId);
    throw new Error(`Invalid Media schema for ${mediaId}`);
  }
  
  try {
    const client = getRedisClient();
    // Use typed object API - @upstash/redis handles serialization
    await client.set<Media>(`${MEDIA_PREFIX}${media.id}`, media);

    // Index by content hash for deduplication
    if (media.contentHash) {
      await client.set(`${CONTENT_HASH_PREFIX}${media.contentHash}`, media.id);
    }
  } catch (error) {
    console.error('[MEDIA_KV] Store failed:', error);
    throw new Error(`Failed to store media ${media.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve a Media record by ID with schema validation
 * @param id - Media ID
 * @returns Media object or null
 */
export async function getMedia(id: string): Promise<Media | null> {
  try {
    const client = getRedisClient();
    const media = await client.get<Media>(`${MEDIA_PREFIX}${id}`);
    if (!media) return null;

    // Validate Media schema
    if (!validateMedia(media)) {
      console.error('[MEDIA_KV] Schema validation failed for media:', id);
      // Quarantine corrupted data
      const quarantineKey = `${MEDIA_PREFIX}quarantine:${id}:${Date.now()}`;
      await client.set(quarantineKey, media);
      console.log('[MEDIA_KV] Corrupted media quarantined:', quarantineKey);
      return null;
    }

    return media;
  } catch (error) {
    console.error('[MEDIA_KV] Get failed:', error);
    throw new Error(`Failed to retrieve media ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find Media ID by content hash (for deduplication)
 * @param contentHash - SHA-256 content hash
 * @returns Media ID or null
 */
export async function findMediaByContentHash(contentHash: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    const value = await client.get(`${CONTENT_HASH_PREFIX}${contentHash}`);
    return value as string | null;
  } catch (error) {
    console.error('[MEDIA_KV] Content hash lookup failed:', error);
    throw new Error(`Failed to find media by content hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all Media IDs
 * @returns Array of Media IDs
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
    
    // Filter out quarantine keys
    return keys.filter(key => !key.includes(':quarantine:')).map(key => key.replace(MEDIA_PREFIX, ''));
  } catch (error) {
    console.error('[MEDIA_KV] List failed:', error);
    throw new Error(`Failed to list media IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a Media record
 * @param id - Media ID
 */
export async function deleteMedia(id: string): Promise<void> {
  try {
    const client = getRedisClient();
    const media = await getMedia(id);
    if (media && media.contentHash) {
      await client.del(`${CONTENT_HASH_PREFIX}${media.contentHash}`);
    }
    await client.del(`${MEDIA_PREFIX}${id}`);
  } catch (error) {
    console.error('[MEDIA_KV] Delete failed:', error);
    throw new Error(`Failed to delete media ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
