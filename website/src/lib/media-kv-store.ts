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
import { verifyBlobHash, type BlobHashVerificationResult } from '@/lib/blob-storage';
import { getEnvironment, getKvNamespace } from '@/lib/environment';

/**
 * Apply namespace prefix to KV key
 * Prevents cross-environment key collisions
 */
function namespacedKey(key: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${key}`;
}

/**
 * Detect if we're in static build mode
 * During static build, we can tolerate KV unavailability
 * During runtime, KV is a required dependency
 */
function isStaticBuild(): boolean {
  // Check if we're in Next.js build phase
  // During build, NODE_ENV is 'production' but we're not actually running
  const isBuilding = process.env.NEXT_PHASE === 'build';
  return isBuilding;
}

class KvUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KvUnavailableError';
  }
}

/**
 * KV Client Factory
 * 
 * Creates environment-bound Redis clients to prevent mutable process-global state.
 * Each client is bound to the current environment namespace at creation time.
 * This prevents identity leaks when environments change or credentials rotate.
 */
function createRedisClient(): Redis {
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
  
  // During static build, KV may not be available - throw explicit error
  // Runtime pages will handle this as a dependency failure
  if (!url || !token) {
    if (isStaticBuild()) {
      throw new KvUnavailableError('KV credentials not available during static build');
    }
    throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
  }
  
  // Create fresh client bound to current environment
  const env = getEnvironment();
  const client = new Redis({ url, token });
  
  console.log('[MEDIA_KV] Created environment-bound client', {
    environment: env,
    namespace: getKvNamespace(),
  });
  
  return client;
}

// KV key prefixes (P1-9: Environment isolation applied)
const MEDIA_PREFIX = 'media:';
const CONTENT_HASH_PREFIX = 'content_hash:';
const BLOB_METADATA_PREFIX = 'blob_metadata:';
const STALE_INDEX_PREFIX = 'stale_index:';
const MEDIA_QUARANTINE_PREFIX = 'media_quarantine:';

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
 * Verify media state for internal materialization operations
 * This is permissive for intermediate states during materialization
 * Used by ingestion/materialization paths, NOT the public gate
 */
async function verifyMaterializationState(media: Media): Promise<boolean> {
  // DriveReference records are valid source references
  if (media.lifecycleState === 'source_reference') {
    return true;
  }
  
  // MaterializingMedia is valid during materialization phase
  if (media.lifecycleState === 'materializing') {
    return true;
  }
  
  // PublishedMediaAsset must have content hash
  if (media.lifecycleState === 'published' && media.source === 'local') {
    if (!media.contentHash) {
      console.error('[MEDIA_KV] REJECTED: Published local media missing content hash', {
        mediaId: media.id,
        reason: 'PublishedMediaAsset must have content hash'
      });
      return false;
    }
    
    // CRITICAL: Use storage field to distinguish static vs Blob
    // Static storage: served from /public/images/, no Blob metadata required
    // Blob storage: materialized from Drive, requires Blob metadata
    if (media.storage === 'blob') {
      const client = createRedisClient();
      const blobMetadata = await client.get(namespacedKey(`${BLOB_METADATA_PREFIX}${media.contentHash}`));
      
      if (!blobMetadata) {
        console.error('[MEDIA_KV] REJECTED: Blob storage media missing Blob metadata', {
          mediaId: media.id,
          contentHash: media.contentHash,
          storage: media.storage,
          reason: 'Blob-storage assets must have Blob metadata with physical Blob proof'
        });
        return false;
      }
    } else if (media.storage === 'static') {
      // Static storage: no Blob metadata required
      // Just verify the storage field is properly set
      console.log('[MEDIA_KV] STATIC_STORAGE_ACCEPTED', {
        mediaId: media.id,
        storage: media.storage,
        reason: 'Static storage assets do not require Blob metadata'
      });
    } else {
      // Missing or invalid storage field
      console.error('[MEDIA_KV] REJECTED: Missing or invalid storage field', {
        mediaId: media.id,
        storage: media.storage,
        reason: 'Published local media must have storage field (static or blob)'
      });
      return false;
    }
    
    return true;
  }
  
  // Stale records are invalid
  if (media.lifecycleState === 'stale') {
    console.error('[MEDIA_KV] REJECTED: Stale lifecycle state', {
      mediaId: media.id,
      lifecycleState: media.lifecycleState,
      reason: 'Stale records are invalid'
    });
    return false;
  }
  
  // Unknown state/source combinations are invalid
  console.error('[MEDIA_KV] REJECTED: Unknown lifecycle/source combination', {
    mediaId: media.id,
    lifecycleState: media.lifecycleState,
    source: media.source,
    reason: 'Unrecognized state/source combination'
  });
  return false;
}

/**
 * Verify public media authority for the public gate
 * This is STRICT - only fully verified PublishedMediaAsset is publicly assignable
 * source_reference and materializing are NOT publicly assignable
 * Exported for use by reconciliation API and other authority checks
 */
export async function verifyPublicMediaAuthority(media: Media): Promise<boolean> {
  // ONLY published + local is publicly assignable
  if (media.lifecycleState !== 'published' || media.source !== 'local') {
    console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Not published local media', {
      mediaId: media.id,
      lifecycleState: media.lifecycleState,
      source: media.source,
      reason: 'Only published + local media is publicly assignable'
    });
    return false;
  }
  
  // Reject synthetic content identity
  if (media.contentHash && isSyntheticContentHash(media.id, media.contentHash)) {
    console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Synthetic content identity', {
      mediaId: media.id,
      contentHash: media.contentHash,
      reason: 'Content hash is SHA256(canonicalId), not actual bytes'
    });
    return false;
  }
  
  // Require contentHash for published records
  if (!media.contentHash) {
    console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Missing content hash', {
      mediaId: media.id,
      reason: 'PublishedMediaAsset must have content hash for public gate'
    });
    return false;
  }
  
  // CRITICAL: Use storage field to distinguish static vs Blob
  // Static storage: served from /public/images/, no Blob metadata required
  // Blob storage: materialized from Drive, requires Blob metadata
  if (media.storage === 'blob') {
    const client = createRedisClient();
    const blobMetadata = await client.get(namespacedKey(`${BLOB_METADATA_PREFIX}${media.contentHash}`));
    
    if (!blobMetadata) {
      console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Missing Blob metadata', {
        mediaId: media.id,
        contentHash: media.contentHash,
        storage: media.storage,
        reason: 'Blob-storage assets must have Blob metadata with physical Blob proof'
      });
      return false;
    }
    
    // Real physical verification: fetch Blob bytes and verify hash
    const blobUrl = media.variants.original;
    const verificationResult = await verifyBlobHash(blobUrl, media.contentHash);
    
    if (!verificationResult.success) {
      console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Blob hash verification failed', {
        mediaId: media.id,
        contentHash: media.contentHash,
        blobUrl,
        errorType: verificationResult.errorType,
        actualHash: verificationResult.actualHash,
        reason: verificationResult.errorType === 'INTEGRITY_FAILURE' 
          ? 'Physical Blob bytes do not match content hash'
          : `Blob verification failed: ${verificationResult.errorType}`
      });
      return false;
    }
  } else if (media.storage === 'static') {
    // Static storage: served from /public/images/, no Blob verification required
    // Verify that static files have proper local paths instead of Blob URLs
    if (!media.variants || !media.variants.original) {
      console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Static media missing original variant', {
        mediaId: media.id,
        storage: media.storage,
        reason: 'Static storage assets must have original variant path'
      });
      return false;
    }
    
    // Verify static path is properly formatted (starts with /images/)
    if (!media.variants.original.startsWith('/images/')) {
      console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Invalid static path format', {
        mediaId: media.id,
        storage: media.storage,
        path: media.variants.original,
        reason: 'Static storage assets must have paths starting with /images/'
      });
      return false;
    }
  } else {
    // Missing or invalid storage field
    console.error('[MEDIA_KV] PUBLIC_GATE_REJECTED: Missing or invalid storage field', {
      mediaId: media.id,
      storage: media.storage,
      reason: 'Published local media must have storage field (static or blob)'
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
    const client = createRedisClient();
    if (!client) {
      console.warn('[MEDIA_KV] KV unavailable for getMedia', { id });
      return null;
    }
    
    const data = await client.get(namespacedKey(`media:${id}`));
    
    if (!data) {
      return null;
    }
    
    // Handle both JSON strings and already-deserialized objects
    const media = typeof data === 'string' ? JSON.parse(data) : data;
    
    // Verify public media authority before returning (strict public gate)
    if (media.lifecycleState === 'published' && media.source === 'local') {
      const hasPublicAuthority = await verifyPublicMediaAuthority(media);
      if (!hasPublicAuthority) {
        console.warn('[MEDIA_KV] Media failed public media authority check', { id });
        return null;
      }
    }
    
    // Stale records are never returned
    if (media.lifecycleState === 'stale') {
      console.warn('[MEDIA_KV] Rejecting stale media record', { id });
      return null;
    }
    
    return media;
  } catch (error) {
    console.error('[MEDIA_KV] Failed to get media:', error);
    throw new Error(`Failed to get media ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get media record by ID from KV WITHOUT constitutional proof verification
 * This is used for reconciliation/repair operations to inspect authoritative records
 * even when the public proof gate would reject them (e.g., poisoned records, missing Blob metadata)
 * 
 * CRITICAL: This function bypasses the constitutional proof gate.
 * It should ONLY be used for repair/reconciliation operations, never for public presentation.
 * 
 * @param id - Media ID to retrieve
 * @returns Media record or null if not found
 */
export async function getMediaRecordRaw(id: string): Promise<Media | null> {
  try {
    const client = createRedisClient();
    if (!client) {
      console.warn('[MEDIA_KV] KV unavailable for getMediaRecordRaw', { id });
      return null;
    }
    
    const data = await client.get(namespacedKey(`media:${id}`));
    
    if (!data) {
      return null;
    }
    
    // Handle both JSON strings and already-deserialized objects
    const media = typeof data === 'string' ? JSON.parse(data) : data;
    
    // NO constitutional proof verification - return raw authoritative record
    // This allows reconciliation to inspect DriveReference records and poisoned PublishedMediaAsset records
    console.log('[MEDIA_KV] RAW_MEDIA_RECORD_RETRIEVED', { 
      id, 
      lifecycleState: media.lifecycleState, 
      source: media.source,
      hasDrive: !!media.drive 
    });
    
    return media;
  } catch (error) {
    console.error('[MEDIA_KV] Failed to get raw media record:', error);
    throw new Error(`Failed to get raw media record ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * List all media IDs in KV
 */
export async function listMediaIds(): Promise<string[]> {
  try {
    const client = createRedisClient();
    if (!client) {
      console.warn('[MEDIA_KV] KV unavailable for listMediaIds');
      return [];
    }
    
    const keys: string[] = [];
    let cursor = '0';
    
    do {
      const result = await client.scan(cursor, { match: namespacedKey(`${MEDIA_PREFIX}*`), count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');
    
    const namespace = getKvNamespace();
    return keys.map(key => key.replace(namespace + MEDIA_PREFIX, ''));
  } catch (error) {
    console.error('[MEDIA_KV] Failed to list media IDs:', error);
    throw new Error(`Failed to list media IDs: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Save media to KV
 * Stores media record and maintains content hash index for O(1) deduplication
 * Uses atomic Lua script to ensure media record and index remain consistent
 */
export async function saveMedia(media: Media): Promise<void> {
  try {
    // Verify materialization state before saving (internal operations only)
    // This is permissive for intermediate states during materialization
    if (media.lifecycleState === 'published' && media.source === 'local') {
      const hasValidState = await verifyMaterializationState(media);
      if (!hasValidState) {
        throw new Error(`Cannot save media ${media.id}: Failed materialization state check`);
      }
    }
    
    const client = createRedisClient();
    
    // Use atomic Lua script to maintain media record + index consistency
    const saveScript = `
      local mediaKey = KEYS[1]
      local contentHashKey = KEYS[2]
      local mediaId = ARGV[1]
      local contentHash = ARGV[2]
      local mediaJson = ARGV[3]
      
      -- Set media record
      redis.call('SET', mediaKey, mediaJson)
      
      -- Update content hash index if content hash present
      if contentHash and contentHash ~= '' then
        redis.call('SET', contentHashKey, mediaId)
      end
      
      return 'OK'
    `;
    
    await client.eval(
      saveScript,
      [namespacedKey(`${MEDIA_PREFIX}${media.id}`), namespacedKey(`${CONTENT_HASH_PREFIX}${media.contentHash || ''}`)],
      [media.id, media.contentHash || '', JSON.stringify(media)]
    );
  } catch (error) {
    console.error('[MEDIA_KV] Failed to save media:', error);
    throw new Error(`Failed to save media ${media.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete media from KV
 * Also removes content hash index entry
 * Uses atomic Lua script to ensure media record and index are deleted together
 */
export async function deleteMedia(id: string): Promise<void> {
  try {
    const client = createRedisClient();
    
    // Use atomic Lua script to delete media record and index together
    const deleteScript = `
      local mediaKey = KEYS[1]
      local contentHashPrefix = KEYS[2]
      
      -- Get current media record to extract content hash
      local mediaJson = redis.call('GET', mediaKey)
      local contentHash = nil
      
      if mediaJson then
        local parsed = cjson.decode(mediaJson)
        if parsed.contentHash then
          contentHash = parsed.contentHash
        end
      end
      
      -- Delete media record
      redis.call('DEL', mediaKey)
      
      -- Delete content hash index if content hash was present
      if contentHash and contentHash ~= '' then
        local actualContentHashKey = contentHashPrefix .. contentHash
        redis.call('DEL', actualContentHashKey)
      end
      
      return 'OK'
    `;
    
    await client.eval(
      deleteScript,
      [namespacedKey(`${MEDIA_PREFIX}${id}`), namespacedKey(CONTENT_HASH_PREFIX)],
      []
    );
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
 * Alias for saveMedia for bootstrap operations
 */
export const setMedia = saveMedia;

/**
 * Get Blob metadata by content hash
 * This is the authoritative accessor for Blob metadata
 * Uses environment namespace abstraction
 */
export async function getBlobMetadata(contentHash: string): Promise<Record<string, unknown> | null> {
  try {
    const client = createRedisClient();
    if (!client) {
      console.warn('[MEDIA_KV] KV unavailable for getBlobMetadata', { contentHash });
      return null;
    }
    const data = await client.get(namespacedKey(`${BLOB_METADATA_PREFIX}${contentHash}`));
    if (!data) return null;
    
    // Handle both JSON strings and already-deserialized objects
    if (typeof data === 'string') {
      return JSON.parse(data) as Record<string, unknown>;
    } else if (typeof data === 'object' && data !== null) {
      return data as Record<string, unknown>;
    } else {
      return null;
    }
  } catch (error) {
    console.error('[MEDIA_KV] Error getting blob metadata', { contentHash, error });
    return null;
  }
}

/**
 * Find media by content hash using O(1) index lookup
 * Returns null if not found or if index points to non-existent media (stale index)
 */
export async function findMediaByContentHash(contentHash: string): Promise<Media | null> {
  try {
    const client = createRedisClient();
    if (!client) {
      console.warn('[MEDIA_KV] KV unavailable for findMediaByContentHash', { contentHash });
      return null;
    }
    
    // O(1) lookup via content hash index
    const mediaId = await client.get(namespacedKey(`${CONTENT_HASH_PREFIX}${contentHash}`));
    
    if (!mediaId) {
      return null;
    }
    
    // P0 FIX: Use getMediaRecordRaw for deduplication inspection
    // This allows the deduplication path to see poisoned records that the constitutional proof gate would reject
    // The ingestion path needs to distinguish between DriveReference (upgrade) vs PublishedMediaAsset (deduplicate)
    const media = await getMediaRecordRaw(mediaId as string);
    
    // Fail closed if index points to non-existent media (stale index)
    if (!media) {
      console.error('[MEDIA_KV] STALE_INDEX_ENTRY: content_hash index points to non-existent media', {
        contentHash,
        mediaId,
        reason: 'Index is stale - media record was deleted but index was not cleaned up'
      });
      // Clean up stale index entry
      await client.del(namespacedKey(`${CONTENT_HASH_PREFIX}${contentHash}`));
      return null;
    }
    
    // Verify the content hash actually matches (defensive check)
    if (media.contentHash !== contentHash) {
      console.error('[MEDIA_KV] INDEX_MISMATCH: content_hash index points to media with different hash', {
        contentHash,
        mediaId,
        actualMediaHash: media.contentHash,
        reason: 'Index corruption - cleanup required'
      });
      // Clean up corrupted index entry
      await client.del(namespacedKey(`${CONTENT_HASH_PREFIX}${contentHash}`));
      return null;
    }
    
    console.log('[MEDIA_KV] DEDUPLICATION_LOOKUP_COMPLETED', {
      contentHash,
      mediaId,
      lifecycleState: media.lifecycleState,
      source: media.source,
      hasDrive: !!media.drive,
      isDriveReference: media.lifecycleState === 'source_reference'
    });
    
    return media;
  } catch (error) {
    console.error('[MEDIA_KV] Failed to find media by content hash:', error);
    throw new Error(`Failed to find media by content hash: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
