/**
 * Vercel Blob Storage for Media Assets
 *
 * Provides persistent storage for image assets on Vercel.
 * Stores original, WebP, AVIF, and thumbnail variants.
 * 
 * Contract corrections:
 * - Never return filename as URL
 * - Persist actual Blob URL as authoritative storage address
 * - Make object identity content-addressed
 * - Eliminate race conditions in idempotency
 */

import { put, head, del } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

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
 * Verify that a Blob's actual bytes match the expected content hash
 * This is real physical verification, not just metadata checking
 */
export async function verifyBlobHash(blobUrl: string, expectedContentHash: string): Promise<boolean> {
  try {
    // Fetch the Blob to get actual bytes
    const response = await fetch(blobUrl);
    if (!response.ok) {
      console.error('[BLOB_STORAGE] Failed to fetch Blob for hash verification', { blobUrl, status: response.status });
      return false;
    }
    
    const buffer = await response.arrayBuffer();
    const hash = crypto.createHash('sha256').update(Buffer.from(buffer)).digest('hex');
    
    const matches = hash === expectedContentHash;
    
    if (!matches) {
      console.error('[BLOB_STORAGE] Blob hash mismatch', {
        blobUrl,
        expected: expectedContentHash,
        actual: hash,
      });
    }
    
    return matches;
  } catch (error) {
    console.error('[BLOB_STORAGE] Error verifying Blob hash', { blobUrl, error });
    return false;
  }
}

export interface BlobUploadResult {
  url: string;
  uploadedAt: string;
  alreadyExisted: boolean;
  contentHash: string;
}

interface BlobMetadata {
  url: string;
  filename: string;
  contentType: string;
  uploadedAt: string;
  contentHash: string;
  byteSize: number;
}

/**
 * Upload a buffer to Vercel Blob Storage with proper idempotency contract
 * @param buffer - File content
 * @param filename - Target filename
 * @param contentType - MIME type
 * @returns URL of the uploaded blob
 */
export async function uploadToBlob(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<BlobUploadResult> {
  try {
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const byteSize = buffer.length;
    
    // Check if blob already exists with same content hash (idempotency)
    const existingMetadata = await getBlobMetadataByContentHash(contentHash);
    
    if (existingMetadata) {
      // Authority boundary: verify physical bytes before trusting existing metadata
      // Redis metadata is a locator, not cryptographic proof of identity
      const hashMatches = await verifyBlobHash(existingMetadata.url, contentHash);
      
      if (!hashMatches) {
        console.error('[BLOB_STORAGE] EXISTING_METADATA_INVALID: Physical bytes do not match recorded hash', {
          contentHash,
          blobUrl: existingMetadata.url,
          reason: 'Existing Redis metadata points to Blob with wrong physical bytes - metadata is poisoned'
        });
        // Fall through to upload new Blob - metadata will be overwritten
      } else {
        console.log('[BLOB_STORAGE] Blob already exists with verified physical bytes, reusing URL:', existingMetadata.url);
        return {
          url: existingMetadata.url, // Return actual persisted Blob URL
          uploadedAt: existingMetadata.uploadedAt,
          alreadyExisted: true,
          contentHash,
        };
      }
    }
    
    // Generate content-addressed filename to prevent Blob key collisions
    // Use first 12 chars of content hash + original filename extension
    const hashPrefix = contentHash.substring(0, 12);
    const filenameParts = filename.split('.');
    const extension = filenameParts.length > 1 ? filenameParts.pop() : 'bin';
    const baseName = filenameParts.join('.');
    const contentAddressedFilename = `${baseName}-${hashPrefix}.${extension}`;
    
    // Upload to Vercel Blob with content-addressed filename
    const blob = await put(contentAddressedFilename, buffer, {
      access: 'public',
      contentType,
    });
    
    // Store complete metadata including actual Blob URL
    const metadata: BlobMetadata = {
      url: blob.url,
      filename: contentAddressedFilename,
      contentType,
      uploadedAt: new Date().toISOString(),
      contentHash,
      byteSize,
    };
    
    const client = getRedisClient();
    await client.set(`blob_metadata:${contentHash}`, JSON.stringify(metadata));
    
    console.log('[BLOB_STORAGE] New blob uploaded and metadata stored:', {
      contentHash,
      url: blob.url,
      filename: contentAddressedFilename,
    });
    
    return {
      url: blob.url,
      uploadedAt: new Date().toISOString(),
      alreadyExisted: false,
      contentHash,
    };
  } catch (error) {
    // Handle Vercel Blob duplicate error gracefully
    if (error instanceof Error && error.message.includes('This blob already exists')) {
      console.log('[BLOB_STORAGE] Blob already exists (API level), fetching metadata:', filename);
      const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const existingMetadata = await getBlobMetadataByContentHash(contentHash);
      
      if (existingMetadata) {
        return {
          url: existingMetadata.url,
          uploadedAt: existingMetadata.uploadedAt,
          alreadyExisted: true,
          contentHash,
        };
      }
      
      // If metadata doesn't exist but blob does, recover metadata from Blob storage
      console.log('[BLOB_STORAGE] Blob exists but metadata missing, recovering from Blob storage:', contentHash);
      
      // Recover metadata by deterministically generating the content-addressed filename
      const hashPrefix = contentHash.substring(0, 12);
      const filenameParts = filename.split('.');
      const extension = filenameParts.length > 1 ? filenameParts.pop() : 'bin';
      const baseName = filenameParts.join('.');
      const contentAddressedFilename = `${baseName}-${hashPrefix}.${extension}`;
      
      try {
        // Use Vercel Blob SDK to recover metadata from existing Blob
        const blobHead = await head(contentAddressedFilename);
        
        // Fail closed if size is missing - cannot trust recovered metadata without it
        if (!blobHead.size || blobHead.size <= 0) {
          throw new Error(`Blob recovery failed: missing or invalid size for ${contentAddressedFilename}`);
        }
        
        // CRITICAL: Verify physical bytes match expected content hash
        // This is cryptographic proof of identity, not just filename convention
        const hashMatches = await verifyBlobHash(blobHead.url, contentHash);
        
        if (!hashMatches) {
          console.error('[BLOB_STORAGE] RECOVERY_FAILED: Physical bytes do not match expected content hash', {
            contentHash,
            blobUrl: blobHead.url,
            filename: contentAddressedFilename,
            reason: 'Cryptographic identity proof failed - Blob bytes do not match expected hash'
          });
          throw new Error(`Blob recovery failed: physical bytes do not match expected content hash ${contentHash}`);
        }
        
        // Only after physical verification succeeds, recreate metadata
        const recoveredMetadata: BlobMetadata = {
          url: blobHead.url,
          filename: contentAddressedFilename,
          contentType: blobHead.contentType || contentType,
          uploadedAt: typeof blobHead.uploadedAt === 'string' 
            ? blobHead.uploadedAt 
            : new Date().toISOString(),
          contentHash,
          byteSize: blobHead.size,
        };
        
        // Store recovered metadata in Redis
        const client = getRedisClient();
        await client.set(`blob_metadata:${contentHash}`, JSON.stringify(recoveredMetadata));
        
        console.log('[BLOB_STORAGE] Recovered and stored metadata for existing Blob:', {
          contentHash,
          url: blobHead.url,
          filename: contentAddressedFilename,
          verification: 'physical_hash_verified',
        });
        
        return {
          url: blobHead.url,
          uploadedAt: typeof blobHead.uploadedAt === 'string' 
            ? blobHead.uploadedAt 
            : new Date().toISOString(),
          alreadyExisted: true,
          contentHash,
        };
      } catch (headError) {
        console.error('[BLOB_STORAGE] Failed to recover Blob metadata:', headError);
        throw new Error(`Blob exists but metadata recovery failed for content hash: ${contentHash}`);
      }
    }
    
    console.error('[BLOB_STORAGE] Upload failed:', error);
    throw new Error(`Failed to upload ${filename} to Blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get Blob metadata by content hash (for verification)
 * This is exported for use by the media proof gate
 */
export async function getBlobMetadataByContentHash(contentHash: string): Promise<BlobMetadata | null> {
  try {
    const client = getRedisClient();
    const data = await client.get(`blob_metadata:${contentHash}`);
    if (!data) return null;
    
    // Handle both JSON strings and already-deserialized objects
    // Upstash may return objects for some existing records
    if (typeof data === 'string') {
      // Standard case: JSON string, parse it
      return JSON.parse(data) as BlobMetadata;
    } else if (typeof data === 'object' && data !== null) {
      // Upstash returned already-deserialized object
      return data as BlobMetadata;
    } else {
      throw new Error(`Unexpected data type: ${typeof data}`);
    }
  } catch (e) {
    console.error('[BLOB_STORAGE] Content hash lookup failed:', e);
    throw new Error(`Failed to find blob metadata by content hash: ${e instanceof Error ? e.message : 'Unknown error'}`);
  }
}

/**
 * Generate a unique filename for a media variant
 * @param mediaId - Media record ID
 * @param variantType - Type of variant (original, webp, avif, thumbnail)
 * @param extension - File extension
 * @returns Unique filename
 */
export function generateBlobFilename(
  mediaId: string,
  variantType: string,
  extension: string
): string {
  return `${mediaId}-${variantType}.${extension}`;
}
