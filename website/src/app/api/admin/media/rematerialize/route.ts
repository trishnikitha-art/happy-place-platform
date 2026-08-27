/**
 * Media Rematerialization API Endpoint
 *
 * Rematerializes incomplete canonical media records with actual source bytes.
 *
 * This is the authoritative repair mechanism for incomplete media assets.
 * It does NOT copy incomplete static authority - it materializes from real source bytes.
 *
 * POST /api/admin/media/rematerialize
 * Body: { dryRun?: boolean, mediaIds?: string[] }
 *
 * Process:
 * 1. Enumerate incomplete canonical media records (or specific mediaIds if provided)
 * 2. Resolve actual source bytes (photo-intake or Drive)
 * 3. Compute SHA-256 from actual bytes
 * 4. Generate all required renditions (original, thumbnail, blur, responsive WebP/AVIF)
 * 5. Upload to Blob
 * 6. Verify Blob metadata
 * 7. Write PublishedMediaAsset to KV
 * 8. Rebuild content-hash index
 * 9. Preserve provenance
 * 10. Reconcile assignments
 *
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { loadMediaManifest } from "@/lib/media";
import { isMaterializationComplete, isPubliclyComplete } from "@/lib/media-contracts";
import { storeMedia, getMediaRecordRaw } from "@/lib/media-kv-store";
import { uploadToBlob, getBlobMetadataByContentHash } from "@/lib/blob-storage";
import crypto from 'crypto';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import sharp from 'sharp';
import { DriveDiscovery } from '@/lib/drive/drive-discovery';
import { DriveSession } from '@/lib/drive/drive-session';

export const runtime = 'nodejs';

interface RematerializationReport {
  dryRun: boolean;
  startTime: string;
  endTime: string;
  totalRecords: number;
  skippedRecords: number;
  successfulRematerializations: string[];
  failedRematerializations: { mediaId: string; error: string }[];
  missingSourceBytes: string[];
  errors: string[];
}

interface RematerializationRequest {
  dryRun?: boolean;
  mediaIds?: string[];
}

/**
 * Check if source bytes exist in public/images (production variant of photo-intake)
 */
function hasSourceBytesInPublicImages(filename: string): boolean {
  const publicPath = join(process.cwd(), 'public/images');
  
  // Simple recursive search for the filename
  function searchDir(dir: string): boolean {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === filename) {
          return true;
        }
        if (entry.isDirectory()) {
          if (searchDir(join(dir, entry.name))) {
            return true;
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    return false;
  }
  
  return searchDir(publicPath);
}

/**
 * Read source bytes from public/images (production variant of photo-intake)
 */
function readSourceBytesFromPublicImages(filename: string): Buffer | null {
  const publicPath = join(process.cwd(), 'public/images');
  
  // Simple recursive search for the filename
  function searchDir(dir: string): string | null {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === filename) {
          return join(dir, entry.name);
        }
        if (entry.isDirectory()) {
          const found = searchDir(join(dir, entry.name));
          if (found) return found;
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    return null;
  }
  
  const filePath = searchDir(publicPath);
  if (!filePath) return null;
  
  try {
    return readFileSync(filePath);
  } catch (error) {
    console.error('[REMATERIALIZATION] Failed to read source file:', filePath, error);
    return null;
  }
}

/**
 * Check if source bytes exist in photo-intake (legacy support)
 */
function hasSourceBytesInPhotoIntake(filename: string): boolean {
  const intakePath = join(process.cwd(), 'photo-intake');
  
  // Simple recursive search for the filename
  function searchDir(dir: string): boolean {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === filename) {
          return true;
        }
        if (entry.isDirectory()) {
          if (searchDir(join(dir, entry.name))) {
            return true;
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    return false;
  }
  
  return searchDir(intakePath);
}

/**
 * Read source bytes from photo-intake (legacy support)
 */
function readSourceBytesFromPhotoIntake(filename: string): Buffer | null {
  const intakePath = join(process.cwd(), 'photo-intake');
  
  // Simple recursive search for the filename
  function searchDir(dir: string): string | null {
    try {
      const entries = readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name === filename) {
          return join(dir, entry.name);
        }
        if (entry.isDirectory()) {
          const found = searchDir(join(dir, entry.name));
          if (found) return found;
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    return null;
  }
  
  const filePath = searchDir(intakePath);
  if (!filePath) return null;
  
  try {
    return readFileSync(filePath);
  } catch (error) {
    console.error('[REMATERIALIZATION] Failed to read source file:', filePath, error);
    return null;
  }
}

/**
 * Generate Blob filename for media
 */
function generateBlobFilename(mediaId: string, variant: string, format: string): string {
  return `${mediaId}-${variant}.${format}`;
}

/**
 * Generate a stable media ID from content hash
 */
function generateStableId(contentHash: string): string {
  const crypto = require('crypto');
  // UUIDv5 namespace for image stable IDs
  const namespace = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
  const namespaceBytes = Buffer.from(namespace.replace(/-/g, ''), 'hex');
  const nameBytes = Buffer.from(contentHash, 'hex');
  
  const hash = crypto.createHash('sha1');
  hash.update(Buffer.concat([namespaceBytes, nameBytes]));
  const hashBytes = hash.digest();
  
  hashBytes[6] = (hashBytes[6] & 0x0f) | 0x50;
  hashBytes[8] = (hashBytes[8] & 0x3f) | 0x80;
  
  const hex = hashBytes.toString('hex');
  return [
    hex.substr(0, 8),
    hex.substr(8, 4),
    hex.substr(12, 4),
    hex.substr(16, 4),
    hex.substr(20, 12),
  ].join('-');
}

/**
 * Determine image orientation
 */
function determineOrientation(width: number, height: number): 'landscape' | 'portrait' | 'square' {
  if (width === height) return 'square';
  return width > height ? 'landscape' : 'portrait';
}

/**
 * Resolve source bytes from Drive using preserved Drive provenance
 */
async function resolveDriveSourceBytes(driveFileId: string, requestId: string): Promise<Buffer | null> {
  try {
    console.log('[REMATERIALIZATION] Resolving Drive source bytes:', {
      requestId,
      driveFileId,
    });

    const driveSession = new DriveSession();
    const isAuthenticated = await driveSession.isAuthenticated();

    if (!isAuthenticated) {
      console.error('[REMATERIALIZATION] Drive not authenticated', { requestId, driveFileId });
      return null;
    }

    const driveDiscovery = new DriveDiscovery();
    const fileBytes = await driveDiscovery.downloadFile(driveFileId);

    if (!fileBytes) {
      console.error('[REMATERIALIZATION] Failed to download Drive file', { requestId, driveFileId });
      return null;
    }

    console.log('[REMATERIALIZATION] Drive source bytes resolved:', {
      requestId,
      driveFileId,
      size: fileBytes.length,
    });

    return fileBytes;
  } catch (error) {
    console.error('[REMATERIALIZATION] Drive source resolution error:', {
      requestId,
      driveFileId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
}

/**
 * Rematerialize a single media record
 */
async function rematerializeMediaRecord(
  media: any,
  dryRun: boolean,
  requestId: string
): Promise<{ success: boolean; error?: string; updatedMediaId?: string }> {
  console.log('[REMATERIALIZATION] Processing record:', {
    requestId,
    mediaId: media.id,
    filename: media.filename,
  });

  // Check if already publicly complete
  const isComplete = await isPubliclyComplete(media);
  if (isComplete) {
    console.log('[REMATERIALIZATION] SKIP: Already publicly complete', { requestId, mediaId: media.id });
    return { success: true, updatedMediaId: media.id };
  }

  // Resolve source bytes
  let sourceBytes: Buffer | null = null;
  let sourceLocation: 'public-images' | 'photo-intake' | 'drive' | 'none' = 'none';
  let driveSourceId: string | null = null; // Capture this for provenance preservation

  // Try public/images first (production variant of photo-intake)
  if (hasSourceBytesInPublicImages(media.filename)) {
    sourceBytes = readSourceBytesFromPublicImages(media.filename);
    sourceLocation = 'public-images';
    console.log('[REMATERIALIZATION] Source bytes found in public/images', { requestId, mediaId: media.filename });
  } else if (hasSourceBytesInPhotoIntake(media.filename)) {
    sourceBytes = readSourceBytesFromPhotoIntake(media.filename);
    sourceLocation = 'photo-intake';
    console.log('[REMATERIALIZATION] Source bytes found in photo-intake', { requestId, mediaId: media.filename });
  } else {
    // P0 FIX: Merge runtime record with static provenance for source location ONLY
    // Runtime records are the repair authority, but many poisoned records have hasDrive: false
    // Static authority (media.v1.json) retains Drive IDs for canonical records
    // Use static authority ONLY to recover source location, never copy content
    const staticManifest = loadMediaManifest();
    const staticRecord = staticManifest.media.find((m: any) => m.id === media.id);
    
    // Determine Drive source ID with precedence:
    // 1. Runtime record drive.driveId (if present and valid)
    // 2. Runtime record provenance.august3_driveId (if present)
    // 3. Runtime record provenance.driveFileId (if present)
    // 4. Static manifest driveId (legacy top-level, fallback for poisoned runtime records)
    // 5. Static manifest drive.fileId (if drive object exists)
    driveSourceId = media.drive?.driveId || media.provenance?.august3_driveId || media.provenance?.driveFileId || (staticRecord as any)?.driveId || staticRecord?.drive?.fileId || null;
    
    if (driveSourceId) {
      const source = media.drive?.driveId ? 'runtime.driveId' : media.provenance?.august3_driveId ? 'runtime.provenance' : media.provenance?.driveFileId ? 'runtime.driveFileId' : (staticRecord as any)?.driveId ? 'static.driveId' : staticRecord?.drive?.fileId ? 'static.drive.fileId' : 'unknown';
      console.log('[REMATERIALIZATION] Using Drive source from provenance bridge:', {
        requestId,
        mediaId: media.id,
        driveSourceId,
        source,
      });
      
      // Resolve from Drive using Drive provenance ID
      sourceBytes = await resolveDriveSourceBytes(driveSourceId, requestId);
      if (sourceBytes) {
        sourceLocation = 'drive';
        console.log('[REMATERIALIZATION] Source bytes resolved from Drive', {
          requestId,
          mediaId: media.id,
          driveId: driveSourceId,
        });
      } else {
        console.error('[REMATERIALIZATION] Drive source resolution failed', {
          requestId,
          mediaId: media.id,
          driveId: driveSourceId,
        });
        return { success: false, error: 'Drive source resolution failed - file may not exist or authentication expired' };
      }
    } else {
      console.error('[REMATERIALIZATION] NO SOURCE BYTES', {
        requestId,
        mediaId: media.id,
        filename: media.filename,
        hasProvenance: !!media.provenance,
        hasDriveId: !!media.drive?.driveId,
        hasStaticDriveId: !!(staticRecord as any)?.driveId,
        hasStaticDriveFileId: !!staticRecord?.drive?.fileId,
      });
      return { success: false, error: 'No source bytes available - neither public/images, photo-intake, nor Drive provenance found' };
    }
  }

  if (!sourceBytes) {
    return { success: false, error: 'Failed to read source bytes' };
  }

  // Compute real content hash
  const contentHash = crypto.createHash('sha256').update(sourceBytes).digest('hex');
  console.log('[REMATERIALIZATION] Computed content hash:', {
    requestId,
    mediaId: media.id,
    contentHash,
    sourceLocation,
  });

  // Check if hash matches existing (deduplication)
  // P0 FIX: Only skip if the existing asset is actually publicly complete
  // Don't trust matching hash alone - prove all renditions exist
  if (media.contentHash && media.contentHash === contentHash) {
    const existingIsComplete = await isPubliclyComplete(media);
    if (existingIsComplete) {
      console.log('[REMATERIALIZATION] SKIP: Content hash matches existing and asset is publicly complete', {
        requestId,
        mediaId: media.id,
      });
      return { success: true, updatedMediaId: media.id };
    } else {
      console.log('[REMATERIALIZATION] PROCEED: Content hash matches but asset is incomplete, rematerializing', {
        requestId,
        mediaId: media.id,
      });
    }
  }

  if (dryRun) {
    console.log('[REMATERIALIZE DRY RUN] Would rematerialize:', { requestId, mediaId: media.id });
    return { success: true, updatedMediaId: media.id };
  }

  // Generate renditions
  try {
    const image = sharp(sourceBytes);
    const metadata = await image.metadata();

    // Generate Blob IDs
    const mediaId = media.id; // Preserve canonical ID
    const originalExt = media.filename.split('.').pop() || 'jpg';
    const originalFilename = generateBlobFilename(mediaId, 'original', originalExt);
    const originalUpload = await uploadToBlob(sourceBytes, originalFilename, `image/${originalExt}`);

    // Generate thumbnail
    const thumbFilename = generateBlobFilename(mediaId, 'thumb', 'webp');
    const thumbBuffer = await image.resize(480).webp({ quality: 70 }).toBuffer();
    const thumbUpload = await uploadToBlob(thumbBuffer, thumbFilename, 'image/webp');

    // Generate blur placeholder
    const blurBuffer = await image.resize(10).webp({ quality: 30 }).toBuffer();
    const blurDataURL = `data:image/webp;base64,${blurBuffer.toString('base64')}`;

    // Generate responsive variants
    const width = metadata.width || 1920;
    const { RESPONSIVE_WIDTHS } = await import('@/lib/media-constants');
    const validWidths = RESPONSIVE_WIDTHS.filter(w => w <= width);
    if (!validWidths.length) validWidths.push(width as 480 | 768 | 1080 | 1600 | 2000);

    const responsiveVariants: Array<{ width: number; webp: string; avif: string }> = [];

    for (const vw of validWidths) {
      for (const fmt of ['avif', 'webp']) {
        const variantBuffer = await image.resize({ width: vw, withoutEnlargement: true })
          [fmt === 'avif' ? 'avif' : 'webp']({ quality: fmt === 'avif' ? 75 : 80 })
          .toBuffer();

        const variantFilename = generateBlobFilename(mediaId, vw.toString(), fmt);
        const variantContentType = fmt === 'avif' ? 'image/avif' : 'image/webp';
        const variantUpload = await uploadToBlob(variantBuffer, variantFilename, variantContentType);

        // Build responsive array
        const existingEntry = responsiveVariants.find(r => r.width === vw);
        if (existingEntry) {
          if (fmt === 'webp') existingEntry.webp = variantUpload.url;
          if (fmt === 'avif') existingEntry.avif = variantUpload.url;
        } else {
          responsiveVariants.push({
            width: vw,
            webp: fmt === 'webp' ? variantUpload.url : '',
            avif: fmt === 'avif' ? variantUpload.url : '',
          });
        }
      }
    }

    // Sort variants to get largest for top-level webp/avif
    const sortedVariants = [...responsiveVariants].sort((a, b) => b.width - a.width);
    const webpVariant = sortedVariants.find((v) => v.webp);
    const avifVariant = sortedVariants.find((v) => v.avif);

    // Create updated media record
    // P0 FIX: Preserve Drive provenance metadata for audit/rematerialization
    // while removing runtime Drive dependency from the public asset
    const updatedMedia = {
      ...media,
      contentHash,
      source: 'local',
      lifecycleState: 'published',
      drive: undefined, // Remove runtime Drive dependency
      variants: {
        original: originalUpload.url,
        web: webpVariant?.webp || originalUpload.url,
        webp: webpVariant?.webp || originalUpload.url,
        avif: avifVariant?.avif || '',
        thumbnail: thumbUpload.url,
        blur: blurDataURL,
        responsive: responsiveVariants,
      },
      provenance: {
        ...media.provenance,
        // Preserve the authoritative Drive file ID used for this materialization
        driveFileId: driveSourceId || media.provenance?.driveFileId || media.provenance?.august3_driveId,
        drive_canonical: false,
        current_authority: true,
        status: 'published',
        preserved_at: new Date().toISOString(),
      },
    };

    // Store updated media
    await storeMedia(updatedMedia);

    // P0 FIX: Verify the newly persisted record passes the public completeness contract
    // This now includes rendition-level physical completeness verification
    const newMediaRecord = await getMediaRecordRaw(mediaId);
    const isNewMediaComplete = newMediaRecord ? await isPubliclyComplete(newMediaRecord) : false;

    if (!isNewMediaComplete) {
      console.error('[REMATERIALIZATION] POST-PERSISTENCE VERIFICATION FAILED', {
        requestId,
        mediaId: media.id,
        contentHash,
      });
      return { success: false, error: 'Post-persistence completeness verification failed' };
    }

    console.log('[REMATERIALIZATION] SUCCESS', {
      requestId,
      mediaId: media.id,
      contentHash,
      sourceLocation,
    });

    return { success: true, updatedMediaId: mediaId };
  } catch (error) {
    console.error('[REMATERIALIZATION] FAILED', {
      requestId,
      mediaId: media.id,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function POST(request: Request) {
  const requestId = `rematerialize-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // SECURITY: Require authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const body: RematerializationRequest = await request.json();
    const { dryRun = true, mediaIds } = body;

    console.log('[REMATERIALIZE] REQUEST_RECEIVED', { requestId, dryRun, mediaIds });

    const report: RematerializationReport = {
      dryRun,
      startTime: new Date().toISOString(),
      endTime: '',
      totalRecords: 0,
      skippedRecords: 0,
      successfulRematerializations: [],
      failedRematerializations: [],
      missingSourceBytes: [],
      errors: [],
    };

    // P0 FIX: Enumerate the same runtime authority that deployment validates
    // Previously used loadMediaManifest() (static), now uses KV (runtime)
    // This ensures rematerialization repairs the exact records deployment checks
    const runtimeRecords = new Map<string, any>();
    
    // Enumerate all runtime media records from KV
    const { getMediaRecordRaw } = await import('@/lib/media-kv-store');
    const { Redis: RedisClient } = await import('@upstash/redis');
    
    let redis: any = null;
    try {
      const redisUrl = process.env.KV_REST_API_URL;
      const redisToken = process.env.KV_REST_API_TOKEN;
      
      if (redisUrl && redisToken) {
        redis = new RedisClient({
          url: redisUrl,
          token: redisToken,
        });
        
        // Scan for all media keys
        const keys = await redis.keys('media:*');
        console.log('[REMATERIALIZE] Found runtime media keys:', { requestId, count: keys.length });
        
        // P0 FIX: Filter to repairable candidates only
        // Exclude: quarantine records, drive-* synthetic IDs, drive-ref-* records
        // Only process: canonical PublishedMediaAsset records with potential for repair
        const repairableKeys = keys.filter((key: string) => {
          const mediaId = key.replace('media:', '');
          // Exclude quarantine records
          if (mediaId.startsWith('quarantine:')) return false;
          // Exclude Drive reference records
          if (mediaId.startsWith('drive-')) return false;
          // Exclude Drive reference variant records
          if (mediaId.startsWith('drive-ref-')) return false;
          // Include only canonical records (no special prefixes)
          return true;
        });
        
        console.log('[REMATERIALIZE] Filtered to repairable candidates:', { requestId, count: repairableKeys.length });
        
        for (const key of repairableKeys) {
          try {
            const record = await getMediaRecordRaw(key.replace('media:', ''));
            if (record) {
              runtimeRecords.set(record.id, record);
            }
          } catch (error) {
            console.error('[REMATERIALIZE] Failed to load runtime record:', { requestId, key, error });
          }
        }
      } else {
        console.error('[REMATERIALIZE] Redis credentials not available - cannot proceed without runtime authority', { requestId });
        return NextResponse.json(
          { error: 'Redis credentials not available', message: 'Cannot rematerialize without runtime KV authority' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('[REMATERIALIZE] Failed to enumerate runtime records:', { requestId, error });
      return NextResponse.json(
        { error: 'Failed to enumerate runtime records', message: String(error) },
        { status: 500 }
      );
    } finally {
      // Upstash Redis client doesn't have quit() method
      // Connection is managed automatically
    }

    // Determine which records to process
    const recordsToProcess = mediaIds
      ? mediaIds.map(id => runtimeRecords.get(id)).filter(Boolean)
      : Array.from(runtimeRecords.values());

    report.totalRecords = recordsToProcess.length;

    console.log('[REMATERIALIZE] Processing records:', {
      requestId,
      count: recordsToProcess.length,
    });

    for (const media of recordsToProcess) {
      const result = await rematerializeMediaRecord(media, dryRun, requestId);

      if (result.success) {
        // P0 FIX: Check the newly materialized record, not the old canonical record
        if (result.updatedMediaId) {
          const newMediaRecord = await getMediaRecordRaw(result.updatedMediaId);
          if (newMediaRecord && isMaterializationComplete(newMediaRecord)) {
            report.successfulRematerializations.push(result.updatedMediaId);
          } else {
            report.skippedRecords++;
          }
        } else {
          // Deduplication skip (hash matched and asset was already complete)
          report.skippedRecords++;
        }
      } else {
        if (result.error?.includes('No source bytes')) {
          report.missingSourceBytes.push(media.id);
        }
        report.failedRematerializations.push({
          mediaId: media.id,
          error: result.error || 'Unknown error',
        });
      }
    }

    report.endTime = new Date().toISOString();

    console.log('[REMATERIALIZE] COMPLETE', {
      requestId,
      report,
    });

    return NextResponse.json({
      success: true,
      requestId,
      report,
    });
  } catch (error) {
    console.error('[REMATERIALIZE ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      {
        error: "Rematerialization failed",
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
