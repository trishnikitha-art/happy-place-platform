/**
 * Cloudflare R2 Storage for Media Assets
 *
 * Provides persistent storage for image assets on Cloudflare R2.
 * Stores original, WebP, AVIF, and thumbnail variants.
 * 
 * Contract corrections:
 * - Never return filename as URL
 * - Persist actual R2 URL as authoritative storage address
 * - Make object identity content-addressed
 * - Eliminate race conditions in idempotency
 */

import { S3Client, PutObjectCommand, HeadObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Redis } from '@upstash/redis';
import crypto from 'crypto';

/**
 * Verification result with distinct error types
 * Distinguishes transport/auth failures from actual integrity failures
 */
export interface R2HashVerificationResult {
  success: boolean;
  errorType?: 'OBJECT_NOT_FOUND' | 'AUTH_FAILURE' | 'INTEGRITY_FAILURE' | 'TRANSPORT_ERROR' | 'INVALID_URL' | 'UNKNOWN_ERROR';
  actualHash?: string;
}

/**
 * Create R2 S3 client with configured credentials
 */
function getR2Client(): S3Client | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  
  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.warn('[R2_STORAGE] R2 credentials not configured, returning null client');
    return null;
  }
  
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

/**
 * Get R2 bucket name
 */
function getR2Bucket(): string | null {
  const bucketName = process.env.R2_BUCKET_NAME;
  if (!bucketName) {
    console.warn('[R2_STORAGE] R2_BUCKET_NAME not configured');
    return null;
  }
  return bucketName;
}

/**
 * P0 FIX: Eliminate process-global mutable state
 * Create fresh Redis client on each call to prevent identity leaks
 * and cross-request contamination
 */
function getRedisClient(): Redis | null {
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
    console.warn('[R2_STORAGE] KV credentials not configured, returning null client');
    return null;
  }
  
  // Create fresh client on each call (no global cache)
  return new Redis({ url, token });
}

/**
 * Verify that an R2 object's actual bytes match the expected content hash
 * This is real physical verification, not just metadata checking
 * 
 * Returns structured error types instead of boolean to enable proper classification
 * - OBJECT_NOT_FOUND: R2 object doesn't exist
 * - AUTH_FAILURE: Authorization/transport failure prevented access
 * - INTEGRITY_FAILURE: Object exists but bytes don't match expected hash
 * - TRANSPORT_ERROR: Network/infrastructure error prevented verification
 * - INVALID_URL: URL format is invalid
 * - UNKNOWN_ERROR: Unclassified error
 */
export async function verifyR2Hash(objectKey: string, expectedContentHash: string): Promise<R2HashVerificationResult> {
  const client = getR2Client();
  const bucket = getR2Bucket();
  
  if (!client || !bucket) {
    console.error('[R2_STORAGE] R2 client or bucket not configured');
    return { success: false, errorType: 'AUTH_FAILURE' };
  }
  
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    });
    
    const response = await client.send(command);
    
    if (!response.Body) {
      console.error('[R2_STORAGE] R2 object body missing', { objectKey });
      return { success: false, errorType: 'OBJECT_NOT_FOUND' };
    }
    
    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const stream = response.Body as any;
    
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    
    const buffer = Buffer.concat(chunks);
    
    // Compute SHA-256 hash of actual bytes
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    
    const matches = hash === expectedContentHash;
    
    if (!matches) {
      console.error('[R2_STORAGE] R2 object hash mismatch (integrity failure)', {
        objectKey,
        expected: expectedContentHash,
        actual: hash,
      });
      return { success: false, errorType: 'INTEGRITY_FAILURE', actualHash: hash };
    }
    
    return { success: true };
  } catch (error) {
    // Handle R2 errors with structured classification
    if (error instanceof Error) {
      if (error.message.includes('NotFound') || error.message.includes('NoSuchKey')) {
        console.error('[R2_STORAGE] R2 object not found', { objectKey, error: error.message });
        return { success: false, errorType: 'OBJECT_NOT_FOUND' };
      } else if (error.message.includes('AccessDenied') || error.message.includes('Unauthorized')) {
        console.error('[R2_STORAGE] R2 auth failure', { objectKey, error: error.message });
        return { success: false, errorType: 'AUTH_FAILURE' };
      } else {
        console.error('[R2_STORAGE] R2 verification error', { objectKey, error: error.message });
        return { success: false, errorType: 'TRANSPORT_ERROR' };
      }
    } else {
      console.error('[R2_STORAGE] Unknown error verifying R2 hash', { objectKey, error });
      return { success: false, errorType: 'UNKNOWN_ERROR' };
    }
  }
}

export interface R2UploadResult {
  url: string;
  uploadedAt: string;
  contentHash: string;
}

interface R2Metadata {
  url: string;
  key: string;
  contentType: string;
  uploadedAt: string;
  contentHash: string;
  byteSize: number;
}

/**
 * Upload a file to R2 with content-addressed key for idempotency
 * @param buffer - File buffer
 * @param contentType - MIME type
 * @param extension - File extension (e.g., 'jpg', 'webp', 'avif')
 * @returns Upload result with URL and metadata
 */
export async function uploadToR2(
  buffer: Buffer,
  contentType: string,
  extension: string
): Promise<R2UploadResult> {
  const client = getR2Client();
  const bucket = getR2Bucket();
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL;
  
  if (!client || !bucket) {
    throw new Error('R2 client or bucket not configured');
  }
  
  if (!publicBaseUrl) {
    throw new Error('R2_PUBLIC_BASE_URL not configured - required for production R2 materialization');
  }
  
  // Compute content hash for content-addressed key
  const contentHash = crypto.createHash('sha256').update(buffer).digest('hex');
  const key = `${contentHash}-original.${extension}`;
  
  console.log('[R2_STORAGE] Uploading to R2', {
    key,
    contentType,
    bufferSize: buffer.length,
    contentHash,
    publicBaseUrl,
  });
  
  // P0 FIX: Remove HeadObject before PUT - unnecessary for content-addressed storage
  // The object key is deterministic from content identity
  // PUT of the same content-addressed key is idempotent by definition
  
  // Upload object (PUT is idempotent for content-addressed keys)
  try {
    const putCommand = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    });
    
    await client.send(putCommand);
    
    console.log('[R2_STORAGE] Upload successful', { key });
    
    // Generate public URL using R2_PUBLIC_BASE_URL
    const url = `${publicBaseUrl}/${key}`;
    
    return {
      url,
      uploadedAt: new Date().toISOString(),
      contentHash,
    };
  } catch (error) {
    console.error('[R2_STORAGE] Upload failed', { key, error });
    throw error;
  }
}

/**
 * Delete an object from R2
 * @param key - Object key
 */
export async function deleteFromR2(key: string): Promise<void> {
  const client = getR2Client();
  const bucket = getR2Bucket();
  
  if (!client || !bucket) {
    throw new Error('R2 client or bucket not configured');
  }
  
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    await client.send(command);
    
    console.log('[R2_STORAGE] Delete successful', { key });
  } catch (error) {
    console.error('[R2_STORAGE] Delete failed', { key, error });
    throw error;
  }
}

/**
 * Verify that an R2 object is physically accessible
 * @param key - The object key to verify
 * @returns true if the object exists and is accessible
 */
export async function verifyR2ObjectExists(key: string): Promise<boolean> {
  const client = getR2Client();
  const bucket = getR2Bucket();
  
  if (!client || !bucket) {
    return false;
  }
  
  try {
    const command = new HeadObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    
    await client.send(command);
    return true;
  } catch (error) {
    console.error('[R2_STORAGE] Error verifying R2 object existence', { key, error });
    return false;
  }
}

/**
 * Verify that all required renditions exist in R2 storage
 * This upgrades the contract from "primary content hash exists" to "every required rendition exists"
 * 
 * @param media - The media record to verify
 * @returns object with verification results for each rendition type
 */
export async function verifyR2RenditionCompleteness(media: any): Promise<{
  complete: boolean;
  details: {
    original: boolean;
    thumbnail: boolean;
    webp: boolean;
    avif: boolean;
    responsive: Array<{ width: number; webp: boolean; avif: boolean }>;
  };
}> {
  const details = {
    original: false,
    thumbnail: false,
    webp: false,
    avif: false,
    responsive: [] as Array<{ width: number; webp: boolean; avif: boolean }>,
  };

  if (!media.variants) {
    return { complete: false, details };
  }

  // Extract key from URL for verification
  const extractKey = (url: string) => {
    const match = url.match(/\/([^/]+)$/);
    return match ? match[1] : null;
  };

  // Verify original
  if (media.variants.original) {
    const key = extractKey(media.variants.original);
    if (key) {
      details.original = await verifyR2ObjectExists(key);
    }
  }

  // Verify thumbnail
  if (media.variants.thumbnail) {
    const key = extractKey(media.variants.thumbnail);
    if (key) {
      details.thumbnail = await verifyR2ObjectExists(key);
    }
  }

  // Verify webp (largest responsive or fallback)
  if (media.variants.webp) {
    const key = extractKey(media.variants.webp);
    if (key) {
      details.webp = await verifyR2ObjectExists(key);
    }
  }

  // Verify avif (largest responsive or fallback)
  if (media.variants.avif) {
    const key = extractKey(media.variants.avif);
    if (key) {
      details.avif = await verifyR2ObjectExists(key);
    }
  }

  // Verify responsive variants
  if (media.variants.responsive && Array.isArray(media.variants.responsive)) {
    for (const variant of media.variants.responsive) {
      const webpKey = variant.webp ? extractKey(variant.webp) : null;
      const avifKey = variant.avif ? extractKey(variant.avif) : null;
      const webpExists = webpKey ? await verifyR2ObjectExists(webpKey) : false;
      const avifExists = avifKey ? await verifyR2ObjectExists(avifKey) : false;
      details.responsive.push({
        width: variant.width,
        webp: webpExists,
        avif: avifExists,
      });
    }
  }

  // Determine overall completeness
  const complete = details.original && details.thumbnail && details.webp && details.avif;
  
  return { complete, details };
}
