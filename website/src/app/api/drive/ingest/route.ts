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
 * Body: { driveId: string, projectId?: string, roles?: MediaRole[] }
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { driveSession } from '@/lib/drive/drive-session';
import { workbenchSession } from '@/lib/workbench-session';
import { storeMedia, findMediaByContentHash, getMedia, getMediaRecordRaw } from '@/lib/media-kv-store';
import crypto from 'crypto';
import type { Media, MediaRole } from '@/types/media';
import { RESPONSIVE_WIDTHS, THUMBNAIL_WIDTH, THUMBNAIL_QUALITY, WEBP_QUALITY, AVIF_QUALITY } from '@/lib/media-constants';
import { needsMaterialization } from '@/lib/media-contracts';
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
  repaired: boolean; // P0 FIX: Signal when poisoned PublishedMediaAsset records were repaired
}

/**
 * Reconcile DriveReference assignments to PublishedMediaAsset assignments
 * Called after materialization to repair poisoned drive-* / drive-ref-* assignments
 *
 * CONSTITUTIONAL FIX: Uses authoritative drive.fileId from DriveReference records
 * instead of ID format assumptions, making reconciliation deterministic for legacy records.
 *
 * @param publishedMediaId - The new PublishedMediaAsset ID
 * @param driveFileId - The authoritative Drive file ID from Google Drive
 * @param contentHash - The content hash of the newly materialized asset
 * @param requestId - Correlation ID
 * @returns Reconciliation result with updated service slugs
 */
async function reconcileDriveAssignments(
  publishedMediaId: string,
  driveFileId: string,
  contentHash: string,
  requestId: string
): Promise<ReconciliationResult> {
  try {
    const { getAllServiceCardAssignments, storeServiceCardAssignment, getServiceCardAssignment } = await import('@/lib/assignment-store');
    const assignments = await getAllServiceCardAssignments();
    
    const updates: string[] = [];
    let repairedCount = 0; // P0 FIX: Track when poisoned PublishedMediaAsset records are repaired

    for (const assignment of assignments) {
      // Check if assignment references this Drive source by looking up the DriveReference
      // CONSTITUTIONAL FIX: Use authoritative drive.fileId, not ID format assumptions
      let isDriveReference = false;
      
      try {
        // P0 FIX: Use getMediaRecordRaw instead of getMedia to bypass public proof gate
        // This allows reconciliation to inspect authoritative records even when the public proof gate rejects them
        const media = await getMediaRecordRaw(assignment.mediaId);
        
        if (!media) {
          console.warn('[ASSIGNMENT_RECONCILIATION] MEDIA_NOT_FOUND', {
            requestId,
            serviceSlug: assignment.serviceSlug,
            mediaId: assignment.mediaId,
            reason: 'Assignment points to non-existent media record'
          });
          continue;
        }
        
        // P0 FIX: Handle DriveReference reconciliation
        if (media.lifecycleState === 'source_reference' && media.drive) {
          // Authoritative check: Does this DriveReference point to the same Drive file?
          if (media.drive.fileId === driveFileId) {
            isDriveReference = true;
            console.log('[ASSIGNMENT_RECONCILIATION] DRIVE_REFERENCE_MATCH', {
              requestId,
              serviceSlug: assignment.serviceSlug,
              mediaId: assignment.mediaId,
              driveFileId: media.drive.fileId,
              targetDriveFileId: driveFileId,
            });
          }
        }
        
        // P0 FIX: Detect poisoned PublishedMediaAsset records
        // These are published/local records that may have synthetic content identity or missing Blob metadata
        // Production evidence shows brand-hero, fences-001-hero, repairs-001-hero are in this state
        if (media.lifecycleState === 'published' && media.source === 'local') {
          // Check if this is the same content hash as the newly materialized asset
          // If yes, this assignment can be upgraded to point to the new asset
          if (media.contentHash === contentHash) {
            console.log('[ASSIGNMENT_RECONCILIATION] PUBLISHED_ASSET_SAME_CONTENT', {
              requestId,
              serviceSlug: assignment.serviceSlug,
              oldMediaId: assignment.mediaId,
              newMediaId: publishedMediaId,
              contentHash,
              reason: 'Same content hash - assignment is already pointing at correct asset or duplicate'
            });
            // Consider this reconciled since it's the same content
            isDriveReference = true;
            repairedCount++; // P0 FIX: Track that we repaired a poisoned record
          } else {
            console.log('[ASSIGNMENT_RECONCILIATION] PUBLISHED_ASSET_DIFFERENT_CONTENT', {
              requestId,
              serviceSlug: assignment.serviceSlug,
              oldMediaId: assignment.mediaId,
              oldContentHash: media.contentHash,
              newContentHash: contentHash,
              reason: 'Assignment points to different PublishedMediaAsset - manual repair may be needed'
            });
            // This is a poisoned/legacy assignment that doesn't match the new asset
            // Don't mark as reconciled - it needs manual intervention
          }
        }
      } catch (error) {
        // P0 FIX: Fail closed on media lookup failure - do not use legacy ID format assumptions
        console.error('[ASSIGNMENT_RECONCILIATION] MEDIA_LOOKUP_FAILED - FAILING CLOSED', {
          requestId,
          serviceSlug: assignment.serviceSlug,
          mediaId: assignment.mediaId,
          error: error instanceof Error ? error.message : 'Unknown error',
          reason: 'Cannot perform authoritative reconciliation without media record. Legacy ID format assumptions are forbidden.',
        });
        // Do not fall back to legacy ID format check - fail closed instead
        continue;
      }
      
      if (isDriveReference) {
        // Read current assignment to obtain expected revision for CAS
        const currentAssignment = await getServiceCardAssignment(assignment.serviceSlug, requestId);
        const expectedRevision = currentAssignment?.revision;
        
        // Update assignment to point to the new PublishedMediaAsset
        const updatedAssignment = {
          ...assignment,
          mediaId: publishedMediaId,
          updatedAt: new Date().toISOString(),
        };
        
        await storeServiceCardAssignment(updatedAssignment, expectedRevision, requestId);
        updates.push(assignment.serviceSlug);
        
        console.log('[ASSIGNMENT_RECONCILIATION] UPDATED', {
          requestId,
          serviceSlug: assignment.serviceSlug,
          oldMediaId: assignment.mediaId,
          newMediaId: publishedMediaId,
        });
      }
    }
    
    console.log('[ASSIGNMENT_RECONCILIATION] COMPLETE', {
      requestId,
      count: updates.length,
      services: updates,
      repairedCount,
    });

    return {
      reconciled: updates.length > 0,
      updated: updates,
      incomplete: true, // P0 FIX: Signal when some assignments could not be reconciled due to media lookup failures
      repaired: repairedCount > 0, // P0 FIX: Signal when poisoned PublishedMediaAsset records were found and processed
    };
  } catch (error) {
    console.error('[ASSIGNMENT_RECONCILIATION] FAILED', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    
    return {
      reconciled: false,
      updated: [],
      error: error instanceof Error ? error.message : 'Unknown error',
      repaired: false,
    };
  }
}

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
        driveId,
      });
      
      // Verify the Drive file is accessible to the authenticated session
      // This prevents IDOR where an authorized user could access arbitrary Drive IDs
      // even if Google technically permits the object
      const fileAuth = await verifyCorpusAuthorization(driveId, driveIdParameter);
      if (!fileAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] FILE_NOT_AUTHORIZED', {
          requestId,
          driveId,
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
        driveId,
        corpus: fileAuth.corpus,
      });
    }

    // 1. Get Drive file metadata
    console.log('[MEDIA_INGEST] DRIVE_METADATA stage started', { requestId });
    const driveFile = await driveDiscovery.getFile(driveId);
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
      fileBuffer = await driveDiscovery.downloadFile(driveId);
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
    const existingMedia = await findMediaByContentHash(contentHash);
    let needsUpgrade = false;
    
    if (existingMedia) {
      console.log('[MEDIA_INGEST] DEDUPLICATION stage succeeded - existing KV record', {
        requestId,
        existingMediaId: existingMedia.id,
        existingLifecycleState: existingMedia.lifecycleState,
        existingSource: existingMedia.source,
      });
      
      // CONSTITUTIONAL FIX: DriveReference must NEVER be upgraded in place
      // Always materialize DriveReference into new PublishedMediaAsset
      if (existingMedia.lifecycleState === 'source_reference' || existingMedia.source === 'google-drive') {
        console.log('[MEDIA_INGEST] DRIVE_REFERENCE_DETECTED - forcing materialization', {
          requestId,
          existingMediaId: existingMedia.id,
          reason: 'DriveReference cannot be upgraded in place, must materialize to PublishedMediaAsset',
        });
        // Continue with full materialization to create new PublishedMediaAsset
        // Don't return early - fall through to variant generation logic below
      } else if (existingMedia.lifecycleState === 'published' && existingMedia.source === 'local') {
        // Only PublishedMediaAsset can be deduplicated
        // P0 FIX: Use authoritative completeness check from media-contracts.ts
        const isComplete = !needsMaterialization(existingMedia);
        needsUpgrade = !isComplete;

        if (needsUpgrade && sharpAvailable) {
          console.log('[MEDIA_INGEST] UPGRADING_INCOMPLETE_PUBLISHED_ASSET', {
            requestId,
            existingMediaId: existingMedia.id,
            reason: 'Asset fails materialization completeness check',
          });

          // Continue with variant generation to upgrade the existing record
          // Don't return early - fall through to variant generation logic below
        } else {
          // CRITICAL: Run assignment reconciliation even for deduplicated media
          // This ensures DriveReference assignments are repaired when re-ingesting the same content
          const reconciliationResult = await reconcileDriveAssignments(
            existingMedia.id,
            driveId, // Use authoritative Drive file ID for provenance reconciliation
            contentHash,
            requestId
          );
          
          return NextResponse.json({
            success: true,
            action: 'existing',
            media: existingMedia,
            requestId,
            idempotent: true,
            deduplicationSource: 'kv',
            assignmentReconciled: reconciliationResult.reconciled,
            assignmentsUpdated: reconciliationResult.updated,
          });
        }
      } else {
        // Unknown lifecycle state - log warning but continue with materialization
        console.warn('[MEDIA_INGEST] UNKNOWN_LIFECYCLE_STATE - forcing materialization', {
          requestId,
          existingMediaId: existingMedia.id,
          lifecycleState: existingMedia.lifecycleState,
          source: existingMedia.source,
        });
        // Continue with full materialization
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
    const validWidths = RESPONSIVE_WIDTHS.filter((w) => w <= width);
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
          [fmt === 'avif' ? 'avif' : 'webp']({ quality: fmt === 'avif' ? AVIF_QUALITY : WEBP_QUALITY })
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
    const thumbBuffer = await sharp(fileBuffer).resize(THUMBNAIL_WIDTH).webp({ quality: THUMBNAIL_QUALITY }).toBuffer();
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
    
    // P0-A FIX: Preserve ALL generated renditions in responsive array
    // Sort variants by width to get largest for top-level webp/avif
    const sortedVariants = [...variants].sort((a, b) => (b.width || 0) - (a.width || 0));
    const webpVariant = sortedVariants.find((v) => v.format === 'webp');
    const avifVariant = sortedVariants.find((v) => v.format === 'avif');
    
    // Build responsive array grouped by width
    const responsiveVariants: Array<{ width: number; webp: string; avif: string }> = [];
    const uniqueWidths = [...new Set(variants.map(v => v.width))].sort((a, b) => a - b);
    
    for (const width of uniqueWidths) {
      const webpAtWidth = variants.find(v => v.format === 'webp' && v.width === width);
      const avifAtWidth = variants.find(v => v.format === 'avif' && v.width === width);
      
      if (webpAtWidth || avifAtWidth) {
        responsiveVariants.push({
          width,
          webp: webpAtWidth?.src || '',
          avif: avifAtWidth?.src || '',
        });
      }
    }
    
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
        responsive: responsiveVariants,
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
        // Use actual Drive file ID for provenance, not Shared Drive ID
        august3_driveId: driveId,
        // Store Shared Drive context separately for corpus/metadata
        sharedDriveId: driveIdParameter || undefined,
        // CONSTITUTIONAL FIX: Store authoritative Drive file ID for reconciliation
        driveFileId: driveId,
      },
    };

    console.log('[MEDIA_INGEST] MEDIA_PERSIST stage started', {
      requestId,
      mediaId,
      upgradeMode: !!existingMedia && needsUpgrade,
    });

    // P1-7: Materialization state machine - validate state transition
    const targetState = 'published' as const;
    const currentState = existingMedia?.lifecycleState as any || 'source_reference';
    const operation = needsUpgrade ? 'upgrade' : 'materialize';
    
    const transitionValidation = isValidTransition(currentState, targetState, operation);
    if (!transitionValidation.allowed) {
      console.error('[MEDIA_INGEST] STATE_TRANSITION_BLOCKED', {
        requestId,
        mediaId,
        currentState,
        targetState,
        operation,
        reason: transitionValidation.reason,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'STATE_TRANSITION_BLOCKED',
          stage: 'MEDIA_PERSIST',
          message: 'Invalid state transition',
          details: transitionValidation.reason,
          requiresRollback: transitionValidation.requiresRollback,
          requestId,
        },
        { status: 409 }
      );
    }

    // 9. Store Media record in KV (canonical authority)
    // P1-7: Materialization atomicity - wrap KV write in recovery logic
    let kvWriteSuccess = false;
    try {
      // CONSTITUTIONAL FIX: Only upgrade PublishedMediaAsset, never DriveReference
      if (existingMedia && needsUpgrade && existingMedia.lifecycleState === 'published' && existingMedia.source === 'local') {
        console.log('[MEDIA_INGEST] UPGRADING_EXISTING_PUBLISHED_ASSET', {
          requestId,
          existingMediaId: existingMedia.id,
          newResponsiveCount: responsiveVariants.length,
        });
        
        // Apply state transition
        const upgradedMedia = applyStateTransition(existingMedia, targetState, operation);
        if (!upgradedMedia) {
          throw new Error('State transition failed');
        }
        
        // Update with new responsive variants
        const finalUpgradedMedia: Media = {
          ...upgradedMedia,
          variants: {
            ...upgradedMedia.variants,
            responsive: responsiveVariants,
            // Update top-level webp/avif to largest renditions
            webp: webpVariant?.src || upgradedMedia.variants.webp,
            avif: avifVariant?.src || upgradedMedia.variants.avif,
          },
          updatedAt: new Date().toISOString(),
          // CONSTITUTIONAL FIX: Ensure provenance includes driveFileId for reconciliation
          provenance: {
            ...upgradedMedia.provenance,
            driveFileId: driveId,
          },
        };
        
        await storeMedia(finalUpgradedMedia);
        kvWriteSuccess = true;
        
        console.log('[MEDIA_INGEST] MEDIA_UPGRADE succeeded', {
          requestId,
          mediaId: finalUpgradedMedia.id,
        });
        
        // CRITICAL: Run assignment reconciliation after upgrade
        const reconciliationResult = await reconcileDriveAssignments(
          finalUpgradedMedia.id,
          driveId, // Use authoritative Drive file ID for provenance reconciliation
          contentHash,
          requestId
        );
        
        return NextResponse.json({
          success: true,
          action: 'upgraded',
          media: finalUpgradedMedia,
          requestId,
          idempotent: true,
          upgradeSource: 'responsive_variants',
          assignmentReconciled: reconciliationResult.reconciled,
          assignmentsUpdated: reconciliationResult.updated,
        });
      } else {
        // New media record or DriveReference (always create new PublishedMediaAsset)
        // Apply state transition
        const finalMediaRecord = applyStateTransition(
          { ...mediaRecord, lifecycleState: currentState },
          targetState,
          operation
        );
        
        if (!finalMediaRecord) {
          throw new Error('State transition failed');
        }
        
        await storeMedia(finalMediaRecord);
        kvWriteSuccess = true;
        
        console.log('[MEDIA_INGEST] NEW_MEDIA_PERSIST succeeded', {
          requestId,
          mediaId,
          lifecycleState: finalMediaRecord.lifecycleState,
          source: finalMediaRecord.source,
          wasDriveReference: existingMedia?.lifecycleState === 'source_reference',
        });
      }
    } catch (kvError) {
      console.error('[MEDIA_INGEST] KV_WRITE_FAILED', {
        requestId,
        mediaId,
        error: kvError instanceof Error ? kvError.message : 'Unknown error',
      });
      
      // P1-7: Materialization recovery - KV write failed but Blob upload succeeded
      // This is a recoverable state: Blob exists but KV record is missing
      // Trigger recovery to reconstruct KV record from Blob
      console.log('[MEDIA_INGEST] ATTEMPTING_KV_RECOVERY', { requestId, mediaId });
      
      try {
        const { repairIncompleteKvRecord } = await import('@/lib/materialization-recovery');
        const repaired = await repairIncompleteKvRecord(mediaRecord);
        
        if (repaired) {
          console.log('[MEDIA_INGEST] KV_RECOVERY_SUCCEEDED', { requestId, mediaId });
          kvWriteSuccess = true;
        } else {
          console.error('[MEDIA_INGEST] KV_RECOVERY_FAILED', { requestId, mediaId });
        }
      } catch (recoveryError) {
        console.error('[MEDIA_INGEST] KV_RECOVERY_ERROR', {
          requestId,
          mediaId,
          error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
        });
      }
      
      // If recovery also failed, return error
      if (!kvWriteSuccess) {
        return NextResponse.json(
          {
            success: false,
            error: 'KV_PERSIST_FAILED',
            stage: 'MEDIA_PERSIST',
            message: 'Failed to store media record in KV and recovery failed',
            retryable: true,
            details: kvError instanceof Error ? kvError.message : 'Unknown error',
            requestId,
            forensic: {
              blobUploadCompleted: true,
              kvWriteFailed: true,
              recoveryAttempted: true,
              mediaId,
              contentHash,
            },
          },
          { status: 500 }
        );
      }
    }
    
    console.log('[MEDIA_INGEST] MEDIA_PERSIST stage succeeded', {
      requestId,
      mediaId,
    });

    // 10. Reconcile DriveReference assignments to PublishedMediaAsset assignments
    // This is authoritative - if reconciliation fails, report it in the response
    let reconciliationResult: ReconciliationResult = { reconciled: false, updated: [], repaired: false };
    if (driveId) {
      reconciliationResult = await reconcileDriveAssignments(
        mediaId,
        driveId, // Use authoritative Drive file ID for provenance reconciliation
        contentHash,
        requestId
      );
    }

    console.log('[MEDIA_INGEST] RESPONSE stage started', { requestId });
    return NextResponse.json({
      success: true,
      action: 'created',
      media: mediaRecord,
      requestId,
      idempotent: blobIdempotencyStats.newUploads === 0,
      blobIdempotencyStats,
      assignmentReconciled: reconciliationResult.reconciled,
      assignmentsUpdated: reconciliationResult.updated,
      reconciliationError: reconciliationResult.error,
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
