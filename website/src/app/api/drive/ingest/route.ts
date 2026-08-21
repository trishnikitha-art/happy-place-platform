/**
 * Drive Media Ingestion API Route
 *
 * MATERIALIZATION PATH: DriveReference → PublishedMediaAsset
 *
 * This is the constitutional materialization operation that converts Drive source
 * into a PublishedMediaAsset that can cross the public boundary.
 *
 * Lifecycle:
 * 1. Download bytes from Drive
 * 2. Compute content hash for stable identity
 * 3. Generate variants (original, webp, avif, thumbnail, blur)
 * 4. Upload all variants to Vercel Blob (local storage)
 * 5. Create PublishedMediaAsset with:
 *    - source: 'local' (bytes are in Blob, not Drive)
 *    - lifecycleState: 'published' (ready for public presentation)
 *    - No drive field (no Drive dependency)
 *    - Provenance tracks Drive origin for lineage without creating dependency
 *
 * POST /api/drive/ingest
 * Body: { driveId: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { storeMedia, findMediaByContentHash, getMedia } from '@/lib/media-kv-store';
import crypto from 'crypto';
import type { Media, MediaRole } from '@/types/media';

// Import storage modules at top level (they are ES modules)
import { uploadToBlob, generateBlobFilename } from '@/lib/blob-storage';

// Try to load Sharp (important for production media processing)
let sharp: any = null;
let sharpAvailable = false;
try {
  console.log('[MEDIA_INGEST_FORENSIC] Sharp loading attempt', {
    timestamp: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cwd: process.cwd(),
    envNodeEnv: process.env.NODE_ENV,
    SHARP_IGNORE_GLOBAL_LIBVIPS: process.env.SHARP_IGNORE_GLOBAL_LIBVIPS,
  });
  sharp = require('sharp');
  sharpAvailable = true;
  console.log('[MEDIA_INGEST_FORENSIC] Sharp loaded successfully', {
    timestamp: new Date().toISOString(),
    version: sharp.versions,
    platform: sharp.platforms,
    format: sharp.format,
    cache: sharp.cache,
    concurrency: sharp.concurrency,
  });
} catch (e) {
  console.error('[MEDIA_INGEST_FORENSIC] Sharp failed to load', {
    timestamp: new Date().toISOString(),
    error: e instanceof Error ? e.message : String(e),
    errorStack: e instanceof Error ? e.stack : undefined,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    cwd: process.cwd(),
    envNodeEnv: process.env.NODE_ENV,
    SHARP_IGNORE_GLOBAL_LIBVIPS: process.env.SHARP_IGNORE_GLOBAL_LIBVIPS,
    moduleName: 'sharp',
    requirePaths: require.resolve.paths('sharp'),
  });
  // Sharp is required for constitutional media processing
  // The route will return SHARP_UNAVAILABLE and refuse materialization
  console.warn('[MEDIA_INGEST_FORENSIC] Sharp unavailable - materialization will be rejected');
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
 * CONSTITUTIONAL FIX: Purely content-based identity, no filename dependency
 * Same bytes = same ID, regardless of filename
 */
function generateStableId(contentHash: string): string {
  // Use only content hash for identity - filename should not affect identity
  return contentHash.substring(0, 32); // First 32 hex chars = 128 bits
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
  
  // Check environment variables for storage configuration
  const blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;

  if (!blobConfigured) {
    return NextResponse.json(
      {
        success: false,
        error: 'BLOB_NOT_CONFIGURED',
        stage: 'initialization',
        message: 'Vercel Blob storage is not configured.',
        details: 'BLOB_READ_WRITE_TOKEN environment variable is missing.',
        requestId,
      },
      { status: 500 }
    );
  }

  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    // Skip auth in development
  } else {
    // Check Drive authentication
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    if (!isDriveAuthenticated) {
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

    // 3. Validate image (required for constitutional media pipeline)
    console.log('[MEDIA_INGEST_FORENSIC] IMAGE_VALIDATION stage started', { requestId, sharpAvailable });
    let metadata: any = {};

    if (!sharpAvailable) {
      console.log('[MEDIA_INGEST_FORENSIC] SHARP_UNAVAILABLE - cannot validate image', {
        requestId,
        sharpAvailable,
        sharpObject: sharp,
        sharpType: typeof sharp,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'SHARP_UNAVAILABLE',
          stage: 'IMAGE_VALIDATION',
          message: 'Image processing library (Sharp) is not available. Cannot validate image or extract actual dimensions without fabricating metadata.',
          retryable: false,
          details: 'Sharp is required for constitutional media validation. The system cannot safely proceed without actual image metadata.',
          requestId,
          forensic: {
            sharpAvailable,
            sharpType: typeof sharp,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
          },
        },
        { status: 503 }
      );
    }

    try {
      console.log('[MEDIA_INGEST_FORENSIC] Attempting Sharp metadata extraction', {
        requestId,
        bufferSize: fileBuffer.length,
        sharpAvailable,
        sharpType: typeof sharp,
      });
      metadata = await sharp(fileBuffer).metadata();
      console.log('[MEDIA_INGEST_FORENSIC] Sharp metadata extracted successfully', {
        requestId,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        orientation: metadata.orientation,
        space: metadata.space,
        density: metadata.density,
        channels: metadata.channels,
        depth: metadata.depth,
        hasAlpha: metadata.hasAlpha,
        isProgressive: metadata.isProgressive,
      });

      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }
      console.log('[MEDIA_INGEST_FORENSIC] IMAGE_VALIDATION stage succeeded', { requestId });
    } catch (error) {
      console.log('[MEDIA_INGEST_FORENSIC] IMAGE_VALIDATION stage failed', { requestId });
      console.error('[MEDIA_INGEST_FORENSIC] validation error:', {
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        sharpAvailable,
        sharpType: typeof sharp,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'IMAGE_VALIDATION_FAILED',
          stage: 'IMAGE_VALIDATION',
          message: 'The selected file is not a valid image or is corrupted.',
          retryable: false,
          details: error instanceof Error ? error.message : 'Unknown error',
          requestId,
          forensic: {
            sharpAvailable,
            sharpType: typeof sharp,
            bufferSize: fileBuffer.length,
          },
        },
        { status: 400 }
      );
    }

    // 4. Compute content hash for stable identity
    console.log('[MEDIA_INGEST] HASH stage started', { requestId });
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('[MEDIA_INGEST] HASH stage succeeded', {
      requestId,
      hash: contentHash.substring(0, 16) + '...',
    });
    
    // 5. Check for existing record with matching content hash (deduplication in KV)
    console.log('[MEDIA_INGEST] DEDUPLICATION stage started', { requestId });
    const existingMediaId = await findMediaByContentHash(contentHash);
    if (existingMediaId) {
      const existingMedia = await getMedia(existingMediaId);
      if (existingMedia) {
        console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - existing KV record', {
          requestId,
          existingMediaId: existingMedia.id,
        });
        return NextResponse.json({
          success: true,
          action: 'existing',
          media: existingMedia,
          requestId,
          idempotent: true,
          deduplicationSource: 'kv'
        });
      }
    }
    console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - new record', { requestId });
    
    // 6. Generate stable identifiers
    // CRITICAL: PublishedMediaAsset must NOT use drive- prefix
    // drive- prefix is reserved for DriveReference (source_reference) only
    // PublishedMediaAsset uses purely content-based ID without source prefix
    const stableId = generateStableId(contentHash);
    const uuid = generateUUIDv5(contentHash);
    const mediaId = stableId; // Content-based ID, no drive- prefix

    // 7. Generate variants (required for constitutional media pipeline)
    console.log('[MEDIA_INGEST_FORENSIC] VARIANT_GENERATION stage started', { requestId, sharpAvailable });
    const variants = [];
    let originalUpload: any;
    let blobIdempotencyStats = { newUploads: 0, reusedUploads: 0 };

    if (!sharpAvailable) {
      console.log('[MEDIA_INGEST_FORENSIC] SHARP_UNAVAILABLE - cannot generate variants', {
        requestId,
        sharpAvailable,
        sharpObject: sharp,
        sharpType: typeof sharp,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'SHARP_UNAVAILABLE',
          stage: 'VARIANT_GENERATION',
          message: 'Image processing library (Sharp) is not available. Cannot generate rendition variants.',
          retryable: false,
          details: 'Sharp is required for constitutional media processing. The system cannot safely proceed without variant generation.',
          requestId,
          forensic: {
            sharpAvailable,
            sharpType: typeof sharp,
            platform: process.platform,
            arch: process.arch,
            nodeVersion: process.version,
          },
        },
        { status: 503 }
      );
    }
    
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
    if (originalUpload.alreadyExisted) {
      blobIdempotencyStats.reusedUploads++;
    } else {
      blobIdempotencyStats.newUploads++;
    }
    console.log('[MEDIA_INGEST] STORAGE_UPLOAD_ORIGINAL stage succeeded', {
      requestId,
      url: originalUpload.url,
      alreadyExisted: originalUpload.alreadyExisted,
      contentHash: originalUpload.contentHash,
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
        if (variantUpload.alreadyExisted) {
          blobIdempotencyStats.reusedUploads++;
        } else {
          blobIdempotencyStats.newUploads++;
        }
        
        variants.push({
          width: vw,
          format: fmt,
          src: variantUpload.url,
        });
        
        console.log('[MEDIA_INGEST] STORAGE_UPLOAD_VARIANT stage succeeded', {
          requestId,
          variant: variantFilename,
          url: variantUpload.url,
          alreadyExisted: variantUpload.alreadyExisted,
          contentHash: variantUpload.contentHash,
        });
      }
    }
    
    // Generate and upload thumbnail
    let thumbUpload: any;
    let blurDataURL = '';
    
    const thumbFilename = generateBlobFilename(mediaId, 'thumb', 'webp');
    const thumbBuffer = await sharp(fileBuffer).resize(480).webp({ quality: 70 }).toBuffer();
    thumbUpload = await uploadToBlob(thumbBuffer, thumbFilename, 'image/webp');
    if (thumbUpload.alreadyExisted) {
      blobIdempotencyStats.reusedUploads++;
    } else {
      blobIdempotencyStats.newUploads++;
    }
    console.log('[MEDIA_INGEST] STORAGE_UPLOAD_THUMBNAIL stage succeeded', {
      requestId,
      url: thumbUpload.url,
      alreadyExisted: thumbUpload.alreadyExisted,
      contentHash: thumbUpload.contentHash,
    });
    
    // Generate blur placeholder
    const blurBuffer = await sharp(fileBuffer).resize(16).webp({ quality: 40 }).toBuffer();
    blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;
    
    console.log('[MEDIA_INGEST] VARIANT_GENERATION stage completed', {
      requestId,
      variantsCount: variants.length,
      blobIdempotencyStats,
    });

    // 8. Create full Media record as PublishedMediaAsset
    // CRITICAL: Materialization converts Drive source to local PublishedMediaAsset
    // - Bytes are now in Blob (local storage)
    // - lifecycleState is 'published' (not 'materializing' or 'source_reference')
    // - source is 'local' (not 'google-drive')
    // - drive field is removed (no Drive dependency)
    // - provenance tracks the Drive origin for lineage
    const webpVariant = variants.find((v) => v.format === 'webp');
    const avifVariant = variants.find((v) => v.format === 'avif');
    const orientation = determineOrientation(metadata.width || 1920, metadata.height || 1080);
    
    const mediaRecord: Media = {
      id: mediaId,
      contentHash,
      source: 'local', // PUBLISHED: bytes are now in Blob storage
      lifecycleState: 'published', // PUBLISHED: this is a PublishedMediaAsset
      // CRITICAL: No drive field - PublishedMediaAsset must not have Drive dependency
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
      format: sharpAvailable ? (metadata.format || 'WEBP') : driveFile.mimeType?.split('/')[1] || 'unknown',
      colorSpace: sharpAvailable ? (metadata.space || 'sRGB') : 'sRGB',
      // Provenance tracks Drive origin without creating Drive dependency
      provenance: {
        drive_canonical: true,
        current_authority: true,
        status: 'published', // Materialized and published
        preserved_at: new Date().toISOString(),
        // Track Drive origin for lineage without creating drive field
        august3_driveId: driveIdParameter || driveId,
      },
    };

    console.log('[MEDIA_INGEST] MEDIA_PERSIST stage started', {
      requestId,
      mediaId,
    });

    // 9. Store Media record in KV (canonical authority)
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
      idempotent: blobIdempotencyStats.newUploads === 0,
      blobIdempotencyStats,
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
