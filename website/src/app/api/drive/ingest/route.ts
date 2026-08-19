/**
 * Drive Media Ingestion API Route
 *
 * Creates a complete canonical media object from a Drive file.
 * Downloads the file, processes it into variants, and creates a full Media record.
 *
 * POST /api/drive/ingest
 * Body: { driveId: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import type { Media, MediaRole } from '@/types/media';

export const dynamic = 'force-dynamic';

interface IngestRequest {
  driveId: string;
  driveIdParameter?: string; // Shared Drive ID for file operations
  projectId?: string;
  roles?: MediaRole[];
}

// Configuration matching the existing image pipeline
const WIDTHS = [480, 768, 1080, 1600, 2000];
const PROJECTS_DIR = join(process.cwd(), 'public', 'images', 'projects');
const MEDIA_CONFIG_PATH = join(process.cwd(), 'src/config/media.v1.json');

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

/**
 * Generate image variants (WebP, AVIF, thumbnail, blur)
 */
async function generateVariants(
  buffer: Buffer,
  folderName: string,
  baseName: string,
  outputDir: string
): Promise<{
  variants: { width: number; format: string; src: string }[];
  thumbnail: string;
  blurDataURL: string;
}> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width || 1920;
  const height = metadata.height || 1080;
  
  const variants: { width: number; format: string; src: string }[] = [];
  const validWidths = WIDTHS.filter((w) => w <= width);
  if (!validWidths.length) validWidths.push(width);
  
  // Generate WebP and AVIF variants at multiple widths
  for (const vw of validWidths) {
    for (const fmt of ['avif', 'webp']) {
      const outName = `${baseName}-${vw}.${fmt}`;
      const outPath = join(outputDir, outName);
      
      console.log('[MEDIA_INGEST] variant generation started', {
        variant: outName,
        width: vw,
        format: fmt,
      });
      
      await sharp(buffer)
        .resize({ width: vw, withoutEnlargement: true })
        [fmt === 'avif' ? 'avif' : 'webp']({ quality: fmt === 'avif' ? 55 : 72 })
        .toFile(outPath);
      
      // Verify file was created
      if (!existsSync(outPath)) {
        throw new Error(`Failed to create variant: ${outName}`);
      }
      
      const stats = await import('fs/promises').then(fs => fs.stat(outPath));
      if (stats.size === 0) {
        throw new Error(`Variant file is empty: ${outName}`);
      }
      
      console.log('[MEDIA_INGEST] variant completed', {
        variant: outName,
        bytes: stats.size,
      });
      
      variants.push({
        width: vw,
        format: fmt,
        src: `/images/projects/${folderName}/${outName}`,
      });
    }
  }
  
  // Generate thumbnail
  const thumbName = `${baseName}-thumb.webp`;
  const thumbPath = join(outputDir, thumbName);
  
  console.log('[MEDIA_INGEST] variant generation started', {
    variant: thumbName,
    width: 480,
    format: 'webp',
  });
  
  await sharp(buffer).resize(480).webp({ quality: 70 }).toFile(thumbPath);
  
  if (!existsSync(thumbPath)) {
    throw new Error(`Failed to create thumbnail: ${thumbName}`);
  }
  
  // Generate blur placeholder
  const blurBuf = await sharp(buffer).resize(16).webp({ quality: 40 }).toBuffer();
  const blurDataURL = `data:image/webp;base64,${blurBuf.toString('base64')}`;
  
  console.log('[MEDIA_INGEST] variant completed', {
    variant: thumbName,
    blurLength: blurBuf.length,
  });
  
  return {
    variants,
    thumbnail: `/images/projects/${folderName}/${thumbName}`,
    blurDataURL,
  };
}

export async function POST(request: Request) {
  console.log('[MEDIA_INGEST] request started');
  console.log('[MEDIA_INGEST] environment detection', {
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
    vercelUrl: process.env.VERCEL_URL,
    isVercel: !!process.env.VERCEL,
    cwd: process.cwd(),
    projectsDir: PROJECTS_DIR,
    mediaConfigPath: MEDIA_CONFIG_PATH,
  });
  
  // WARNING: Vercel filesystem is ephemeral
  if (process.env.VERCEL) {
    console.log('[MEDIA_INGEST] CRITICAL: Running on Vercel');
    console.log('[MEDIA_INGEST] CRITICAL: Filesystem writes are ephemeral and do not persist across deployments');
    console.log('[MEDIA_INGEST] CRITICAL: Media files will be lost when the function container is recycled');
    console.log('[MEDIA_INGEST] CRITICAL: media.v1.json is part of git repository and cannot be reliably mutated in production');
    console.log('[MEDIA_INGEST] CRITICAL: This architecture requires a persistent storage solution (Vercel Blob, S3, or similar)');
    
    // Return clear error about storage architecture
    return NextResponse.json(
      { 
        error: 'STORAGE_ARCHITECTURE_ERROR', 
        stage: 'architecture', 
        message: 'Serverless deployment cannot reliably persist media files to filesystem.',
        retryable: false,
        details: 'Running on Vercel: filesystem writes are ephemeral. Media requires persistent storage (Vercel Blob, S3, etc).'
      },
      { status: 503 }
    );
  }

  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[MEDIA_INGEST] development mode - skipping auth');
  } else {
    // Check Drive authentication
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    if (!isDriveAuthenticated) {
      console.log('[MEDIA_INGEST_ERROR] Drive authentication required');
      return NextResponse.json(
        { error: 'DRIVE_AUTH_REQUIRED', stage: 'auth', message: 'Drive authentication required', retryable: false },
        { status: 401 }
      );
    }

    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      console.log('[MEDIA_INGEST_ERROR] Workbench authentication required');
      return NextResponse.json(
        { error: 'WORKBENCH_AUTH_REQUIRED', stage: 'auth', message: 'Workbench authentication required', retryable: false },
        { status: 401 }
      );
    }
  }

  try {
    const body: IngestRequest = await request.json();
    const { driveId, driveIdParameter, projectId, roles = ['gallery'] } = body;

    console.log('[MEDIA_INGEST] source: drive');
    console.log('[MEDIA_INGEST] driveFileId:', driveId);
    console.log('[MEDIA_INGEST] sharedDrive:', !!driveIdParameter);
    console.log('[MEDIA_INGEST] sharedDriveId:', driveIdParameter || 'none');
    console.log('[MEDIA_INGEST] projectId:', projectId || 'none');
    console.log('[MEDIA_INGEST] roles:', roles);

    if (!driveId) {
      console.log('[MEDIA_INGEST_ERROR] driveId is required');
      return NextResponse.json(
        { error: 'DRIVE_ID_REQUIRED', stage: 'validation', message: 'driveId is required', retryable: false },
        { status: 400 }
      );
    }

    // 1. Get Drive file metadata
    console.log('[MEDIA_INGEST] metadata fetch started');
    const driveFile = await driveDiscovery.getFile(driveId, driveIdParameter);
    if (!driveFile) {
      console.log('[MEDIA_INGEST_ERROR] File not found in Drive');
      return NextResponse.json(
        { error: 'FILE_NOT_FOUND', stage: 'metadata', message: 'File not found in Drive', retryable: false },
        { status: 404 }
      );
    }
    console.log('[MEDIA_INGEST] metadata fetch succeeded');
    console.log('[MEDIA_INGEST] driveName:', driveFile.name);
    console.log('[MEDIA_INGEST] mimeType:', driveFile.mimeType);
    console.log('[MEDIA_INGEST] size:', driveFile.size || 'unknown');

    // 2. Download file content from Drive
    console.log('[MEDIA_INGEST] download started');
    let fileBuffer: Buffer;
    try {
      fileBuffer = await driveDiscovery.downloadFile(driveId, driveIdParameter);
      console.log('[MEDIA_INGEST] download succeeded');
      console.log('[MEDIA_INGEST] bytes:', fileBuffer.length);
    } catch (error) {
      console.log('[MEDIA_INGEST_ERROR] download failed');
      console.error('[MEDIA_INGEST_ERROR] download error:', error);
      return NextResponse.json(
        { 
          error: 'DRIVE_DOWNLOAD_FAILED', 
          stage: 'download', 
          message: 'Unable to download the selected Drive file.',
          retryable: true,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // 3. Validate image
    console.log('[MEDIA_INGEST] image validation started');
    try {
      const metadata = await sharp(fileBuffer).metadata();
      console.log('[MEDIA_INGEST] image metadata:', {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        orientation: metadata.orientation,
      });
      
      if (!metadata.width || !metadata.height) {
        throw new Error('Invalid image dimensions');
      }
      console.log('[MEDIA_INGEST] image validation succeeded');
    } catch (error) {
      console.log('[MEDIA_INGEST_ERROR] image validation failed');
      console.error('[MEDIA_INGEST_ERROR] validation error:', error);
      return NextResponse.json(
        { 
          error: 'IMAGE_VALIDATION_FAILED', 
          stage: 'validation', 
          message: 'The selected file is not a valid image or is corrupted.',
          retryable: false,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 400 }
      );
    }

    // 4. Compute content hash for stable identity
    console.log('[MEDIA_INGEST] hash started');
    const contentHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
    console.log('[MEDIA_INGEST] hash completed');
    console.log('[MEDIA_INGEST] hash:', contentHash.substring(0, 16) + '...');
    
    // 5. Generate stable identifiers
    const baseName = driveFile.name.replace(/\.[^/.]+$/, '').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const folderName = `drive-${baseName.substring(0, 20)}`; // Folder name from base name
    const stableId = generateStableId(contentHash, baseName);
    const uuid = generateUUIDv5(contentHash);
    const mediaId = `drive-${stableId}`;

    // 6. Check for existing record with matching content hash (deduplication)
    const mediaData = JSON.parse(readFileSync(MEDIA_CONFIG_PATH, 'utf-8'));
    const existingByHash = mediaData.media.find((m: Media) => 
      m.contentHash === contentHash || m.id === mediaId
    );

    if (existingByHash) {
      console.log('[MEDIA_INGEST] duplicate detected - returning existing record');
      return NextResponse.json({
        success: true,
        media: existingByHash,
        action: 'existing',
        message: 'Media already exists with same content',
      });
    }

    // 7. Generate output directory
    const outputDir = join(PROJECTS_DIR, folderName);
    console.log('[MEDIA_INGEST] filesystem operation started', {
      operation: 'create directory',
      path: outputDir,
      exists: existsSync(outputDir),
    });
    
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
      console.log('[MEDIA_INGEST] directory created', { path: outputDir });
    } else {
      console.log('[MEDIA_INGEST] directory already exists', { path: outputDir });
    }

    // 8. Save original asset
    const originalExt = driveFile.name.split('.').pop() || 'jpg';
    const originalPath = join(outputDir, `${baseName}-original.${originalExt}`);
    
    console.log('[MEDIA_INGEST] filesystem operation started', {
      operation: 'write original',
      path: originalPath,
      bytes: fileBuffer.length,
    });
    
    writeFileSync(originalPath, fileBuffer);
    
    // Verify original was written
    const originalExists = existsSync(originalPath);
    const originalStats = originalExists ? await import('fs/promises').then(fs => fs.stat(originalPath)) : null;
    
    console.log('[MEDIA_INGEST] original persisted', {
      path: originalPath,
      exists: originalExists,
      size: originalStats?.size || 0,
      success: originalExists && originalStats?.size === fileBuffer.length,
    });
    
    if (!originalExists || originalStats?.size !== fileBuffer.length) {
      console.log('[MEDIA_INGEST_ERROR] original asset verification failed');
      return NextResponse.json(
        { 
          error: 'ORIGINAL_PERSISTENCE_FAILED', 
          stage: 'storage', 
          message: 'Failed to persist original asset to filesystem.',
          retryable: false,
          details: `exists=${originalExists}, expected=${fileBuffer.length}, actual=${originalStats?.size || 0}`
        },
        { status: 500 }
      );
    }

    // 9. Generate variants
    console.log('[MEDIA_INGEST] variant generation started');
    const { variants, thumbnail, blurDataURL } = await generateVariants(fileBuffer, folderName, baseName, outputDir);
    console.log('[MEDIA_INGEST] variant generation completed');
    console.log('[MEDIA_INGEST] variants generated:', variants.length);

    // Verify all variants can be read back
    console.log('[MEDIA_INGEST] filesystem verification started');
    const variantVerification = [];
    for (const variant of variants) {
      const variantPath = join(outputDir, variant.src.split('/').pop()!);
      const exists = existsSync(variantPath);
      const stats = exists ? await import('fs/promises').then(fs => fs.stat(variantPath)) : null;
      variantVerification.push({
        variant: variant.src,
        exists,
        size: stats?.size || 0,
        readable: (stats?.size || 0) > 0,
      });
    }
    
    const thumbnailPath = join(outputDir, thumbnail.split('/').pop()!);
    const thumbnailExists = existsSync(thumbnailPath);
    const thumbnailStats = thumbnailExists ? await import('fs/promises').then(fs => fs.stat(thumbnailPath)) : null;
    
    console.log('[MEDIA_INGEST] filesystem verification results', {
      variants: variantVerification,
      thumbnail: {
        path: thumbnail,
        exists: thumbnailExists,
        size: thumbnailStats?.size || 0,
      },
      allReadable: variantVerification.every(v => v.readable) && (thumbnailStats?.size || 0) > 0,
    });
    
    if (!variantVerification.every(v => v.readable) || (thumbnailStats?.size || 0) === 0) {
      console.log('[MEDIA_INGEST_ERROR] variant verification failed');
      return NextResponse.json(
        { 
          error: 'VARIANT_VERIFICATION_FAILED', 
          stage: 'storage', 
          message: 'Generated variants could not be read back from filesystem.',
          retryable: false,
          details: variantVerification
        },
        { status: 500 }
      );
    }

    // 10. Get image metadata
    const metadata = await sharp(fileBuffer).metadata();
    const orientation = determineOrientation(metadata.width || 1920, metadata.height || 1080);

    // 11. Create full Media record
    const webpVariant = variants.find((v) => v.format === 'webp');
    const avifVariant = variants.find((v) => v.format === 'avif');
    
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
        original: `/images/projects/${folderName}/${baseName}-original.${originalExt}`,
        web: webpVariant?.src || '',
        webp: webpVariant?.src || '',
        avif: avifVariant?.src || '',
        thumbnail,
        blur: blurDataURL,
      },
      alt: driveFile.name,
      description: driveFile.description,
      projectId,
      tags: [],
      roles,
      order: mediaData.media.length,
      createdAt: driveFile.createdTime,
      updatedAt: driveFile.modifiedTime,
      uploadedAt: new Date().toISOString(),
      fileSize: driveFile.size || fileBuffer.length,
      format: metadata.format || 'WEBP',
      colorSpace: metadata.space || 'sRGB',
      provenance: {
        drive_canonical: true,
        current_authority: true,
        status: 'ingested',
        preserved_at: new Date().toISOString(),
      },
    };

    console.log('[MEDIA_INGEST] media record created');

    // 12. Update media.v1.json
    console.log('[MEDIA_INGEST] filesystem operation started', {
      operation: 'write media.v1.json',
      path: MEDIA_CONFIG_PATH,
      exists: existsSync(MEDIA_CONFIG_PATH),
      currentMediaCount: mediaData.media.length,
    });
    
    try {
      mediaData.media.push(mediaRecord);
      mediaData.generatedAt = new Date().toISOString();
      writeFileSync(MEDIA_CONFIG_PATH, JSON.stringify(mediaData, null, 2));
      
      // Verify write succeeded
      const writeExists = existsSync(MEDIA_CONFIG_PATH);
      const writeContent = writeExists ? readFileSync(MEDIA_CONFIG_PATH, 'utf-8') : null;
      const writeParsed = writeContent ? JSON.parse(writeContent) : null;
      const recordExists = writeParsed?.media?.find((m: Media) => m.id === mediaId);
      
      console.log('[MEDIA_INGEST] media record verified', {
        path: MEDIA_CONFIG_PATH,
        exists: writeExists,
        recordFound: !!recordExists,
        recordId: recordExists?.id,
        totalRecords: writeParsed?.media?.length,
      });
      
      if (!writeExists || !recordExists) {
        console.log('[MEDIA_INGEST_ERROR] media.v1.json verification failed');
        return NextResponse.json(
          { 
            error: 'MEDIA_PERSISTENCE_FAILED', 
            stage: 'storage', 
            message: 'Failed to persist media record to media.v1.json.',
            retryable: false,
            details: `exists=${writeExists}, recordFound=${!!recordExists}`
          },
          { status: 500 }
        );
      }
    } catch (error) {
      console.log('[MEDIA_INGEST_ERROR] media.v1.json write failed');
      console.error('[MEDIA_INGEST_ERROR]', error);
      return NextResponse.json(
        { 
          error: 'MEDIA_WRITE_FAILED', 
          stage: 'storage', 
          message: 'Failed to write media.v1.json.',
          retryable: false,
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    console.log('[MEDIA_INGEST] ingestion complete');
    return NextResponse.json({
      success: true,
      media: mediaRecord,
      action: 'created',
    });
  } catch (error) {
    console.log('[MEDIA_INGEST_ERROR] unexpected error');
    console.error('[MEDIA_INGEST_ERROR]', error);
    return NextResponse.json(
      {
        error: 'INGESTION_FAILED',
        stage: 'unknown',
        message: 'An unexpected error occurred during ingestion.',
        retryable: false,
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
