/**
 * Vercel Blob Storage for Media Assets
 * 
 * Provides persistent storage for image assets on Vercel.
 * Stores original, WebP, AVIF, and thumbnail variants.
 */

import { put } from '@vercel/blob';
import { kv } from '@vercel/kv';
import crypto from 'crypto';

export interface BlobUploadResult {
  url: string;
  uploadedAt: string;
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
      };
    }
    
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
    });
    
    // Store content hash mapping for idempotency
    await kv.set(`blob_hash:${contentHash}`, filename);
    
    return {
      url: blob.url,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[BLOB_STORAGE] Upload failed:', error);
    throw new Error(`Failed to upload ${filename} to Blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function getBlobKeyByContentHash(contentHash: string): Promise<string | null> {
  try {
    const key = await kv.get(`blob_hash:${contentHash}`);
    return key as string | null;
  } catch (e) {
    return null;
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
