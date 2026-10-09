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
import { replaceMaterializationLease } from '@/lib/drive/materialization-lease';
import { verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';

/**
 * P0 FIX: Assignment reconciliation removed from ingest route
 *
 * The canonical materialization path is now:
 * 1. Download bytes from Drive
 * 2. Validate with Sharp (final image authority)
 * 3. Compute content hash
 * 4. Generate variants
 * 5. Upload to Blob
 * 6. Create PublishedMediaAsset
 * 7. Return media ID
 *
 * Assignment is handled exclusively by use-drive-asset with explicit CAS semantics.
 * Ingest route no longer scans or mutates assignments.
 * This prevents silent half-connected states and ensures atomic transaction boundaries.
 */

// Import storage modules at top level (they are ES modules)
import { uploadToR2, verifyR2Hash } from '@/lib/r2-storage';

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
  originalShortcutId?: string; // P0 FIX: Preserve shortcut provenance
  idempotencyKey?: string; // P0 FIX: Idempotency key to prevent duplicate in-flight materialization
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

  // P0 FIX: Scope these variables for error handling
  let client: any = null;
  let canonicalSourceKey: string = '';
  let ownerToken: string = '';
  let ownedLease: Record<string, any> | null = null;
  let completedMediaId: string | null = null;

  try {
    const body: IngestRequest = await request.json();
    const { fileId, sharedDriveId, projectId, roles = ['gallery'], idempotencyKey } = body;

    // P0 FIX: Derive canonical source key server-side
    // Client-provided idempotencyKey is optional correlation only
    // Authority key is derived from immutable source identity
    const canonicalCorpusId = sharedDriveId || 'my-drive';
    canonicalSourceKey = `drive-materialization:${canonicalCorpusId}:${fileId}`;
    ownerToken = crypto.randomUUID();

    console.log('[MEDIA_INGEST] REQUEST stage succeeded', {
      requestId,
      source: 'drive',
      driveFileId: fileId,
      sharedDrive: !!sharedDriveId,
      sharedDriveId: sharedDriveId || 'none',
      projectId: projectId || 'none',
      roles,
      canonicalSourceKey,
      hasLeaseOwner: !!ownerToken,
      clientProvidedKey: idempotencyKey,
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

    // CEO FIX: Authentication/authorization BEFORE materialization lease
    // Previous order (incorrect): lease → auth → corpus → download
    // Correct order: auth → corpus → lease → download
    // This ensures unauthenticated requests cannot create or contend for leases
    // and returns 401 instead of 409 for security tests

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

      // P0 FIX: Application-level Drive object authorization BEFORE lease
      // Google OAuth authentication is NOT sufficient for HPP authorization
      // Must verify: session identity → HPP authorization → Drive authorization → requested object → operation
      const sessionIdentity = await workbenchSession.getSessionIdentity();
      console.log('[DRIVE_AUTHORIZATION] SESSION_IDENTITY_VERIFIED', {
        requestId,
        sessionEmail: sessionIdentity?.email,
        operation: 'ingest',
      });
      
      // Verify the Drive file is accessible to the authenticated session
      // This prevents IDOR where an authorized user could access arbitrary Drive IDs
      // even if Google technically permits the object
      // P0 FIX: Use fileId (file identity) and sharedDriveId (corpus context) for authorization
      // Note: pre-fetched metadata not available here yet - authorization happens before getFile
      const fileAuth = await verifyCorpusAuthorization(fileId, sharedDriveId);
      if (!fileAuth.authorized) {
        console.error('[DRIVE_AUTHORIZATION] FILE_NOT_AUTHORIZED', {
          requestId,
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
        corpus: fileAuth.corpus,
      });
    }

    // CEO FIX: Acquire atomic lease AFTER authentication AND authorization
    // Prevents concurrent materialization of same source BY AUTHENTICATED AND AUTHORIZED REQUESTS ONLY
    const { createRedisClient, namespacedKey } = await import('@/lib/media-kv-store');
    client = createRedisClient();

    if (client) {
      const leaseKey = namespacedKey(canonicalSourceKey);
      const leaseExpiry = 1800; // 30 minutes

      // Try to acquire lease atomically with SET NX EX
      // Value contains owner token and lifecycle state
      const leaseRecord = {
        status: 'PROCESSING',
        ownerToken,
        source: {
          provider: 'google-drive',
          corpusId: canonicalCorpusId,
          fileId,
        },
        startedAt: new Date().toISOString(),
        leaseExpiresAt: new Date(Date.now() + leaseExpiry * 1000).toISOString(),
      };

      const acquired = await client.set(leaseKey, JSON.stringify(leaseRecord), {
        nx: true, // Only set if key doesn't exist
        ex: leaseExpiry,
      });

      if (acquired) ownedLease = leaseRecord;

      if (!acquired) {
        // Lease already held - check state
        const existingLease = await client.get(leaseKey);
        if (existingLease) {
          try {
            const leaseData = typeof existingLease === 'string' ? JSON.parse(existingLease) : existingLease;
            console.log('[MEDIA_INGEST] IDEMPOTENCY_LEASE_HELD', {
              requestId,
              canonicalSourceKey,
              hasExistingOwner: !!leaseData.ownerToken,
              existingStatus: leaseData.status,
              existingStartedAt: leaseData.startedAt,
            });

            // If lease is SUCCEEDED with mediaId, return it
            if (leaseData.status === 'SUCCEEDED' && leaseData.mediaId) {
              const existingMedia = await getMedia(leaseData.mediaId);
              if (existingMedia && await isPubliclyComplete(existingMedia)) {
                return NextResponse.json({
                  success: true,
                  action: 'existing',
                  media: existingMedia,
                  mediaId: leaseData.mediaId,
                  message: 'Materialization already completed for this source',
                  deduplicated: true,
                  requestId,
                });
              }
            }

            // If still PROCESSING, return QUEUED status
            if (leaseData.status === 'PROCESSING') {
              return NextResponse.json({
                success: false,
                error: 'MATERIALIZATION_IN_PROGRESS',
                stage: 'IDEMPOTENCY',
                message: 'Materialization already in progress for this source',
                retryable: false,
                requestId,
                hasExistingOwner: !!leaseData.ownerToken,
                startedAt: leaseData.startedAt,
              }, { status: 202 }); // 202 Accepted - request is valid but not yet complete
            }

            // P0 FIX: Handle FAILED_RETRYABLE - allow retry by reclaiming lease
            if (leaseData.status === 'FAILED_RETRYABLE') {
              console.log('[MEDIA_INGEST] IDEMPOTENCY_LEASE_RETRYABLE', {
                requestId,
                canonicalSourceKey,
                hasExistingOwner: !!leaseData.ownerToken,
                failedAt: leaseData.failedAt,
                errorCode: leaseData.errorCode,
                errorMessage: leaseData.errorMessage,
              });

              // Attempt to reclaim the lease for retry
              // Use the new ownerToken for this retry attempt
              const retryLease = {
                ...leaseData,
                status: 'PROCESSING',
                ownerToken,
                startedAt: new Date().toISOString(),
                leaseExpiresAt: new Date(Date.now() + leaseExpiry * 1000).toISOString(),
                retryCount: (leaseData.retryCount || 0) + 1,
              };

              const reclaimed = await replaceMaterializationLease(
                client, leaseKey, 'FAILED_RETRYABLE', leaseData.ownerToken, retryLease, leaseExpiry,
              );

              if (reclaimed) {
                ownedLease = retryLease;
                console.log('[MEDIA_INGEST] IDEMPOTENCY_LEASE_RECLAIMED', {
                  requestId,
                  canonicalSourceKey,
                  hasPreviousOwner: !!leaseData.ownerToken,
                  hasNewOwner: !!ownerToken,
                  retryCount: retryLease.retryCount,
                });
                // Continue with materialization using reclaimed lease
              } else {
                console.warn('[MEDIA_INGEST] IDEMPOTENCY_LEASE_RECLAIM_FAILED', {
                  requestId,
                  canonicalSourceKey,
                  reason: 'Lease was deleted between check and reclaim',
                });
                // Treat as if lease is now available - fall through to acquire new lease
              }
            }
          } catch (parseError) {
            console.error('[MEDIA_INGEST] IDEMPOTENCY_LEASE_PARSE_FAILED', {
              requestId,
              leaseKey,
              error: parseError instanceof Error ? parseError.message : String(parseError),
            });
          }
        }

        // If we didn't reclaim a FAILED_RETRYABLE lease, return conflict
        // Check if we successfully reclaimed above
        if (!ownedLease) {
          return NextResponse.json({
            success: false,
            error: 'MATERIALIZATION_LOCKED',
            stage: 'IDEMPOTENCY',
            message: 'Source is currently being materialized by another request',
            retryable: true,
            requestId,
          }, { status: 409 });
        }
      }

      console.log('[MEDIA_INGEST] IDEMPOTENCY_LEASE_ACQUIRED', {
        requestId,
        canonicalSourceKey,
        hasLeaseOwner: !!ownerToken,
        leaseExpiry,
      });
    }

    // Check environment variables for R2 storage configuration
    const r2Configured = !!(
      process.env.R2_ACCOUNT_ID &&
      process.env.R2_BUCKET_NAME &&
      process.env.R2_ACCESS_KEY_ID &&
      process.env.R2_SECRET_ACCESS_KEY
    );

    if (!r2Configured) {
      return NextResponse.json(
        {
          success: false,
          error: 'R2_NOT_CONFIGURED',
          stage: 'initialization',
          message: 'Cloudflare R2 storage is not configured.',
          details: 'R2_ACCOUNT_ID, R2_BUCKET_NAME, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables are required.',
          requestId,
        },
        { status: 500 }
      );
    }


    // 1. Get Drive file metadata
    console.log('[MEDIA_INGEST] DRIVE_METADATA stage started', { requestId });
    // P0 FIX: Pass corpusId to preserve context through authorization chain
    const driveFile = await driveDiscovery.getFile(fileId, sharedDriveId);
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

    // P0 FIX: Do NOT reject based on MIME type at metadata stage
    // MIME is metadata, not content authority
    // Sharp will determine whether the bytes are actually an image after download
    // Only clearly impossible classes (video, audio, archives) should be rejected early
    // Google-native objects (application/vnd.google-apps.*) should be allowed through
    // so Sharp can make the final determination based on actual bytes

    console.log('[MEDIA_INGEST] MIME classification', {
      requestId,
      mimeType: driveFile.mimeType,
      classification: driveFile.mimeType?.startsWith('image/') ? 'image-metadata' : 'no-image-metadata',
      note: 'Sharp will determine actual image status from bytes',
    });

    // 2. Download bytes from Drive
    console.log('[MEDIA_INGEST] DOWNLOAD stage started', { requestId });
    // P0 FIX: Pass corpusId to preserve context through authorization chain
    const driveBytes = await driveDiscovery.downloadFile(fileId, sharedDriveId);
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
      hasHash: !!contentHash,
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

          // P0 FIX: Assignment reconciliation removed from ingest route
          // Assignment is now handled exclusively by use-drive-asset with explicit CAS semantics
          completedMediaId = existingMedia.id;
          return NextResponse.json({
            success: true,
            action: 'existing',
            media: existingMedia.storage === 'r2'
              ? (await import('@/lib/r2-public-origin')).projectVerifiedR2Media(existingMedia)
              : existingMedia,
            mediaId: existingMedia.id,
            message: 'Media already exists with matching content hash (assignment handled by caller)',
            deduplicated: true,
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
    // P0 FIX: Preserve original MIME type from Drive file
    const originalMimeType = driveFile.mimeType || 'image/jpeg';
    const originalExtension = originalMimeType === 'image/png' ? 'png' : 
                           originalMimeType === 'image/webp' ? 'webp' :
                           originalMimeType === 'image/tiff' ? 'tiff' :
                           originalMimeType === 'image/avif' ? 'avif' : 'jpg';
    // Upload original with preserved MIME type to R2
    console.log('[MEDIA_INGEST] VARIANT_GENERATION uploading original to R2', { requestId });
    const originalR2Result = await uploadToR2(driveBytes, originalMimeType, originalExtension);
    const originalR2Url = originalR2Result.url;
    const originalKey = new URL(originalR2Url).pathname.split('/').pop() || '';
    const integrity = await verifyR2Hash(originalKey, contentHash);
    if (!integrity.success) {
      throw new Error('R2 original byte verification failed: ' + integrity.errorType);
    }
    console.log('[MEDIA_INGEST] R2_BYTE_VERIFICATION_SUCCEEDED', { requestId, contentHash, originalKey });
    console.log('[MEDIA_INGEST] VARIANT_GENERATION original uploaded to R2', { requestId, url: originalR2Url });

    // Generate WebP variant
    const webpBuffer = await sharp(driveBytes)
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    const webpR2Result = await uploadToR2(webpBuffer, 'image/webp', 'webp');
    const webpR2Url = webpR2Result.url;
    console.log('[MEDIA_INGEST VARIANT_GENERATION webp uploaded to R2', { requestId, url: webpR2Url });

    // Generate AVIF variant
    const avifBuffer = await sharp(driveBytes)
      .avif({ quality: AVIF_QUALITY })
      .toBuffer();
    const avifR2Result = await uploadToR2(avifBuffer, 'image/avif', 'avif');
    const avifR2Url = avifR2Result.url;
    console.log('[MEDIA_INGEST VARIANT_GENERATION avif uploaded to R2', { requestId, url: avifR2Url });

    // Generate thumbnail
    const thumbnailBuffer = await sharp(driveBytes)
      .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true })
      .webp({ quality: THUMBNAIL_QUALITY })
      .toBuffer();
    const thumbnailR2Result = await uploadToR2(thumbnailBuffer, 'image/webp', 'webp');
    const thumbnailR2Url = thumbnailR2Result.url;
    console.log('[MEDIA_INGEST VARIANT_GENERATION thumbnail uploaded to R2', { requestId, url: thumbnailR2Url });

    // Generate blur placeholder
    const blurBuffer = await sharp(driveBytes)
      .resize(20, null, { withoutEnlargement: true })
      .blur(2)
      .webp({ quality: 50 })
      .toBuffer();
    const blurR2Result = await uploadToR2(blurBuffer, 'image/webp', 'webp');
    const blurR2Url = blurR2Result.url;
    console.log('[MEDIA_INGEST] VARIANT_GENERATION blur uploaded to R2', { requestId, url: blurR2Url });

    // Generate responsive variants
    const responsiveVariants = [];
    for (const width of RESPONSIVE_WIDTHS) {
      const responsiveBuffer = await sharp(driveBytes)
        .resize(width, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      const responsiveR2Result = await uploadToR2(responsiveBuffer, 'image/webp', 'webp');
      const responsiveUrl = responsiveR2Result.url;

      const avifResponsiveBuffer = await sharp(driveBytes)
        .resize(width, null, { withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY })
        .toBuffer();
      const avifResponsiveR2Result = await uploadToR2(avifResponsiveBuffer, 'image/avif', 'avif');
      const avifResponsiveUrl = avifResponsiveR2Result.url;

      responsiveVariants.push({
        width,
        webp: responsiveUrl,
        avif: avifResponsiveUrl,
      });
      console.log('[MEDIA_INGEST VARIANT_GENERATION responsive variant uploaded to R2', {
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
        originalShortcutId: body.originalShortcutId, // P0 FIX: Preserve shortcut provenance
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
        original: originalR2Url,
        web: webpR2Url,
        webp: webpR2Url,
        avif: avifR2Url,
        thumbnail: thumbnailR2Url,
        blur: blurR2Url,
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
      source: 'local', // IMPORTANT: Source is 'local' because bytes are in R2, not Drive
      storage: 'r2', // P0 FIX: R2 storage declaration required for public media gate
    };

    if (!await isPubliclyComplete(mediaRecord)) {
      throw new Error('R2 rendition completeness verification failed');
    }
    await storeMedia(mediaRecord);
    completedMediaId = mediaId;
    console.log('[MEDIA_INGEST] MEDIA_KV_WRITE stage succeeded', {
      requestId,
      mediaId,
      lifecycleState: mediaRecord.lifecycleState,
      source: mediaRecord.source,
    });

    // P0 FIX: Assignment reconciliation removed from ingest route
    // Assignment is now handled exclusively by use-drive-asset with explicit CAS semantics
    return NextResponse.json({
      success: true,
      action: 'created',
      media: mediaRecord,
      mediaId,
      message: 'Media successfully ingested and materialized (assignment handled by caller)',
      deduplicated: false,
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
  } finally {
    // Include early validation/download returns; no owned lease remains PROCESSING.
    if (client && ownedLease) {
      try {
        const { namespacedKey } = await import('@/lib/media-kv-store');
        const status = completedMediaId ? 'SUCCEEDED' : 'FAILED_RETRYABLE';
        const updated = await replaceMaterializationLease(
          client, namespacedKey(canonicalSourceKey), 'PROCESSING', ownerToken,
          { ...ownedLease, status, ...(completedMediaId
            ? { mediaId: completedMediaId, completedAt: new Date().toISOString() }
            : { failedAt: new Date().toISOString() }) },
        );
        console.log('[MEDIA_INGEST] IDEMPOTENCY_LEASE_TRANSITION', { requestId, status, updated });
      } catch (leaseError) {
        console.error('[MEDIA_INGEST] IDEMPOTENCY_LEASE_UPDATE_FAILED', { requestId, leaseError });
      }
    }
  }
}
