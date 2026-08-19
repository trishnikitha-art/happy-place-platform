/**
 * Vercel Blob Storage for Media Assets
 * 
 * Provides persistent storage for image assets on Vercel.
 * Stores original, WebP, AVIF, and thumbnail variants.
 */

import { put } from '@vercel/blob';

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
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType,
      // Do NOT use allowOverwrite - implement proper idempotency based on content hash
    });
    
    return {
      url: blob.url,
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('[BLOB_STORAGE] Upload failed:', error);
    throw new Error(`Failed to upload ${filename} to Blob storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
