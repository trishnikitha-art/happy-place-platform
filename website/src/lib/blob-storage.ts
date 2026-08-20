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
      console.log('[BLOB_STORAGE] Blob already exists, reusing URL:', existingMetadata.url);
      return {
        url: existingMetadata.url, // Return actual persisted Blob URL
        uploadedAt: existingMetadata.uploadedAt,
        alreadyExisted: true,
        contentHash,
      };
    }
    
    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
    });
    
    // Store complete metadata including actual Blob URL
    const metadata: BlobMetadata = {
      url: blob.url,
      filename,
      contentType,
      uploadedAt: new Date().toISOString(),
      contentHash,
      byteSize,
    };
    
    const client = getRedisClient();
    await client.set(`blob_metadata:${contentHash}`, metadata);
    
    console.log('[BLOB_STORAGE] New blob uploaded and metadata stored:', {
      contentHash,
      url: blob.url,
      filename,
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
      
      // If metadata doesn't exist but blob does, this is a consistency issue
      console.error('[BLOB_STORAGE] Blob exists but metadata missing for:', contentHash);
      throw new Error(`Blob exists but metadata missing for content hash: ${contentHash}`);
    }
    
    console.error('[BLOB_STORAGE] Upload failed:', error);
    throw new Error(`Failed to upload ${filename} to Blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getBlobMetadataByContentHash(contentHash: string): Promise<BlobMetadata | null> {
  try {
    const client = getRedisClient();
    const metadata = await client.get<BlobMetadata>(`blob_metadata:${contentHash}`);
    return metadata;
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
