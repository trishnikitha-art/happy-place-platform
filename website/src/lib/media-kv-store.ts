/**
 * Media Metadata KV Store
 *
 * Provides persistent storage for Media records using Upstash Redis.
 * Stores and retrieves Media objects by ID.
 */

import { Redis } from '@upstash/redis';
import type { Media } from '@/types/media';

const redis = new Redis({
  url: process.env.KV_REST_API_URL || '',
  token: process.env.KV_REST_API_TOKEN || '',
});

const MEDIA_PREFIX = 'media:';
const CONTENT_HASH_PREFIX = 'content_hash:';

/**
 * Store a Media record in KV
 * @param media - Media object to store
 */
export async function storeMedia(media: Media): Promise<void> {
  try {
    await redis.set(`${MEDIA_PREFIX}${media.id}`, JSON.stringify(media));

    // Index by content hash for deduplication
    if (media.contentHash) {
      await redis.set(`${CONTENT_HASH_PREFIX}${media.contentHash}`, media.id);
    }
  } catch (error) {
    // Check if this is a KV configuration error
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      console.error('[MEDIA_KV] KV not configured - media will not persist to KV:', error.message);
      // Do not throw - allow the operation to continue with in-memory fallback
      return;
    }
    console.error('[MEDIA_KV] Store failed:', error);
    throw new Error(`Failed to store media ${media.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve a Media record by ID
 * @param id - Media ID
 * @returns Media object or null
 */
export async function getMedia(id: string): Promise<Media | null> {
  try {
    const value = await redis.get(`${MEDIA_PREFIX}${id}`);
    if (!value) return null;

    // Upstash Redis returns strings; parse JSON
    if (typeof value === 'string') {
      return JSON.parse(value) as Media;
    } else {
      console.error('[MEDIA_KV] Unexpected value type:', typeof value);
      return null;
    }
  } catch (error) {
    // Check if this is a KV configuration error
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      console.error('[MEDIA_KV] KV not configured - cannot retrieve media from KV:', error.message);
      return null;
    }
    console.error('[MEDIA_KV] Get failed:', error);
    return null;
  }
}

/**
 * Find Media ID by content hash (for deduplication)
 * @param contentHash - SHA-256 content hash
 * @returns Media ID or null
 */
export async function findMediaByContentHash(contentHash: string): Promise<string | null> {
  try {
    const value = await redis.get(`${CONTENT_HASH_PREFIX}${contentHash}`);
    return value as string | null;
  } catch (error) {
    // Check if this is a KV configuration error
    if (error instanceof Error && error.message.includes('Missing required environment variables')) {
      console.error('[MEDIA_KV] KV not configured - cannot check content hash deduplication:', error.message);
      return null;
    }
    console.error('[MEDIA_KV] Content hash lookup failed:', error);
    return null;
  }
}

/**
 * List all Media IDs
 * @returns Array of Media IDs
 */
export async function listMediaIds(): Promise<string[]> {
  try {
    // KV list is not available in all environments, return empty array for now
    // In production, you would use a proper database with query capabilities
    return [];
  } catch (error) {
    console.error('[MEDIA_KV] List failed:', error);
    return [];
  }
}

/**
 * Delete a Media record
 * @param id - Media ID
 */
export async function deleteMedia(id: string): Promise<void> {
  try {
    const media = await getMedia(id);
    if (media && media.contentHash) {
      await redis.del(`${CONTENT_HASH_PREFIX}${media.contentHash}`);
    }
    await redis.del(`${MEDIA_PREFIX}${id}`);
  } catch (error) {
    console.error('[MEDIA_KV] Delete failed:', error);
    throw new Error(`Failed to delete media ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
