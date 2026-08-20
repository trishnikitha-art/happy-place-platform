/**
 * Vercel Blob Storage for Media Assets
 *
 * Provides persistent storage for image assets on Vercel.
 * Stores original, WebP, AVIF, and thumbnail variants.
 */

import { put } from '@vercel/blob';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

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

export interface BlobUploadResult {
  url: string;
  uploadedAt: string;
  alreadyExisted: boolean;
}

/**
 * Upload a buffer to Vercel Blob Storage
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
    // Check if blob already exists with same content hash (idempotency)
    const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const existingBlobKey = await getBlobKeyByContentHash(contentHash);
    
    if (existingBlobKey) {
      console.log('[BLOB_STORAGE] Blob already exists, reusing:', existingBlobKey);
      // For idempotency, just return the existing key as a URL
      // The actual URL would be generated from the blob key
      return {
        url: existingBlobKey, // Use the existing blob key as the URL identifier
        uploadedAt: new Date().toISOString(),
        alreadyExisted: true,
      };
    }
    
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
    });
    
    // Store content hash mapping for idempotency
    const client = getRedisClient();
    // Content hash keys store strings (filenames), not objects
    await client.set<string>(`blob_hash:${contentHash}`, filename);
    
    return {
      url: blob.url,
      uploadedAt: new Date().toISOString(),
      alreadyExisted: false,
    };
  } catch (error) {
    // Handle Vercel Blob duplicate error gracefully
    if (error instanceof Error && error.message.includes('This blob already exists')) {
      console.log('[BLOB_STORAGE] Blob already exists (API level), treating as success:', filename);
      // For idempotency, try to get the existing blob by filename
      const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
      const existingBlobKey = await getBlobKeyByContentHash(contentHash);
      
      if (existingBlobKey) {
        return {
          url: existingBlobKey,
          uploadedAt: new Date().toISOString(),
          alreadyExisted: true,
        };
      }
      
      // Fallback: return filename as URL identifier
      return {
        url: filename,
        uploadedAt: new Date().toISOString(),
        alreadyExisted: true,
      };
    }
    
    console.error('[BLOB_STORAGE] Upload failed:', error);
    throw new Error(`Failed to upload ${filename} to Blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getBlobKeyByContentHash(contentHash: string): Promise<string | null> {
  try {
    const client = getRedisClient();
    // Content hash keys store strings (filenames), not objects
    const key = await client.get<string>(`blob_hash:${contentHash}`);
    return key;
  } catch (e) {
    console.error('[BLOB_STORAGE] Content hash lookup failed:', e);
    throw new Error(`Failed to find blob by content hash: ${e instanceof Error ? e.message : 'Unknown error'}`);
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
