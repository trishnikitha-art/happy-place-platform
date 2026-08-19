/**
 * Drive Media Ingestion API Route
 *
 * Creates a complete canonical media object from a Drive file.
 * Downloads the file, processes it into variants, uploads to Vercel Blob,
 * and stores metadata in Vercel KV.
 *
 * POST /api/drive/ingest
 * Body: { driveId: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import crypto from 'crypto';
import type { Media, MediaRole } from '@/types/media';

// Try to import dependencies with fallback
let sharp: any = null;
let uploadToBlob: any = null;
let generateBlobFilename: any = null;
let storeMedia: any = null;
let getMedia: any = null;
let findMediaByContentHash: any = null;

try {
  sharp = require('sharp');
  const blobStorage = require('@/lib/blob-storage');
  uploadToBlob = blobStorage.uploadToBlob;
  generateBlobFilename = blobStorage.generateBlobFilename;
  const mediaKvStore = require('@/lib/media-kv-store');
  storeMedia = mediaKvStore.storeMedia;
  getMedia = mediaKvStore.getMedia;
  findMediaByContentHash = mediaKvStore.findMediaByContentHash;
} catch (e) {
  console.log('[MEDIA_INGEST] Dependencies not available:', e);
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface IngestRequest {
  driveId: string;
  driveIdParameter?: string; // Shared Drive ID for file operations
  projectId?: string;
  roles?: MediaRole[];
}

// Configuration matching the existing image pipeline
const WIDTHS = [480, 768, 1080, 1600, 2000];

/**
 * Generate a stable media ID from content hash (deterministic)
 */
function generateStableId(contentHash: string, baseName: string): string {
  const combined = `${contentHash}:${baseName}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  return hash.substring(0, 32); // First 32 hex chars = 128 bits
}

/**
 * Generate UUIDv5 from content hash for stable identity
 */
function generateUUIDv5(contentHash: string): string {
  const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // DNS namespace
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(contentHash, 'hex');
  
  const hash = crypto.createHash('sha1');
  hash.update(Buffer.concat([namespaceBytes, nameBytes]));
  const hashBytes = hash.digest();
  
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50; // version 5
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80; // variant RFC 4122
  
  const hex = hashBytes.toString('hex');
  return [
    hex.substr(0, 8),
    hex.substr(8, 4),
    hex.substr(12, 4),
    hex.substr(16, 4),
    hex.substr(20, 12),
  ].join("-");
}

/**
 * Determine orientation from dimensions
 */
function determineOrientation(width: number, height: number): 'landscape' | 'portrait' | 'square' {
  if (width > height) return 'landscape';
  if (height > width) return 'portrait';
  return 'square';
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  console.log('[MEDIA_INGEST] request started', { requestId });
  console.log('[MEDIA_INGEST] environment detection', {
    requestId,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    isVercel: !!process.env.VERCEL,
    blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
    kvConfigured: !!process.env.KV_REST_API_URL || !!process.env.KV_REST_API_TOKEN,
  });

  // Check if required modules loaded successfully
  if (!uploadToBlob || !storeMedia) {
    console.log('[MEDIA_INGEST_ERROR] STORAGE_MODULES_NOT_AVAILABLE', { requestId });
    return NextResponse.json(
      {
        success: false,
        error: 'STORAGE_MODULES_NOT_AVAILABLE',
        stage: 'initialization',
        message: 'Blob or KV storage modules are not available.',
        details: 'This may be due to module loading errors.',
        requestId,
      },
      { status: 500 }
    );
  }

  // Log Sharp availability for debugging (not a hard failure)
  console.log('[MEDIA_INGEST] Sharp availability', {
    requestId,
    sharpAvailable: !!sharp,
    sharpMode: sharp ? 'will-generate-variants' : 'will-store-original-only',
  });

  // Check if required modules loaded successfully
  if (!sharp) {
    console.log('[MEDIA_INGEST_ERROR] SHARP_NOT_AVAILABLE', { requestId });
    return NextResponse.json(
      {
        success: false,
        error: 'DEPENDENCY_NOT_AVAILABLE',
        stage: 'initialization',
        message: 'Sharp image processing library is not available.',
        details: 'This may be due to a module loading error or runtime incompatibility.',
        requestId,
      },
      { status: 500 }
    );
  }

  if (!uploadToBlob || !storeMedia) {
    console.log('[MEDIA_INGEST_ERROR] STORAGE_MODULES_NOT_AVAILABLE', { requestId });
    return NextResponse.json(
      {
        success: false,
        error: 'STORAGE_MODULES_NOT_AVAILABLE',
        stage: 'initialization',
        message: 'Blob or KV storage modules are not available.',
        details: 'This may be due to module loading errors.',
        requestId,
      },
      { status: 500 }
    );
  }

  // Check Vercel Blob configuration
  if (process.env.VERCEL && !process.env.BLOB_READ_WRITE_TOKEN) {
    console.log('[MEDIA_INGEST_ERROR] Vercel Blob not configured', { requestId });
    return NextResponse.json(
      { 
        success: false,
        error: 'BLOB_NOT_CONFIGURED', 
        stage: 'environment', 
        message: 'Vercel Blob storage is not configured. Please add BLOB_READ_WRITE_TOKEN environment variable in Vercel project settings.',
        retryable: false,
        requestId,
      },
      { status: 500 }
    );
  }

  // Check Vercel KV configuration
  if (process.env.VERCEL && !process.env.KV_REST_API_URL && !process.env.KV_REST_API_TOKEN) {
    console.log('[MEDIA_INGEST_ERROR] Vercel KV not configured', { requestId });
    return NextResponse.json(
      { 
        success: false,
        error: 'KV_NOT_CONFIGURED', 
        stage: 'environment', 
        message: 'Vercel KV storage is not configured. Please add KV_REST_API_URL and KV_REST_API_TOKEN environment variables in Vercel project settings.',
        retryable: false,
        requestId,
      },
      { status: 500 }
    );
  }

  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[MEDIA_INGEST] development mode - skipping auth', { requestId });
  } else {
    console.log('[MEDIA_INGEST] AUTH stage started', { requestId });
    // Check Drive authentication
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    if (!isDriveAuthenticated) {
      console.log('[MEDIA_INGEST_ERROR] Drive authentication required', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'DRIVE_AUTH_REQUIRED', 
          stage: 'AUTH', 
          message: 'Drive authentication required', 
          retryable: false,
          requestId,
        },
        { status: 401 }
      );
    }

    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      console.log('[MEDIA_INGEST_ERROR] Workbench authentication required', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'WORKBENCH_AUTH_REQUIRED', 
          stage: 'AUTH', 
          message: 'Workbench authentication required', 
          retryable: false,
          requestId,
        },
        { status: 401 }
      );
    }
    console.log('[MEDIA_INGEST] AUTH stage succeeded', { requestId });
  }

  try {
    const body: IngestRequest = await request.json();
    const { driveId, driveIdParameter, projectId, roles = ['gallery'] } = body;

    console.log('[MEDIA_INGEST] REQUEST stage succeeded', {
      requestId,
      source: 'drive',
      driveFileId: driveId,
      sharedDrive: !!driveIdParameter,
      sharedDriveId: driveIdParameter || 'none',
      projectId: projectId || 'none',
      roles,
    });

    if (!driveId) {
      console.log('[MEDIA_INGEST_ERROR] driveId is required', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'DRIVE_ID_REQUIRED', 
          stage: 'REQUEST', 
          message: 'driveId is required', 
          retryable: false,
          requestId,
        },
        { status: 400 }
      );
    }

    // 1. Get Drive file metadata
    console.log('[MEDIA_INGEST] DRIVE_METADATA stage started', { requestId });
    const driveFile = await driveDiscovery.getFile(driveId, driveIdParameter);
    if (!driveFile) {
      console.log('[MEDIA_INGEST_ERROR] File not found in Drive', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'FILE_NOT_FOUND', 
          stage: 'DRIVE_METADATA', 
          message: 'File not found in Drive', 
          retryable: false,
          requestId,
        },
        { status: 404 }
      );
    }
    console.log('[MEDIA_INGEST] DRIVE_METADATA stage succeeded', {
      requestId,
      driveName: driveFile.name,
      mimeType: driveFile.mimeType,
      size: driveFile.size || 'unknown',
    });

    // 2. Download file content from Drive
    console.log('[MEDIA_INGEST] DRIVE_DOWNLOAD stage started', { requestId });
    let fileBuffer: Buffer;
    try {
      fileBuffer = await driveDiscovery.downloadFile(driveId, driveIdParameter);
      console.log('[MEDIA_INGEST] DRIVE_DOWNLOAD stage succeeded', {
        requestId,
        bytes: fileBuffer.length,
      });
    } catch (error) {
      console.log('[MEDIA_INGEST_ERROR] DRIVE_DOWNLOAD stage failed', { requestId });
      console.error('[MEDIA_INGEST_ERROR] download error:', error);
      return NextResponse.json(
        { 
          success: false,
          error: 'DRIVE_DOWNLOAD_FAILED', 
          stage: 'DRIVE_DOWNLOAD', 
          message: 'Unable to download the selected Drive file.',
          retryable: true,
          details: error instanceof Error ? error.message : 'Unknown error',
          requestId,
        },
        { status: 500 }
      );
    }

    // 3. Validate image (optional if Sharp not available)
    console.log('[MEDIA_INGEST] IMAGE_VALIDATION stage started', { requestId });
    let metadata: any = {};
    if (sharp) {
      try {
        metadata = await sharp(fileBuffer).metadata();
        console.log('[MEDIA_INGEST] image metadata:', {
          requestId,
          width: metadata.width,
          height: metadata.height,
          format: metadata.format,
          orientation: metadata.orientation,
        });
        
        if (!metadata.width || !metadata.height) {
          throw new Error('Invalid image dimensions');
        }
        console.log('[MEDIA_INGEST] IMAGE_VALIDATION stage succeeded', { requestId });
      } catch (error) {
        console.log('[MEDIA_INGEST_ERROR] IMAGE_VALIDATION stage failed', { requestId });
        console.error('[MEDIA_INGEST_ERROR] validation error:', error);
        return NextResponse.json(
          { 
            success: false,
            error: 'IMAGE_VALIDATION_FAILED', 
            stage: 'IMAGE_VALIDATION', 
            message: 'The selected file is not a valid image or is corrupted.',
            retryable: false,
            details: error instanceof Error ? error.message : 'Unknown error',
            requestId,
          },
          { status: 400 }
        );
      }
    } else {
      console.log('[MEDIA_INGEST] IMAGE_VALIDATION skipped - Sharp not available', { requestId });
      // Use fallback dimensions when Sharp is not available
      metadata = { width: 1920, height: 1080, format: 'unknown' };
    }

    // 4. Compute content hash for stable identity
    console.log('[MEDIA_INGEST] HASH stage started', { requestId });
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('[MEDIA_INGEST] HASH stage succeeded', {
      requestId,
      hash: contentHash.substring(0, 16) + '...',
    });
    
    // 5. Check for existing record with matching content hash (deduplication)
    console.log('[MEDIA_INGEST] DEDUPLICATION stage started', { requestId });
    const existingMediaId = await findMediaByContentHash(contentHash);
    if (existingMediaId) {
      const existingMedia = await getMedia(existingMediaId);
      if (existingMedia) {
        console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - existing record', {
          requestId,
          existingMediaId,
        });
        return NextResponse.json({
          success: true,
          action: 'existing',
          media: existingMedia,
          requestId,
        });
      }
    }
    console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - new record', { requestId });
    
    // 6. Generate stable identifiers
    const baseName = driveFile.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const stableId = generateStableId(contentHash, baseName);
    const uuid = generateUUIDv5(contentHash);
    const mediaId = `drive-${stableId}`;

    // 7. Generate variants (or use original as fallback if Sharp not available)
    console.log('[MEDIA_INGEST] VARIANT_GENERATION stage started', { requestId });
    const variants = [];
    let originalUpload: any;
    
    if (sharp) {
      const width = metadata.width || 1920;
      const height = metadata.height || 1080;
      const validWidths = WIDTHS.filter((w) => w <= width);
      if (!validWidths.length) validWidths.push(width);
      
      // Upload original
      const originalExt = driveFile.name.split('.').pop() || 'jpg';
      const originalFilename = generateBlobFilename(mediaId, 'original', originalExt);
      const originalContentType = driveFile.mimeType || 'image/jpeg';
      console.log('[MEDIA_INGEST] STORAGE_UPLOAD_ORIGINAL stage started', {
        requestId,
        filename: originalFilename,
        bytes: fileBuffer.length,
      });
      originalUpload = await uploadToBlob(fileBuffer, originalFilename, originalContentType);
      console.log('[MEDIA_INGEST] STORAGE_UPLOAD_ORIGINAL stage succeeded', {
        requestId,
        url: originalUpload.url,
      });
      
      // Generate and upload WebP/AVIF variants
      for (const vw of validWidths) {
        for (const fmt of ['avif', 'webp']) {
          const variantFilename = generateBlobFilename(mediaId, `${vw}`, fmt);
          const variantContentType = fmt === 'avif' ? 'image/avif' : 'image/webp';
          
          console.log('[MEDIA_INGEST] STORAGE_UPLOAD_VARIANT stage started', {
            requestId,
            variant: variantFilename,
            width: vw,
            format: fmt,
          });
          
          const variantBuffer = await sharp(fileBuffer)
            .resize({ width: vw, withoutEnlargement: true })
            [fmt === 'avif' ? 'avif' : 'webp']({ quality: fmt === 'avif' ? 55 : 72 })
            .toBuffer();
          
          const variantUpload = await uploadToBlob(variantBuffer, variantFilename, variantContentType);
          
          variants.push({
            width: vw,
            format: fmt,
            src: variantUpload.url,
          });
          
          console.log('[MEDIA_INGEST] STORAGE_UPLOAD_VARIANT stage succeeded', {
            requestId,
            variant: variantFilename,
            url: variantUpload.url,
          });
        }
      }
    } else {
      console.log('[MEDIA_INGEST] VARIANT_GENERATION skipped - Sharp not available, using original only', { requestId });
      
      // Upload original as all variants (fallback mode)
      const originalExt = driveFile.name.split('.').pop() || 'jpg';
      const originalFilename = generateBlobFilename(mediaId, 'original', originalExt);
      const originalContentType = driveFile.mimeType || 'image/jpeg';
      console.log('[MEDIA_INGEST] STORAGE_UPLOAD_ORIGINAL stage started', {
        requestId,
        filename: originalFilename,
        bytes: fileBuffer.length,
      });
      originalUpload = await uploadToBlob(fileBuffer, originalFilename, originalContentType);
      console.log('[MEDIA_INGEST] STORAGE_UPLOAD_ORIGINAL stage succeeded', {
        requestId,
        url: originalUpload.url,
      });
    }
    
    // Generate and upload thumbnail
    let thumbUpload: any;
    let blurDataURL = '';
    
    if (sharp) {
      const thumbFilename = generateBlobFilename(mediaId, 'thumb', 'webp');
      const thumbBuffer = await sharp(fileBuffer).resize(480).webp({ quality: 70 }).toBuffer();
      thumbUpload = await uploadToBlob(thumbBuffer, thumbFilename, 'image/webp');
      console.log('[MEDIA_INGEST] STORAGE_UPLOAD_THUMBNAIL stage succeeded', {
        requestId,
        url: thumbUpload.url,
      });
      
      // Generate blur placeholder
      const blurBuffer = await sharp(fileBuffer).resize(16).webp({ quality: 40 }).toBuffer();
      blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;
    } else {
      console.log('[MEDIA_INGEST] THUMBNAIL/BLUR skipped - Sharp not available, using original as thumbnail', { requestId });
      thumbUpload = originalUpload;
      blurDataURL = '';
    }
    
    console.log('[MEDIA_INGEST] VARIANT_GENERATION stage completed', {
      requestId,
      variantsCount: variants.length,
      hasSharp: !!sharp,
    });

    // 8. Create full Media record
    const webpVariant = variants.find((v) => v.format === 'webp');
    const avifVariant = variants.find((v) => v.format === 'avif');
    const orientation = determineOrientation(metadata.width || 1920, metadata.height || 1080);
    
    const mediaRecord: Media = {
      id: mediaId,
      contentHash,
      source: 'google-drive',
      drive: {
        fileId: driveId,
        driveId: driveIdParameter, // Preserve Shared Drive ID
        name: driveFile.name,
        mimeType: driveFile.mimeType,
        webViewUrl: driveFile.webViewLink,
        modifiedTime: driveFile.modifiedTime,
      },
      filename: driveFile.name,
      type: driveFile.mimeType?.startsWith('image/') ? 'image' : 'document',
      orientation,
      dimensions: {
        width: metadata.width || 1920,
        height: metadata.height || 1080,
      },
      variants: {
        original: originalUpload?.url || '',
        web: webpVariant?.src || originalUpload?.url || '',
        webp: webpVariant?.src || originalUpload?.url || '',
        avif: avifVariant?.src || '',
        thumbnail: thumbUpload?.url || originalUpload?.url || '',
        blur: blurDataURL,
      },
      alt: driveFile.name,
      description: driveFile.description,
      projectId,
      tags: [],
      roles,
      order: 0, // Will be set by Workbench
      createdAt: driveFile.createdTime,
      updatedAt: driveFile.modifiedTime,
      uploadedAt: new Date().toISOString(),
      fileSize: driveFile.size || fileBuffer.length,
      format: sharp ? (metadata.format || 'WEBP') : driveFile.mimeType?.split('/')[1] || 'unknown',
      colorSpace: sharp ? (metadata.space || 'sRGB') : 'sRGB',
      provenance: {
        drive_canonical: true,
        current_authority: true,
        status: 'ingested',
        preserved_at: new Date().toISOString(),
      },
    };

    console.log('[MEDIA_INGEST] MEDIA_PERSIST stage started', {
      requestId,
      mediaId,
    });

    // 9. Store Media record in KV
    await storeMedia(mediaRecord);
    
    console.log('[MEDIA_INGEST] MEDIA_PERSIST stage succeeded', {
      requestId,
      mediaId,
    });

    console.log('[MEDIA_INGEST] RESPONSE stage started', { requestId });
    return NextResponse.json({
      success: true,
      action: 'created',
      media: mediaRecord,
      requestId,
    });
  } catch (error) {
    console.log('[MEDIA_INGEST_ERROR] unexpected error', { requestId });
    console.error('[MEDIA_INGEST_ERROR]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'INGESTION_FAILED',
        stage: 'unknown',
        message: 'An unexpected error occurred during ingestion.',
        retryable: false,
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
