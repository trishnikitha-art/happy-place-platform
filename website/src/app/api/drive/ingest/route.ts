/**
 * Drive Media Ingestion API Route
 *
 * MATERIALIZATION PATH: DriveReference → PublishedMediaAsset
 *
 * This is the constitutional materialization operation that converts Drive source
 * into a PublishedMediaAsset that can cross the public boundary.
 *
 * SECURITY: Application-level Drive authorization
 * - Google OAuth authentication is NOT sufficient for HPP authorization
 * - Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
 * - Prevents IDOR/cross-user access even when Google technically permits the object
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
 * Body: { fileId: string, sharedDriveId?: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { storeMedia, findMediaByContentHash, getMedia, getMediaRecordRaw } from '@/lib/media-kv-store';
import crypto from 'crypto';
import type { Media, MediaRole } from '@/types/media';
import { RESPONSIVE_WIDTHS, THUMBNAIL_WIDTH, THUMBNAIL_QUALITY, WEBP_QUALITY, AVIF_QUALITY } from '@/lib/media-constants';
import { needsMaterialization, isPubliclyComplete } from '@/lib/media-contracts';
import { applyStateTransition, isValidTransition } from '@/lib/materialization-state-machine';
import { verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';

/**
 * Assignment reconciliation result
 */
interface ReconciliationResult {
  reconciled: boolean;
  updated: string[];
  error?: string;
  incomplete?: boolean; // P0 FIX: Signal when some assignments could not be reconciled due to media lookup failures
  repaired: boolean; // P0 FIX: Signal when poisoned PublishedMediaAsset records are repaired
  brokenAssignments?: Array<{serviceSlug: string, mediaId: string}>; // P0 FIX: Track assignments pointing to nonexistent media (circular dependency)
}

/**
 * Assignment reconciliation for Drive materialization
 * 
 * Updates assignments that reference Drive files to point to the newly materialized PublishedMediaAsset.
 * This is the constitutional bridge: DriveReference → PublishedMediaAsset → assignment update.
 * 
 * Uses CAS semantics to prevent lost updates and validates media resolution before assignment updates.
 * 
 * Constitutional Rule: Drive file ID → explicit authorized DriveReference → explicit
 * assignment relationship → CAS mutation. Only updates assignments that explicitly reference this Drive file.
 * 
 * LIMITATION: drive-ref- reconciliation is not yet implemented correctly.
 * drive-ref- IDs are based on Drive identity (fileId + sharedDriveId), not content hash.
 * Current implementation only reconciles exact drive-<fileId> references to avoid updating unrelated assignments.
 * Full drive-ref- reconciliation requires passing sharedDriveId context and reconstructing the Drive identity hash.
 */
async function reconcileDriveAssignments(
  publishedMediaId: string,
  driveFileId: string,
  contentHash: string,
  requestId: string
): Promise<ReconciliationResult> {
  console.log('[ASSIGNMENT_RECONCILIATION] Starting reconciliation', {
    requestId,
    driveFileId,
    publishedMediaId,
    contentHash: contentHash.substring(0, 16) + '...',
  });

  try {
    // Import assignment store functions
    const { 
      getAllServiceCardAssignments, 
      storeServiceCardAssignment, 
      getServiceCardAssignment 
    } = await import('@/lib/assignment-store');

    // Get all current assignments to find Drive references
    const allAssignments = await getAllServiceCardAssignments();
    
    // Find assignments that reference this specific Drive file
    // Check for both drive-<fileId> and drive-ref-<hash> patterns
    // CRITICAL: drive-ref-<hash> uses Drive identity hash (fileId + sharedDriveId), not content hash
    // We need to construct the same hash to match references
    const exactFilePattern = new RegExp(`^drive-${driveFileId}$`);
    const assignmentsToUpdate = allAssignments.filter(assignment => {
      // Match exact drive-<fileId> references
      if (exactFilePattern.test(assignment.mediaId)) {
        return true;
      }
      // For drive-ref- references, we can't match without knowing the sharedDriveId context
      // The current logic is fundamentally flawed - we need Drive identity information
      // For now, only match exact drive-<fileId> references to avoid updating unrelated drive-ref-* assignments
      return false;
    });

    console.log('[ASSIGNMENT_RECONCILIATION] Found Drive-referenced assignments', {
      requestId,
      totalAssignments: allAssignments.length,
      driveRefAssignments: assignmentsToUpdate.length,
      driveFileId,
    });

    if (assignmentsToUpdate.length === 0) {
      console.log('[ASSIGNMENT_RECONCILIATION] No Drive-referenced assignments found', {
        requestId,
        driveFileId,
      });
      return {
        reconciled: false,
        updated: [],
        repaired: false,
        brokenAssignments: [],
      };
    }

    // Update each Drive-referenced assignment to point to the PublishedMediaAsset
    const updated: string[] = [];
    const brokenAssignments: Array<{serviceSlug: string, mediaId: string}> = [];

    for (const assignment of assignmentsToUpdate) {
      try {
        console.log('[ASSIGNMENT_RECONCILIATION] Updating assignment', {
          requestId,
          serviceSlug: assignment.serviceSlug,
          oldMediaId: assignment.mediaId,
          newMediaId: publishedMediaId,
        });

        // Get current assignment for CAS revision
        const currentAssignment = await getServiceCardAssignment(assignment.serviceSlug);
        if (!currentAssignment) {
          console.warn('[ASSIGNMENT_RECONCILIATION] Assignment not found during update', {
            requestId,
            serviceSlug: assignment.serviceSlug,
          });
          brokenAssignments.push({
            serviceSlug: assignment.serviceSlug,
            mediaId: assignment.mediaId,
          });
          continue;
        }

        // Create updated assignment with new mediaId
        const updatedAssignment = {
          ...currentAssignment,
          mediaId: publishedMediaId,
          updatedAt: new Date().toISOString(),
          actor: 'reconciliation' as const,
        };

        // Store with CAS semantics
        await storeServiceCardAssignment(
          updatedAssignment,
          currentAssignment.revision || 0,
          requestId
        );

        updated.push(assignment.serviceSlug);
        console.log('[ASSIGNMENT_RECONCILIATION] Assignment updated successfully', {
          requestId,
          serviceSlug: assignment.serviceSlug,
          oldMediaId: assignment.mediaId,
          newMediaId: publishedMediaId,
        });
      } catch (error) {
        console.error('[ASSIGNMENT_RECONCILIATION] Failed to update assignment', {
          requestId,
          serviceSlug: assignment.serviceSlug,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        brokenAssignments.push({
          serviceSlug: assignment.serviceSlug,
          mediaId: assignment.mediaId,
        });
      }
    }

    console.log('[ASSIGNMENT_RECONCILIATION] Reconciliation complete', {
      requestId,
      driveFileId,
      publishedMediaId,
      totalFound: assignmentsToUpdate.length,
      updated: updated.length,
      failed: brokenAssignments.length,
    });

    return {
      reconciled: updated.length > 0,
      updated,
      repaired: updated.length > 0,
      brokenAssignments,
    };
  } catch (error) {
    console.error('[ASSIGNMENT_RECONCILIATION] Reconciliation failed', {
      requestId,
      driveFileId,
      publishedMediaId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      reconciled: false,
      updated: [],
      repaired: false,
      brokenAssignments: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Import storage modules at top level (they are ES modules)
import { uploadToBlob, generateBlobFilename, getBlobMetadataByContentHash } from '@/lib/blob-storage';

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
  });
  // Sharp is required for constitutional media processing
  // The route will return SHARP_UNAVAILABLE and refuse materialization
  console.warn('[MEDIA_INGEST_FORENSIC] Sharp unavailable - materialization will be rejected');
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface IngestRequest {
  fileId: string;  // The Google Drive file ID to materialize
  sharedDriveId?: string;  // The Shared Drive ID (corpus context)
  projectId?: string;
  roles?: MediaRole[];
}

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

  try {
    const body: IngestRequest = await request.json();
    const { fileId, sharedDriveId, projectId, roles = ['gallery'] } = body;

    console.log('[MEDIA_INGEST] REQUEST stage succeeded', {
      requestId,
      source: 'drive',
      driveFileId: fileId,
      sharedDrive: !!sharedDriveId,
      sharedDriveId: sharedDriveId || 'none',
      projectId: projectId || 'none',
      roles,
    });

    if (!fileId) {
      console.log('[MEDIA_INGEST_ERROR] fileId is required', { requestId });
      return NextResponse.json(
        { 
          success: false,
          error: 'FILE_ID_REQUIRED', 
          stage: 'REQUEST', 
          message: 'fileId is required', 
          retryable: false,
          requestId,
        },
        { status: 400 }
      );
    }

    // CRITICAL: Authentication bypass is DANGEROUS and should only be used with explicit consent
    // This bypass requires both NODE_ENV=development AND explicit DRIVE_AUTH_BYPASS=true
    const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
    
    if (authBypassEnabled) {
      console.warn('[DRIVE INGEST API] AUTHENTICATION BYPASS ENABLED - DEVELOPMENT ONLY');
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
            error: 'WORKBENCH_AUTH_REQUIRED', 
            stage: 'AUTH', 
            message: 'Workbench authentication required', 
            retryable: false,
            requestId,
          },
          { status: 401 }
        );
      }

      // P0 FIX: Application-level Drive object authorization
      // Google OAuth authentication is NOT sufficient for HPP authorization
      // Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
      const sessionIdentity = await workbenchSession.getSessionIdentity();
      console.log('[DRIVE_AUTHORIZATION] SESSION_IDENTITY_VERIFIED', {
        requestId,
        sessionEmail: sessionIdentity?.email,
        operation: 'ingest',
        fileId,
      });
      
      // Verify the Drive file is accessible to the authenticated session
      // This prevents IDOR where an authorized user could access arbitrary Drive IDs
      // even if Google technically permits the object
      // P0 FIX: Use fileId (file identity) and sharedDriveId (corpus context) for authorization
      const fileAuth = await verifyCorpusAuthorization(fileId, sharedDriveId);
      if (!fileAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] FILE_NOT_AUTHORIZED', {
          requestId,
          fileId,
          reason: fileAuth.reason,
        });
        return NextResponse.json(
          {
            success: false,
            error: 'DRIVE_FILE_NOT_AUTHORIZED',
            stage: 'DRIVE_AUTHORIZATION',
            message: fileAuth.reason || 'Drive file is not accessible to the authenticated session',
            requestId,
          },
          { status: 403 }
        );
      }
      
      console.log('[DRIVE_AUTHORIZATION] FILE_ACCESS_VERIFIED', {
        requestId,
        fileId,
        corpus: fileAuth.corpus,
      });
    }

    // 1. Get Drive file metadata
    console.log('[MEDIA_INGEST] DRIVE_METADATA stage started', { requestId });
    const driveFile = await driveDiscovery.getFile(fileId);
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

    // P0 FIX: Reject non-image files before downloading bytes
    // Non-image Drive objects cannot enter the media materialization pipeline
    if (!driveFile.mimeType || !driveFile.mimeType.startsWith('image/')) {
      console.log('[MEDIA_INGEST_ERROR] Non-image file rejected', {
        requestId,
        mimeType: driveFile.mimeType,
        driveName: driveFile.name,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'UNSUPPORTED_FILE_TYPE',
          stage: 'DRIVE_METADATA',
          message: 'Only image files can be ingested as media',
          details: `File type ${driveFile.mimeType} is not supported`,
          retryable: false,
          requestId,
        },
        { status: 415 }
      );
    }

    // 2. Download bytes from Drive
    console.log('[MEDIA_INGEST] DOWNLOAD stage started', { requestId });
    const driveBytes = await driveDiscovery.downloadFile(fileId);
    if (!driveBytes || driveBytes.length === 0) {
      console.log('[MEDIA_INGEST_ERROR] File download failed or empty', { requestId });
      return NextResponse.json(
        {
          success: false,
          error: 'DOWNLOAD_FAILED',
          stage: 'DOWNLOAD',
          message: 'Failed to download file from Drive or file is empty',
          retryable: true,
          requestId,
        },
        { status: 500 }
      );
    }
    console.log('[MEDIA_INGEST] DOWNLOAD stage succeeded', {
      requestId,
      bufferSize: driveBytes.length,
    });

    // P0 FIX: Validate Sharp availability before attempting materialization
    if (!sharpAvailable) {
      console.error('[MEDIA_INGEST] SHARP_UNAVAILABLE - Rejecting materialization', {
        requestId,
        sharpAvailable,
        sharpType: typeof sharp,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'SHARP_UNAVAILABLE',
          stage: 'IMAGE_VALIDATION',
          message: 'Image processing library is not available in the runtime environment.',
          details: 'Sharp is required for constitutional media validation. The system cannot safely proceed without actual image metadata.',
          retryable: false,
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

    let metadata: any;
    try {
      console.log('[MEDIA_INGEST_FORENSIC] Attempting Sharp metadata extraction', {
        requestId,
        bufferSize: driveBytes.length,
        sharpAvailable,
        sharpType: typeof sharp,
      });
      metadata = await sharp(driveBytes).metadata();
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
      
      // Distinguish between "not a valid image" and "image format not supported by Sharp"
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isFormatError = errorMessage.includes('Unsupported') || 
                           errorMessage.includes('input buffer') ||
                           errorMessage.includes('VipsJpeg') ||
                           errorMessage.includes('VipsPng') ||
                           errorMessage.includes('VipsWebP') ||
                           errorMessage.includes('VipsAvif') ||
                           errorMessage.includes('VipsHeif') ||
                           errorMessage.includes('VipsTiff') ||
                           errorMessage.includes('unknown');
      
      return NextResponse.json(
        {
          success: false,
          error: isFormatError ? 'UNSUPPORTED_IMAGE_FORMAT' : 'IMAGE_VALIDATION_FAILED',
          stage: 'IMAGE_VALIDATION',
          message: isFormatError 
            ? 'The selected file is an image format that cannot be processed by the current image decoder.'
            : 'The selected file is not a valid image or is corrupted.',
          retryable: false,
          details: errorMessage,
          requestId,
          forensic: {
            sharpAvailable,
            sharpType: typeof sharp,
            bufferSize: driveBytes.length,
            mimeType: driveFile.mimeType,
            sharpFormat: metadata?.format,
          },
        },
        { status: isFormatError ? 415 : 400 }
      );
    }

    // 4. Compute content hash for stable identity
    console.log('[MEDIA_INGEST] HASH stage started', { requestId });
    const contentHash = crypto.createHash('sha256').update(driveBytes).digest('hex');
    console.log('[MEDIA_INGEST] HASH stage succeeded', {
      requestId,
      hash: contentHash.substring(0, 16) + '...',
    });
    
    // 5. Check for existing record with matching content hash (deduplication in KV)
    console.log('[MEDIA_INGEST] DEDUPLICATION stage started', { requestId });
    const existingMedia = await findMediaByContentHash(contentHash);
    let needsUpgrade = false;
    
    if (existingMedia) {
      console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - existing KV record', {
        requestId,
        existingMediaId: existingMedia.id,
        existingSource: existingMedia.source,
        existingLifecycleState: existingMedia.lifecycleState,
      });

      // If existing record is already PublishedMediaAsset with Blob proof, return it
      if (existingMedia.lifecycleState === 'published' && existingMedia.source === 'local') {
        const isComplete = await isPubliclyComplete(existingMedia);
        if (isComplete) {
          console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - existing complete PublishedMediaAsset', {
            requestId,
            existingMediaId: existingMedia.id,
            reason: 'Asset passed public completeness check (shape + real hash + Blob proof + required variants)',
          });

          // CRITICAL: Run assignment reconciliation for deduplicated media (optional, non-fatal)
          // This ensures DriveReference assignments are repaired when re-ingesting the same content
          // But materialization succeeds even if reconciliation fails
          let reconciliationResult: ReconciliationResult = { reconciled: false, updated: [], repaired: false, brokenAssignments: [] };
          if (fileId) {
            try {
              reconciliationResult = await reconcileDriveAssignments(
                existingMedia.id,
                fileId, // Use authoritative Drive file ID for provenance reconciliation
                contentHash,
                requestId
              );
            } catch (reconciliationError) {
              console.warn('[MEDIA_INGEST] ASSIGNMENT_RECONCILIATION failed (non-fatal)', {
                requestId,
                mediaId: existingMedia.id,
                error: reconciliationError instanceof Error ? reconciliationError.message : 'Unknown error',
              });
            }
          }

          return NextResponse.json({
            success: true,
            action: 'existing',
            media: existingMedia,
            mediaId: existingMedia.id,
            message: 'Media already exists with matching content hash',
            deduplicated: true,
            reconciliation: reconciliationResult,
            requestId,
          });
        } else {
          console.log('[MEDIA_INGEST] DEDUPLICATION stage found incomplete PublishedMediaAsset', {
            requestId,
            existingMediaId: existingMedia.id,
            reason: 'Existing record exists but fails public completeness check - will upgrade',
          });
          needsUpgrade = true;
        }
      } else {
        console.log('[MEDIA_INGEST] DEDUPLICATION stage found non-published record', {
          requestId,
          existingMediaId: existingMedia.id,
          existingLifecycleState: existingMedia.lifecycleState,
          existingSource: existingMedia.source,
          reason: 'Existing record is not a PublishedMediaAsset - will materialize',
        });
        needsUpgrade = true;
      }
    } else {
      console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - no existing record', {
        requestId,
        reason: 'No existing record with matching content hash - will materialize',
      });
    }

    // 6. Generate variants (original, webp, avif, thumbnail, blur, responsive)
    console.log('[MEDIA_INGEST] VARIANT_GENERATION stage started', { requestId });
    const originalFilename = generateBlobFilename(contentHash, 'original', 'jpg');
    const webpFilename = generateBlobFilename(contentHash, 'webp', 'webp');
    const avifFilename = generateBlobFilename(contentHash, 'avif', 'avif');
    const thumbnailFilename = generateBlobFilename(contentHash, 'thumbnail', 'webp');
    const blurFilename = generateBlobFilename(contentHash, 'blur', 'webp');

    // Upload original
    console.log('[MEDIA_INGEST] VARIANT_GENERATION uploading original', { requestId });
    const originalBlobResult = await uploadToBlob(driveBytes, originalFilename, 'image/jpeg');
    const originalBlobUrl = originalBlobResult.url;
    console.log('[MEDIA_INGEST] VARIANT_GENERATION original uploaded', { requestId, url: originalBlobUrl });

    // Generate WebP variant
    const webpBuffer = await sharp(driveBytes)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const webpBlobResult = await uploadToBlob(webpBuffer, webpFilename, 'image/webp');
    const webpBlobUrl = webpBlobResult.url;
    console.log('[MEDIA_INGEST VARIANT_GENERATION webp uploaded', { requestId, url: webpBlobUrl });

    // Generate AVIF variant
    const avifBuffer = await sharp(driveBytes)
      .avif({ quality: AVIF_QUALITY })
      .toBuffer();
    const avifBlobResult = await uploadToBlob(avifBuffer, avifFilename, 'image/avif');
    const avifBlobUrl = avifBlobResult.url;
    console.log('[MEDIA_INGEST VARIANT_GENERATION avif uploaded', { requestId, url: avifBlobUrl });

    // Generate thumbnail
    const thumbnailBuffer = await sharp(driveBytes)
      .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
    const thumbnailBlobResult = await uploadToBlob(thumbnailBuffer, thumbnailFilename, 'image/webp');
    const thumbnailBlobUrl = thumbnailBlobResult.url;
    console.log('[MEDIA_INGEST VARIANT_GENERATION thumbnail uploaded', { requestId, url: thumbnailBlobUrl });

    // Generate blur placeholder
    const blurBuffer = await sharp(driveBytes)
      .resize(20, null, { withoutEnlargement: true })
      .blur(2)
      .webp({ quality: 50 })
      .toBuffer();
    const blurBlobResult = await uploadToBlob(blurBuffer, blurFilename, 'image/webp');
    const blurBlobUrl = blurBlobResult.url;
    console.log('[MEDIA_INGEST VARIANT_GENERATION blur uploaded', { requestId, url: blurBlobUrl });

    // Generate responsive variants
    const responsiveVariants = [];
    for (const width of RESPONSIVE_WIDTHS) {
      const responsiveBuffer = await sharp(driveBytes)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      const responsiveFilename = generateBlobFilename(contentHash, `responsive-${width}`, 'webp');
      const responsiveBlobResult = await uploadToBlob(responsiveBuffer, responsiveFilename, 'image/webp');
      const responsiveUrl = responsiveBlobResult.url;
      
      const avifResponsiveBuffer = await sharp(driveBytes)
        .resize(width, null, { withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY })
        .toBuffer();
      const avifResponsiveFilename = generateBlobFilename(contentHash, `responsive-${width}-avif`, 'avif');
      const avifResponsiveBlobResult = await uploadToBlob(avifResponsiveBuffer, avifResponsiveFilename, 'image/avif');
      const avifResponsiveUrl = avifResponsiveBlobResult.url;
      
      responsiveVariants.push({
        width,
        webp: responsiveUrl,
        avif: avifResponsiveUrl,
      });
      console.log('[MEDIA_INGEST VARIANT_GENERATION responsive variant uploaded', {
        requestId,
        width,
        webpUrl: responsiveUrl,
        avifUrl: avifResponsiveUrl,
      });
    }

    console.log('[MEDIA_INGEST] VARIANT_GENERATION stage succeeded', {
      requestId,
      variantCount: 2 + responsiveVariants.length,
    });

    // 7. Create PublishedMediaAsset
    console.log('[MEDIA_INGEST] MEDIA_KV_WRITE stage started', { requestId });
    const mediaId = generateStableId(contentHash);
    const orientation = determineOrientation(metadata?.width || 0, metadata?.height || 0);

    const mediaRecord: Media = {
      id: mediaId,
      contentHash,
      // CONSTITUTIONAL FIX: No drive field on PublishedMediaAsset
      // Drive provenance belongs in provenance.driveFileId, not in the drive field
      // This preserves lineage without creating a runtime Drive dependency
      provenance: {
        driveFileId: fileId,
        sharedDriveId: sharedDriveId,
        preserved_at: new Date().toISOString(),
      },
      filename: driveFile.name,
      type: 'image',
      orientation,
      dimensions: {
        width: metadata?.width || 0,
        height: metadata?.height || 0,
      },
      variants: {
        original: originalBlobUrl,
        web: webpBlobUrl,
        webp: webpBlobUrl,
        avif: avifBlobUrl,
        thumbnail: thumbnailBlobUrl,
        blur: blurBlobUrl,
        responsive: responsiveVariants,
      },
      alt: driveFile.name,
      description: `Media ingested from Google Drive: ${driveFile.name}`,
      tags: [],
      roles: roles,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      uploadedAt: new Date().toISOString(),
      fileSize: driveBytes.length,
      format: metadata?.format,
      colorSpace: metadata?.space,
      lifecycleState: 'published',
      source: 'local', // IMPORTANT: Source is 'local' because bytes are in Blob, not Drive
      storage: 'blob', // P0 FIX: Blob storage declaration required for public media gate
    };

    await storeMedia(mediaRecord);
    console.log('[MEDIA_INGEST] MEDIA_KV_WRITE stage succeeded', {
      requestId,
      mediaId,
      lifecycleState: mediaRecord.lifecycleState,
      source: mediaRecord.source,
    });

    // 8. CRITICAL: Run assignment reconciliation (optional, non-fatal)
    console.log('[MEDIA_INGEST] ASSIGNMENT_RECONCILIATION stage started', {
      requestId,
      mediaId,
      fileId,
      note: 'Reconciliation is optional - materialization succeeds even if no assignments exist'
    });

    let reconciliationResult: ReconciliationResult = { reconciled: false, updated: [], repaired: false, brokenAssignments: [] };
    if (fileId) {
      try {
        reconciliationResult = await reconcileDriveAssignments(
          mediaId,
          fileId, // Use authoritative Drive file ID for provenance reconciliation
          contentHash,
          requestId
        );
        console.log('[MEDIA_INGEST] ASSIGNMENT_RECONCILIATION completed', {
          requestId,
          reconciled: reconciliationResult.reconciled,
          updated: reconciliationResult.updated,
          repaired: reconciliationResult.repaired,
        });
      } catch (reconciliationError) {
        console.error('[MEDIA_INGEST] ASSIGNMENT_RECONCILIATION failed', {
          requestId,
          error: reconciliationError instanceof Error ? reconciliationError.message : 'Unknown error',
        });
      }
    }

    return NextResponse.json({
      success: true,
      action: 'created',
      media: mediaRecord,
      mediaId,
      message: 'Media successfully ingested and materialized',
      deduplicated: false,
      reconciliation: reconciliationResult,
      requestId,
    });

  } catch (error) {
    console.error('[MEDIA_INGEST] ERROR', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'MATERIALIZATION_FAILED',
        stage: 'UNKNOWN',
        message: error instanceof Error ? error.message : 'Unknown error during media materialization',
        requestId,
      },
      { status: 500 }
    );
  }
}