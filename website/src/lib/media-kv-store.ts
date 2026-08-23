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

const MEDIA_PREFIX = 'media:';
const CONTENT_HASH_PREFIX = 'content_hash:';
const MEDIA_QUARANTINE_PREFIX = 'media_quarantine:';

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
  
  // source_reference state requires sourceIdentityHash, not contentHash
  const isSourceReference = candidate.lifecycleState === 'source_reference';
  
  if (isSourceReference) {
    // Source references require sourceIdentityHash
    if (typeof candidate.sourceIdentityHash !== 'string' || candidate.sourceIdentityHash.trim().length === 0) {
      return false;
    }
    // contentHash can be undefined for source references
  } else {
    // Fully materialized media requires contentHash
    if (typeof candidate.contentHash !== 'string' || candidate.contentHash.trim().length === 0) {
      return false;
    }
  }
  
  if (typeof candidate.source !== 'string') {
    return false;
  }
  
  if (typeof candidate.type !== 'string') {
    return false;
  }
  
  // Source references can have placeholder dimensions and proxy URLs
  if (isSourceReference) {
    return true;
  }
  
  // Full Media objects require proper dimensions
  if (!candidate.dimensions || typeof candidate.dimensions !== 'object') {
    return false;
  }
  const dims = candidate.dimensions as Record<string, unknown>;
  if (typeof dims.width !== 'number' || dims.width <= 0) {
    return false;
  }
  if (typeof dims.height !== 'number' || dims.height <= 0) {
    return false;
  }
  
  // Validate variants for fully materialized media
  if (!candidate.variants || typeof candidate.variants !== 'object') {
    return false;
  }
  const variants = candidate.variants as Record<string, unknown>;
  if (typeof variants.original !== 'string' || variants.original.trim().length === 0) {
    return false;
  }
  
  // Published media must NOT have Drive URLs
  if (candidate.lifecycleState === 'published') {
    // Published media must be local source
    if (candidate.source !== 'local') {
      return false;
    }
    
    // Published media must not have drive field
    if (candidate.drive) {
      return false;
    }
    
    // Published media must not have Drive URLs in variants
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
    
    if (checkForDriveUrl(variants)) {
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
    // Explicitly serialize to JSON to ensure consistent storage format
    // This prevents "Unexpected value type: object" errors from Redis client
    const serialized = JSON.stringify(media);
    await client.set(`${MEDIA_PREFIX}${media.id}`, serialized);

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
    const data = await client.get<string>(`${MEDIA_PREFIX}${id}`);
    if (!data) return null;

    // Explicitly deserialize from JSON to match storeMedia serialization
    let media: Media;
    try {
      media = JSON.parse(data) as Media;
    } catch (parseError) {
      console.error('[MEDIA_KV] JSON parse failed for media:', id);
      // Quarantine corrupted data using consistent namespace
      const quarantineKey = `${MEDIA_QUARANTINE_PREFIX}${id}:${Date.now()}`;
      await client.set(quarantineKey, data);
      console.log('[MEDIA_KV] Corrupted media quarantined:', quarantineKey);
      return null;
    }

    // Validate Media schema
    if (!validateMedia(media)) {
      console.error('[MEDIA_KV] Schema validation failed for media:', id);
      // Quarantine corrupted data using consistent namespace
      const quarantineKey = `${MEDIA_QUARANTINE_PREFIX}${id}:${Date.now()}`;
      await client.set(quarantineKey, data);
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
    return keys.filter(key => !key.includes(MEDIA_QUARANTINE_PREFIX)).map(key => key.replace(MEDIA_PREFIX, ''));
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

/**
 * Migrate historical Drive reference records to new lifecycle state
 * Moves old 'referenced' status records to 'source_reference' lifecycle state
 * Quarantines records that fail validation
 * 
 * NOTE: Bypasses getMedia() validation to allow inspection of legacy records
 * that might not pass current schema validation before migration
 */
export async function migrateDriveReferences(): Promise<{
  migrated: number;
  quarantined: number;
  errors: number;
}> {
  try {
    const client = getRedisClient();
    const allIds = await listMediaIds();
    
    let migrated = 0;
    let quarantined = 0;
    let errors = 0;
    
    for (const id of allIds) {
      try {
        // Bypass getMedia() validation to access raw legacy records
        const data = await client.get<string>(`${MEDIA_PREFIX}${id}`);
        if (!data) continue;
        
        // Explicitly deserialize from JSON
        const media = JSON.parse(data) as Media;
        
        // Check if this is an old Drive reference using legacy status field
        const isLegacyDriveRef = media.provenance?.status === 'referenced' && 
                                !media.lifecycleState;
        
        if (isLegacyDriveRef) {
          // Migrate to new lifecycle state
          const updated: Media = {
            ...media,
            lifecycleState: 'source_reference',
            sourceIdentityHash: media.contentHash, // Move contentHash to sourceIdentityHash
            contentHash: undefined, // Clear contentHash for source references
          };
          
          // Validate the migrated record
          if (validateMedia(updated)) {
            await storeMedia(updated);
            migrated++;
            console.log('[MEDIA_KV] Migrated legacy Drive reference:', id);
          } else {
            // Quarantine if validation fails
            await quarantineMedia(id, media);
            quarantined++;
            console.warn('[MEDIA_KV] Quarantined invalid Drive reference:', id);
          }
        }
      } catch (error) {
        errors++;
        console.error('[MEDIA_KV] Migration error for:', id, error);
      }
    }
    
    console.log('[MEDIA_KV] Migration complete:', { migrated, quarantined, errors });
    return { migrated, quarantined, errors };
  } catch (error) {
    console.error('[MEDIA_KV] Migration failed:', error);
    throw new Error(`Failed to migrate Drive references: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Quarantine invalid media record
 * Moves record to quarantine namespace to prevent corruption
 */
async function quarantineMedia(id: string, media: Media): Promise<void> {
  try {
    const client = getRedisClient();
    const quarantineKey = `${MEDIA_QUARANTINE_PREFIX}${id}:${Date.now()}`;
    const serialized = JSON.stringify(media);
    await client.set(quarantineKey, serialized);
    await client.del(`${MEDIA_PREFIX}${id}`);
    console.log('[MEDIA_KV] Quarantined invalid media:', id);
  } catch (error) {
    console.error('[MEDIA_KV] Quarantine failed for:', id, error);
    throw new Error(`Failed to quarantine media: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
