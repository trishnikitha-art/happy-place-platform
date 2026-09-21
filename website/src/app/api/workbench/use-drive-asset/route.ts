/**
 * Workbench Drive handoff: authorize source, materialize through existing ingest,
 * then atomically assign all explicit targets and verify the resulting revisions.
 */
import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { assignMediaBatch } from '@/lib/assignment-store';
import { AssignmentBatchError, prepareAssignmentTargets } from '@/lib/workbench-assignment-contract';
import { POST as ingestDriveMedia } from '@/app/api/drive/ingest/route';
import { Redis } from '@upstash/redis';
import { getDriveClient } from '@/lib/drive/oauth-manager';
import { verifyCorpusAuthorization } from '@/lib/drive/corpus-authorization';
import { getKvNamespace } from '@/lib/environment';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * P0 FIX: Use authoritative environment namespace for handoff idempotency
 * Handoff keys must use the same namespace architecture as the rest of the transaction system
 * to prevent environment collision and maintain run-scoped isolation
 */
const IDEMPOTENCY_PREFIX = 'use-drive-asset-idempotency:';

/**
 * P0 FIX: Get namespaced idempotency key using authoritative namespace
 * Prevents environment collision between production, preview, test, and development
 */
function getNamespacedIdempotencyKey(idempotencyKey: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${IDEMPOTENCY_PREFIX}${idempotencyKey}`;
}

/**
 * P0 FIX: Transaction lock with ownership token
 * 
 * Uses Redis SET NX with a unique ownership token to prevent lock deletion by other requests.
 * 
 * Returns the ownership token if lock acquired, null if already locked.
 * Throws error if Redis is unavailable (fail-closed).
 */
async function acquireTransactionLock(idempotencyKey: string): Promise<string | null> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    console.error('[USE_DRIVE_ASSET] Redis unavailable - cannot acquire transaction lock');
    throw new Error('REDIS_UNAVAILABLE: Transaction lock requires Redis');
  }

  const redis = new Redis({ url, token });
  const lockKey = getNamespacedIdempotencyKey(`lock:${idempotencyKey}`);
  const ownershipToken = crypto.randomUUID();
  
  // SET NX with 300 second TTL - only succeeds if key doesn't exist
  // P0 FIX: Increased from 60s to 300s to prevent lock expiry during long Drive/Blob/Git operations
  // Full transaction can include: Drive metadata → download → Sharp → Blob uploads → KV → GitHub API → Git commit → deployment → promotion → readback → idempotency
  const acquired = await redis.set(lockKey, ownershipToken, { nx: true, ex: 300 });
  
  if (acquired === 'OK') {
    console.log('[USE_DRIVE_ASSET] Transaction lock acquired');
    return ownershipToken;
  } else {
    console.log('[USE_DRIVE_ASSET] Transaction lock already held');
    return null;
  }
}

/**
 * P0 FIX: Release transaction lock with ownership verification
 * 
 * Uses Redis Lua script to atomically verify ownership before deletion.
 * This prevents one request from deleting another request's lock.
 * 
 * Fails gracefully on Redis errors (lock will expire via TTL).
 */
async function releaseTransactionLock(idempotencyKey: string, ownershipToken: string): Promise<void> {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  
  if (!url || !token) {
    console.warn('[USE_DRIVE_ASSET] Redis unavailable - lock release skipped (will expire via TTL)');
    return;
  }

  const redis = new Redis({ url, token });
  const lockKey = getNamespacedIdempotencyKey(`lock:${idempotencyKey}`);

  // Lua script: only delete if value matches ownership token
  // P0 FIX: Increased lock TTL to 300s to prevent expiry during long operations
  const luaScript = `
    if redis.call("GET", KEYS[1]) == ARGV[1] then
      return redis.call("DEL", KEYS[1])
    else
      return 0
    end
  `;
  
  try {
    const result = await redis.eval(luaScript, [lockKey], [ownershipToken]);
    
    if (result === 1) {
      console.log('[USE_DRIVE_ASSET] Transaction lock released');
    } else {
      console.warn('[USE_DRIVE_ASSET] Transaction lock not released (ownership mismatch or expired)');
    }
  } catch (error) {
    console.error('[USE_DRIVE_ASSET] Transaction lock release failed', { error });
    // Non-critical - lock will expire via TTL
  }
}

interface UseDriveAssetRequest {
  sourceFileId: string;  // Google Drive file ID
  sourceSharedDriveId?: string;  // Shared Drive corpus context (null for My Drive)
  sourceCorpusId?: string;  // P0 FIX: Explicit corpus identity from Drive file discovery
  targetSlotId?: string;  // DEPRECATED: Single target Visual Slot ID (backward compatibility)
  targetSlotIds?: string[];  // Multiple target Visual Slot IDs (new multi-slot support)
  expectedRevision?: number;  // DEPRECATED: Single CAS revision (backward compatibility)
  slotRevisions?: Array<{ slotId: string; expectedRevision: number }>;  // CAS revisions for each slot
  idempotencyKey?: string;  // DEPRECATED: Server now generates authoritative key
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let stableIdempotencyKey: string | null = null;
  let ownershipToken: string | null = null;

  try {
    // Step 1: Authenticate Workbench session
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      return NextResponse.json(
        {
          error: 'WORKBENCH_AUTH_REQUIRED',
          message: 'Workbench authentication required',
          requestId,
        },
        { status: 401 }
      );
    }

    const body: UseDriveAssetRequest = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new AssignmentBatchError('INVALID_REQUEST', 'An assignment object is required.');
    }
    const {
      sourceFileId,
      sourceSharedDriveId,
      sourceCorpusId,
      targetSlotId, // DEPRECATED: backward compatibility
      targetSlotIds, // NEW: multi-slot support
      expectedRevision, // DEPRECATED: backward compatibility
      slotRevisions, // NEW: multi-slot CAS support
    } = body;

    const targets = prepareAssignmentTargets({
      slotId: targetSlotId, slotIds: targetSlotIds, expectedRevision, slotRevisions,
    });
    if (typeof sourceFileId !== 'string' || !sourceFileId) {
      throw new AssignmentBatchError('SOURCE_FILE_REQUIRED', 'Select a Drive file.');
    }
    // The lock deduplicates materialization, not authorization or assignment.
    // Every retry still passes Drive authorization and verifies the durable batch receipt.
    stableIdempotencyKey = JSON.stringify({
      sourceFileId, sourceSharedDriveId, sourceCorpusId,
      targets: [...targets].sort((a, b) => a.slotId.localeCompare(b.slotId)),
    });

    // Step 4: Acquire transaction lock to prevent duplicate execution
    // This is inside try block, and will be released in finally
    try {
      ownershipToken = await acquireTransactionLock(stableIdempotencyKey);
      if (!ownershipToken) {
        console.log('[USE_DRIVE_ASSET] Transaction already in progress', {
          requestId,
          idempotencyKey: stableIdempotencyKey,
        });
        return NextResponse.json(
          {
            error: 'TRANSACTION_IN_PROGRESS',
            message: 'This transaction is already in progress. Please wait.',
            retrySameRequest: true,
            requestId,
          },
          { status: 409 } // Conflict
        );
      }
    } catch (lockError) {
      // Redis unavailable - fail closed
      console.error('[USE_DRIVE_ASSET] Redis unavailable - cannot proceed', {
        requestId,
        error: lockError instanceof Error ? lockError.message : String(lockError),
      });
      return NextResponse.json(
        {
          error: 'REDIS_UNAVAILABLE',
          message: 'Transaction lock requires Redis. Please try again later.',
          requestId,
        },
        { status: 503 } // Service Unavailable
      );
    }

    let authoritativeDriveMetadata: any = null;
    let actualMimeType: string | undefined = undefined;
    let actualDriveId: string | undefined = undefined;
    let actualCorpusId: string | undefined = undefined;
    let effectiveFileId: string;
    let effectiveCorpusId: string;
    let originalShortcutId: string | undefined = undefined;

    try {
      console.log('[USE_DRIVE_ASSET] STEP_5_FETCH_DRIVE_METADATA', {
        requestId,
        sourceFileId,
      });

      const driveClient = await getDriveClient();
      const fileMetadata = await driveClient.files.get({
        fileId: sourceFileId,
        fields: 'id,name,mimeType,driveId,owners,shared,thumbnailLink,webViewLink,shortcutDetails',
        supportsAllDrives: true,
      });

      console.log('[USE_DRIVE_ASSET] STEP_5_DRIVE_METADATA_OBTAINED', {
        requestId,
        hasData: !!fileMetadata.data,
      });

      if (!fileMetadata.data) {
        return NextResponse.json(
          {
            error: 'DRIVE_FILE_NOT_FOUND',
            message: 'Drive file not found or not accessible',
            requestId,
          },
          { status: 404 }
        );
      }

      authoritativeDriveMetadata = fileMetadata.data;
      actualMimeType = authoritativeDriveMetadata.mimeType;
      actualDriveId = authoritativeDriveMetadata.driveId;
      actualCorpusId = actualDriveId || 'root';

      // P0 FIX: Classify Drive object type
      const isShortcut = actualMimeType === 'application/vnd.google-apps.shortcut';
      const isGoogleNative = actualMimeType?.startsWith('application/vnd.google-apps.');
      const objectType = isShortcut ? 'shortcut' : isGoogleNative ? 'google-native' : 'file';

      console.log('[USE_DRIVE_ASSET] Authoritative Drive metadata retrieved', {
        requestId,
        actualName: authoritativeDriveMetadata.name,
        actualMimeType,
        actualCorpusId,
        requestedSharedDriveId: sourceSharedDriveId,
        requestedCorpusId: sourceCorpusId,
        objectType,
        isShortcut,
        isGoogleNative,
        hasShortcutDetails: !!authoritativeDriveMetadata.shortcutDetails,
        shortcutTargetId: authoritativeDriveMetadata.shortcutDetails?.targetId,
        allFields: Object.keys(authoritativeDriveMetadata),
      });

      // P0 FIX: Reject if client-provided corpus doesn't match server-derived authority
      // Client corpus is useful for early mismatch detection but must not override server authority
      if (sourceCorpusId && sourceCorpusId !== actualCorpusId) {
        console.error('[USE_DRIVE_ASSET] Corpus mismatch - client assertion rejected', {
          requestId,
          clientCorpusId: sourceCorpusId,
          serverCorpusId: actualCorpusId,
        });
        return NextResponse.json(
          {
            error: 'CORPUS_MISMATCH',
            message: 'Client-provided corpus identity does not match server-derived authority',
            details: {
              clientCorpusId: sourceCorpusId,
              serverCorpusId: actualCorpusId,
            },
            requestId,
          },
          { status: 400 }
        );
      }

      if (sourceSharedDriveId && sourceSharedDriveId !== actualCorpusId) {
        console.error('[USE_DRIVE_ASSET] Shared Drive ID mismatch - client assertion rejected', {
          requestId,
          clientSharedDriveId: sourceSharedDriveId,
          serverCorpusId: actualCorpusId,
        });
        return NextResponse.json(
          {
            error: 'SHARED_DRIVE_MISMATCH',
            message: 'Client-provided Shared Drive ID does not match server-derived authority',
            details: {
              clientSharedDriveId: sourceSharedDriveId,
              serverCorpusId: actualCorpusId,
            },
            requestId,
          },
          { status: 400 }
        );
      }

      // P0 FIX: Use centralized corpus authorization module with pre-fetched metadata
      const corpusAuthResult = await verifyCorpusAuthorization(
        sourceFileId,
        actualCorpusId,
        {
          driveId: actualDriveId,
          id: authoritativeDriveMetadata.id,
        }
      );

      console.log('[USE_DRIVE_ASSET] Corpus authorization check', {
        requestId,
        corpusAuthResult,
        actualCorpusId,
        actualDriveId,
      });

      if (!corpusAuthResult.authorized) {
        console.error('[USE_DRIVE_ASSET] Corpus authorization rejected', {
          requestId,
          actualCorpusId,
          corpusAuthResult,
        });
        return NextResponse.json(
          {
            error: 'CORPUS_AUTHORIZATION_REJECTED',
            message: 'Drive file is not in an authorized corpus',
            details: {
              corpusId: actualCorpusId,
              driveId: actualDriveId,
              fileName: authoritativeDriveMetadata.name,
              corpusAuthResult,
            },
            requestId,
          },
          { status: 403 }
        );
      }

      // P0 FIX: Handle Google shortcuts and native Google files
      if (isShortcut) {
        if (!authoritativeDriveMetadata.shortcutDetails?.targetId) {
          console.error('[USE_DRIVE_ASSET] Shortcut without target', {
            requestId,
            sourceFileId,
          });
          return NextResponse.json(
            {
              error: 'INVALID_SHORTCUT',
              message: 'Google shortcut does not have a target ID',
              requestId,
            },
            { status: 400 }
          );
        }

        originalShortcutId = sourceFileId;
        effectiveFileId = authoritativeDriveMetadata.shortcutDetails.targetId;
        console.log('[USE_DRIVE_ASSET] Shortcut resolution', {
          requestId,
          originalShortcutId,
          effectiveFileId,
        });
      } else if (isGoogleNative) {
        console.error('[USE_DRIVE_ASSET] Google native file not supported', {
          requestId,
          mimeType: actualMimeType,
        });
        return NextResponse.json(
          {
            error: 'UNSUPPORTED_GOOGLE_NATIVE_FILE',
            message: 'Google native files (Docs, Sheets, Slides) are not supported. Please use image files.',
            details: {
              mimeType: actualMimeType,
            },
            requestId,
          },
          { status: 400 }
        );
      } else {
        effectiveFileId = sourceFileId;
      }

      effectiveCorpusId = actualCorpusId;

      console.log('[USE_DRIVE_ASSET] Effective file and corpus identity determined', {
        requestId,
        effectiveFileId,
        effectiveCorpusId,
        originalShortcutId,
      });
    } catch (driveError) {
      console.error('[USE_DRIVE_ASSET] Drive metadata fetch failed', {
        requestId,
        error: driveError instanceof Error ? driveError.message : String(driveError),
      });
      return NextResponse.json(
        {
          error: 'DRIVE_METADATA_ERROR',
          message: 'Failed to fetch Drive file metadata',
          requestId,
        },
        { status: 500 }
      );
    }

    // Invoke the existing ingest handler in this request context. Authentication,
    // corpus checks, physical variants, and provenance remain owned by ingest.
    const ingestResponse = await ingestDriveMedia(new Request(request.url, {
      method: 'POST',
      headers: request.headers,
      body: JSON.stringify({
        fileId: effectiveFileId,
        sharedDriveId: effectiveCorpusId === 'root' ? undefined : effectiveCorpusId,
        originalShortcutId,
        roles: ['gallery'],
      }),
    }));
    const ingested = await ingestResponse.json();
    if (!ingestResponse.ok) {
      return NextResponse.json({ ...ingested, requestId, committed: false }, { status: ingestResponse.status });
    }
    if (!ingested.mediaId || ingested.media?.id !== ingested.mediaId) {
      throw new AssignmentBatchError('INVALID_MATERIALIZATION_RESULT',
        'Ingest did not return a canonical published asset.', 502);
    }
    const result = await assignMediaBatch(ingested.mediaId, targets);
    return NextResponse.json({ ...result, media: ingested.media, requestId });
  } catch (error) {
    if (error instanceof AssignmentBatchError) {
      return NextResponse.json({
        error: error.code, message: error.message, committed: false, ...error.details, requestId,
      }, { status: error.status });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'INVALID_REQUEST', committed: false, requestId }, { status: 400 });
    }
    console.error('[USE_DRIVE_ASSET] Transaction error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    
    // Lock is released in finally block, no need to release here
    return NextResponse.json(
      {
        error: 'TRANSACTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  } finally {
    // P0 FIX: Always release lock in finally block
    if (ownershipToken && stableIdempotencyKey) {
      await releaseTransactionLock(stableIdempotencyKey, ownershipToken);
    }
  }
}
