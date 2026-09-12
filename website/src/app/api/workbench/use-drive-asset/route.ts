/**
 * Workbench Use Drive Asset API Route
 *
 * AUTHORITATIVE TRANSACTION: Drive Source → Target Slot
 *
 * This endpoint implements the deterministic "Use This Asset" transaction:
 * - Source: Drive file ID + corpus (My Drive/Shared Drive)
 * - Target: Explicit Visual Slot ID
 * - Result: Canonical PublishedMediaAsset ID assigned to target slot
 *
 * AUTHORIZATION MODEL (P1 #6):
 * 
 * This endpoint uses TWO SEPARATE authorization systems:
 * 1. Workbench Session: Authenticates human/admin to Workbench
 * 2. Drive OAuth: Authenticates to Google Drive
 * 
 * CRITICAL LIMITATION: These systems are NOT cryptographically bound together.
 * Workbench session identity ≠ Drive authorization identity ≠ Google subject
 * 
 * This is architecturally acceptable ONLY under the assumption:
 * - Workbench access is strictly controlled (single trusted admin)
 * - Drive OAuth is strictly scoped (read-only, no write permissions)
 * - Corpus allowlist is environment-configured (not user-configurable)
 * 
 * DO NOT claim this is a universal multi-user authorization model.
 * FUTURE: Implement explicit binding of Workbench ↔ Drive identity if multi-user support is needed.
 * 
 * ATOMICITY MODEL (P1 #9):
 * 
 * This transaction is NOT strictly atomic across all operations. The honest model is:
 * 
 * NON-ATOMIC (can succeed independently):
 * - Drive metadata fetch (auth + verification)
 * - Drive download
 * - Content hashing
 * - Sharp variant generation
 * - Blob upload (variants stored independently)
 * - KV media record write (PublishedMediaAsset can exist without assignment)
 * - Assignment CAS mutation (can succeed without public verification)
 * - Assignment readback (can succeed with wrong media ID)
 * - Public resolver verification (read-only, can return null)
 * 
 * ATOMIC BOUNDARY (all-or-nothing):
 * - The entire transaction only returns success if ALL steps complete AND
 *   the final readback media ID matches the canonical media ID AND
 *   the public resolver returns a valid media object.
 * 
 * IDEMPOTENCY (P0 #5):
 * - Idempotency key = sourceFileId:targetSlotId (stable identity)
 * - Successful results are cached in KV with 1-hour TTL
 * - Retry with same key returns cached success result
 * - Failures are not cached (allows retry)
 * 
 * CRITICAL: The endpoint NEVER returns success unless:
 * 1. Public media gate returns truthy (not null/undefined)
 * 2. Assignment readback media ID equals canonical media ID
 * 3. CAS/revision protection was used
 * 4. Target slot type is supported (brand or service-card)
 * 
 * FAILURE MODES (fail-closed):
 * - Public media gate returns null → 400 error
 * - Assignment readback mismatch → 500 error
 * - CAS conflict → handled by assignment store
 * - Unsupported slot type → 400 error
 * - Drive file not found → 404 error
 * - MIME type not image → 400 error
 * - Corpus mismatch → 400 error
 * 
 * This is NOT a scan-all-assignments operation. The target is explicit.
 */

/**
 * SERVER-SIDE VISUAL SLOT AUTHORITY REGISTRY
 * 
 * This is the authoritative mapping of writable Visual Slots to their mutation authorities.
 * This is NOT the client-side slotRegistry (which is for UI discovery).
 * 
 * Architecture:
 * Visual Slot ID → Authority Type → Authority Key → Mutation Adapter
 * 
 * Authority Types:
 * - service-card-assignment: Mutates via Service Card Assignment Store (KV)
 * - static-project: Static-only (projects.v1.json) - NOT writable at runtime
 * - decorative: Intentionally non-assignable
 * 
 * Mutation Adapters:
 * - service-card-assignment: storeServiceCardAssignment() with CAS
 * - static-project: NONE (reject at runtime)
 * - decorative: NONE (reject always)
 */

interface SlotAuthorityMapping {
  visualSlotId: string;
  authorityType: 'service-card-assignment' | 'static-project' | 'decorative';
  authorityKey: string;
  writable: boolean;
  description: string;
}

/**
 * Authoritative allowlist of writable Visual Slots
 * This is the server-side source of truth for which slots can be mutated via Drive handoff
 */
const VISUAL_SLOT_AUTHORITY: SlotAuthorityMapping[] = [
  // Brand slots - writable via Service Card Assignment Store
  {
    visualSlotId: 'hero-background',
    authorityType: 'service-card-assignment',
    authorityKey: 'brand-hero-background',
    writable: true,
    description: 'Homepage hero background image',
  },
  {
    visualSlotId: 'homepage-owner-portrait-slot',
    authorityType: 'service-card-assignment',
    authorityKey: 'brand-portrait-homepage',
    writable: true,
    description: 'Homepage owner portrait',
  },
];

/**
 * Resolve Visual Slot ID to its authoritative mutation mapping
 * Returns null if slot is not in the authoritative registry
 */
function resolveVisualSlotAuthority(targetSlotId: string): SlotAuthorityMapping | null {
  const mapping = VISUAL_SLOT_AUTHORITY.find(slot => slot.visualSlotId === targetSlotId);
  return mapping || null;
}

/**
 * Service card slot authority resolution
 * Service cards use slug-based authority keys
 * Returns null if the slot format is invalid
 */
function resolveServiceCardAuthority(targetSlotId: string): SlotAuthorityMapping | null {
  // Service card slots have format: homepage-service-card-slot-{slug}
  if (targetSlotId.startsWith('homepage-service-card-slot-')) {
    const slug = targetSlotId.replace('homepage-service-card-slot-', '');
    return {
      visualSlotId: targetSlotId,
      authorityType: 'service-card-assignment',
      authorityKey: slug,
      writable: true,
      description: `Service card slot for ${slug}`,
    };
  }

  // Legacy format: service-card-{slug}
  if (targetSlotId.startsWith('service-card-')) {
    const slug = targetSlotId.replace('service-card-', '');
    return {
      visualSlotId: targetSlotId,
      authorityType: 'service-card-assignment',
      authorityKey: slug,
      writable: true,
      description: `Service card slot for ${slug} (legacy format)`,
    };
  }

  return null;
}

/**
 * Resolve target slot to its authoritative mutation mapping
 * Checks both explicit Visual Slot registry and service card authority
 * Returns null if slot is not writable or not recognized
 */
function resolveTargetSlotAuthority(targetSlotId: string): SlotAuthorityMapping | null {
  // First check explicit Visual Slot registry
  const explicitMapping = resolveVisualSlotAuthority(targetSlotId);
  if (explicitMapping) {
    return explicitMapping;
  }

  // Then check service card authority
  const serviceCardMapping = resolveServiceCardAuthority(targetSlotId);
  if (serviceCardMapping) {
    return serviceCardMapping;
  }

  // Slot not recognized - reject
  return null;
}


import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { storeServiceCardAssignment, getServiceCardAssignment } from '@/lib/assignment-store';
import { resolvePublicMedia } from '@/lib/media';
import { Redis } from '@upstash/redis';
import { getDriveClient } from '@/lib/drive/oauth-manager';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const IDEMPOTENCY_PREFIX = 'use-drive-asset-idempotency:';

/**
 * Check if operation with this idempotency key has already completed
 * Returns the cached result if present, null if not found
 */
async function checkIdempotency(idempotencyKey: string): Promise<any | null> {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    
    if (!url || !token) {
      console.warn('[USE_DRIVE_ASSET] KV unavailable - idempotency check skipped');
      return null;
    }

    const redis = new Redis({ url, token });
    const key = `${IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    const cached = await redis.get(key);
    
    if (cached) {
      console.log('[USE_DRIVE_ASSET] Idempotency hit - returning cached result', { idempotencyKey });
      return JSON.parse(cached as string);
    }
    
    return null;
  } catch (error) {
    console.error('[USE_DRIVE_ASSET] Idempotency check failed', { error });
    return null; // Fail open - proceed with operation
  }
}

/**
 * Record the successful result of an operation for idempotency
 */
async function recordIdempotency(idempotencyKey: string, result: any, ttlSeconds: number = 3600): Promise<void> {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    
    if (!url || !token) {
      console.warn('[USE_DRIVE_ASSET] KV unavailable - idempotency record skipped');
      return;
    }

    const redis = new Redis({ url, token });
    const key = `${IDEMPOTENCY_PREFIX}${idempotencyKey}`;
    await redis.set(key, JSON.stringify(result), { ex: ttlSeconds });
    
    console.log('[USE_DRIVE_ASSET] Idempotency recorded', { idempotencyKey, ttlSeconds });
  } catch (error) {
    console.error('[USE_DRIVE_ASSET] Idempotency record failed', { error });
    // Non-critical - proceed even if recording fails
  }
}

interface UseDriveAssetRequest {
  sourceFileId: string;  // Google Drive file ID
  sourceSharedDriveId?: string;  // Shared Drive corpus context (null for My Drive)
  targetSlotId: string;  // Explicit target Visual Slot ID
  expectedRevision: number;  // CAS revision for the target slot (REQUIRED - no fallback)
  idempotencyKey?: string;  // Stable client-generated key for idempotency
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

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
    const { 
      sourceFileId, 
      sourceSharedDriveId, 
      targetSlotId,
      expectedRevision,
      idempotencyKey
    } = body;

    // P0 FIX: Generate stable idempotency key if not provided
    // Key = sourceFileId + targetSlotId (stable identity for this logical operation)
    const stableIdempotencyKey = idempotencyKey || `${sourceFileId}:${targetSlotId}`;

    console.log('[USE_DRIVE_ASSET] Idempotency check', {
      requestId,
      idempotencyKey: stableIdempotencyKey,
      provided: !!idempotencyKey,
    });

    // P0 FIX: Check if this operation has already completed
    const cachedResult = await checkIdempotency(stableIdempotencyKey);
    if (cachedResult) {
      console.log('[USE_DRIVE_ASSET] Returning cached result from idempotency check', {
        requestId,
        idempotencyKey: stableIdempotencyKey,
      });
      return NextResponse.json(cachedResult);
    }

    console.log('[USE_DRIVE_ASSET] Transaction initiated', {
      requestId,
      targetSlotId,
      expectedRevision,
    });

    // Validate required fields
    if (!sourceFileId || !targetSlotId) {
      return NextResponse.json(
        {
          error: 'REQUIRED_FIELDS_MISSING',
          message: 'sourceFileId and targetSlotId are required',
          requestId,
        },
        { status: 400 }
      );
    }

    // P0 FIX: expectedRevision is required for CAS enforcement
    if (expectedRevision === undefined || expectedRevision === null) {
      return NextResponse.json(
        {
          error: 'EXPECTED_REVISION_REQUIRED',
          message: 'expectedRevision is required for CAS enforcement (read current assignment first, use 0 for create)',
          requestId,
        },
        { status: 400 }
      );
    }

    // Step 2: Authorize Drive corpus access and fetch authoritative source metadata
    // P1 FIX: Fetch authoritative Drive metadata server-side, don't trust browser-supplied values
    console.log('[USE_DRIVE_ASSET] Fetching authoritative Drive metadata', {
      requestId,
    });

    const driveClient = await getDriveClient();
    let authoritativeDriveMetadata: any = null;

    try {
      const fileMetadata = await driveClient.files.get({
        fileId: sourceFileId,
        fields: 'id,name,mimeType,driveId,owners,shared',
        supportsAllDrives: true,
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
      const actualMimeType = authoritativeDriveMetadata.mimeType;
      const actualDriveId = authoritativeDriveMetadata.driveId;
      const actualCorpusId = actualDriveId || 'root';

      console.log('[USE_DRIVE_ASSET] Authoritative Drive metadata retrieved', {
        requestId,
        actualName: authoritativeDriveMetadata.name,
        actualMimeType,
        actualCorpusId,
        requestedSharedDriveId: sourceSharedDriveId,
      });

      // P1 FIX: Verify requested Shared Drive ID matches actual Drive ID
      if (sourceSharedDriveId && sourceSharedDriveId !== actualCorpusId) {
        return NextResponse.json(
          {
            error: 'CORPUS_MISMATCH',
            message: `Requested Shared Drive ID (${sourceSharedDriveId}) does not match actual file corpus (${actualCorpusId})`,
            details: {
              requested: sourceSharedDriveId,
              actual: actualCorpusId,
            },
            requestId,
          },
          { status: 400 }
        );
      }

      // P1 FIX: Validate MIME type is an image
      if (!actualMimeType || !actualMimeType.startsWith('image/')) {
        return NextResponse.json(
          {
            error: 'INVALID_MIME_TYPE',
            message: `Drive file is not an image: ${actualMimeType}`,
            details: {
              actualMimeType,
            },
            requestId,
          },
          { status: 400 }
        );
      }
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

    // Step 3: Resolve or materialize Drive file to canonical PublishedMediaAsset
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const ingestUrl = `${baseUrl}/api/drive/ingest`;
    const ingestBody = {
      fileId: sourceFileId,
      sharedDriveId: sourceSharedDriveId,
      roles: ['gallery'],
      skipReconciliation: true, // P0 FIX: Prevent implicit assignment reconciliation
    };

    console.log('[USE_DRIVE_ASSET] Resolving canonical asset', {
      requestId,
      ingestUrl,
    });

    const ingestResponse = await fetch(ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify(ingestBody),
    });

    if (!ingestResponse.ok) {
      const error = await ingestResponse.json();
      console.error('[USE_DRIVE_ASSET] Canonical asset resolution failed', {
        requestId,
        error,
        status: ingestResponse.status,
      });
      return NextResponse.json(
        {
          error: error.error || 'CANONICAL_RESOLUTION_FAILED',
          message: error.message || 'Failed to resolve Drive file to canonical media',
          details: error,
          requestId,
        },
        { status: ingestResponse.status }
      );
    }

    const ingestResult = await ingestResponse.json();
    const canonicalMediaId = ingestResult.media?.id;
    const canonicalAsset = ingestResult.media;

    if (!canonicalMediaId || !canonicalAsset) {
      console.error('[USE_DRIVE_ASSET] Canonical asset missing from response', {
        requestId,
        ingestResult,
      });
      return NextResponse.json(
        {
          error: 'CANONICAL_ASSET_MISSING',
          message: 'Drive file resolved but no canonical media ID returned',
          requestId,
        },
        { status: 500 }
      );
    }

    console.log('[USE_DRIVE_ASSET] Canonical asset resolved', {
      requestId,
      canonicalMediaId,
      filename: canonicalAsset.filename,
      existingAsset: !!ingestResult.existing,
    });

    // Step 4: Validate PublishedMediaAsset through public media contract
    // P0 FIX: Explicitly require truthy resolution - null/undefined rejection
    const publicMedia = await resolvePublicMedia(canonicalMediaId);
    console.log('[USE_DRIVE_ASSET] Public media gate validation', {
      requestId,
      canonicalMediaId,
      resolved: !!publicMedia,
    });

    if (!publicMedia) {
      console.error('[USE_DRIVE_ASSET] Public media gate rejected - null resolution', {
        requestId,
        canonicalMediaId,
        reason: 'resolvePublicMedia returned null/undefined',
      });
      return NextResponse.json(
        {
          error: 'PUBLIC_MEDIA_GATE_REJECTED',
          message: 'Canonical asset failed public media gate validation (null resolution)',
          requestId,
        },
        { status: 400 }
      );
    }

    // Step 5: Mutate exactly the requested target slot with CAS/revision protection
    // P0 FIX: Resolve target slot through authoritative registry
    const slotAuthority = resolveTargetSlotAuthority(targetSlotId);
    
    console.log('[USE_DRIVE_ASSET] Target slot authority resolved', {
      requestId,
      targetSlotId,
      authorityFound: !!slotAuthority,
    });

    if (!slotAuthority) {
      console.error('[USE_DRIVE_ASSET] Unknown or unsupported target slot', {
        requestId,
        targetSlotId,
        reason: 'Slot not in authoritative registry or not writable',
      });
      return NextResponse.json(
        {
          error: 'UNKNOWN_TARGET_SLOT',
          message: `Target slot '${targetSlotId}' is not in the authoritative Visual Slot registry or is not writable at runtime`,
          details: {
            targetSlotId,
            note: 'Only brand slots and service card slots are writable via Drive handoff. Project slots are static-only.',
          },
          requestId,
        },
        { status: 400 }
      );
    }

    if (!slotAuthority.writable) {
      console.error('[USE_DRIVE_ASSET] Target slot is not writable', {
        requestId,
        targetSlotId,
        authorityType: slotAuthority.authorityType,
        reason: 'Slot is static-only or intentionally non-assignable',
      });
      return NextResponse.json(
        {
          error: 'SLOT_NOT_WRITABLE',
          message: `Target slot '${targetSlotId}' is not writable at runtime (authority type: ${slotAuthority.authorityType})`,
          details: {
            targetSlotId,
            authorityType: slotAuthority.authorityType,
            note: 'Static slots cannot be mutated via Drive handoff',
          },
          requestId,
        },
        { status: 400 }
      );
    }

    // P0 FIX: Only service-card-assignment authority is currently supported
    if (slotAuthority.authorityType !== 'service-card-assignment') {
      console.error('[USE_DRIVE_ASSET] Unsupported authority type', {
        requestId,
        targetSlotId,
        authorityType: slotAuthority.authorityType,
        reason: 'Only service-card-assignment authority is currently implemented',
      });
      return NextResponse.json(
        {
          error: 'UNSUPPORTED_AUTHORITY_TYPE',
          message: `Target slot '${targetSlotId}' has authority type '${slotAuthority.authorityType}' which is not yet implemented`,
          details: {
            targetSlotId,
            authorityType: slotAuthority.authorityType,
            note: 'Only service-card-assignment authority is currently supported',
          },
          requestId,
        },
        { status: 501 }
      );
    }

    const serviceSlug = slotAuthority.authorityKey;

    console.log('[USE_DRIVE_ASSET] Authority mapping confirmed', {
      requestId,
      targetSlotId,
      authorityType: slotAuthority.authorityType,
      authorityKey: serviceSlug,
      writable: slotAuthority.writable,
    });

    // Get current assignment for CAS semantics
    const currentAssignment = await getServiceCardAssignment(serviceSlug);

    console.log('[USE_DRIVE_ASSET] CAS revision check', {
      requestId,
      serviceSlug,
      currentRevision: currentAssignment?.revision,
      expectedRevision,
    });

    // Create new assignment
    const newAssignment = {
      serviceSlug,
      mediaId: canonicalMediaId,
      source: 'workbench' as const,
      updatedAt: new Date().toISOString(),
      actor: 'workbench' as const,
    };

    // Store with CAS semantics
    await storeServiceCardAssignment(newAssignment, expectedRevision, requestId);

    console.log('[USE_DRIVE_ASSET] Assignment committed', {
      requestId,
      serviceSlug,
      mediaId: canonicalMediaId,
      expectedRevision,
    });

    // Step 6: Read assignment back from authoritative store
    const readbackAssignment = await getServiceCardAssignment(serviceSlug);

    console.log('[USE_DRIVE_ASSET] Assignment readback', {
      requestId,
      serviceSlug,
      readbackMediaId: readbackAssignment?.mediaId,
      expectedMediaId: canonicalMediaId,
      readbackRevision: readbackAssignment?.revision,
    });

    // Step 7: Verify readback media ID equals canonical media ID
    if (readbackAssignment?.mediaId !== canonicalMediaId) {
      console.error('[USE_DRIVE_ASSET] Assignment readback mismatch', {
        requestId,
        readbackMediaId: readbackAssignment?.mediaId,
        expectedMediaId: canonicalMediaId,
      });
      return NextResponse.json(
        {
          error: 'ASSIGNMENT_READBACK_MISMATCH',
          message: 'Assignment readback failed: media ID mismatch',
          details: {
            readbackMediaId: readbackAssignment?.mediaId,
            expectedMediaId: canonicalMediaId,
          },
          requestId,
        },
        { status: 500 }
      );
    }

    // Step 8: Return success only if all steps complete
    console.log('[USE_DRIVE_ASSET] Transaction complete', {
      requestId,
      targetSlotId,
      canonicalMediaId,
      revision: readbackAssignment?.revision,
    });

    const successResult = {
      success: true,
      canonicalMediaId,
      targetSlotId,
      serviceSlug,
      assignment: readbackAssignment,
      asset: canonicalAsset,
      requestId,
    };

    // P0 FIX: Record successful result for idempotency
    await recordIdempotency(stableIdempotencyKey, successResult);

    return NextResponse.json(successResult);
  } catch (error) {
    console.error('[USE_DRIVE_ASSET] Transaction error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        error: 'TRANSACTION_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
