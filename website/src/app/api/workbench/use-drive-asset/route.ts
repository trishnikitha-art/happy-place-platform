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
 * The transaction:
 * 1. Authenticate Workbench session
 * 2. Authorize Drive corpus access
 * 3. Resolve or materialize Drive file to canonical PublishedMediaAsset
 * 4. Validate PublishedMediaAsset through public media contract
 * 5. Mutate exactly the requested target slot with CAS/revision protection
 * 6. Read assignment back from authoritative store
 * 7. Verify readback media ID equals canonical media ID
 * 8. Return success only if all steps complete
 *
 * This is NOT a scan-all-assignments operation. The target is explicit.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { storeServiceCardAssignment, getServiceCardAssignment } from '@/lib/assignment-store';
import { resolvePublicMedia } from '@/lib/media';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface UseDriveAssetRequest {
  sourceFileId: string;  // Google Drive file ID
  sourceSharedDriveId?: string;  // Shared Drive corpus context (null for My Drive)
  sourceFileName: string;
  sourceMimeType: string;
  targetSlotId: string;  // Explicit target Visual Slot ID
  expectedRevision?: number;  // CAS revision for the target slot
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
      sourceFileName, 
      sourceMimeType,
      targetSlotId,
      expectedRevision 
    } = body;

    console.log('[USE_DRIVE_ASSET] Transaction initiated', {
      requestId,
      sourceFileId,
      sourceSharedDriveId,
      sourceFileName,
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

    // Step 2: Authorize Drive corpus access (validate file exists and is accessible)
    // Step 3: Resolve or materialize Drive file to canonical PublishedMediaAsset
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const ingestUrl = `${baseUrl}/api/drive/ingest`;
    const ingestBody = {
      fileId: sourceFileId,
      sharedDriveId: sourceSharedDriveId,
      roles: ['gallery'],
    };

    console.log('[USE_DRIVE_ASSET] Resolving canonical asset', {
      requestId,
      ingestUrl,
      ingestBody,
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
    try {
      const publicMedia = await resolvePublicMedia(canonicalMediaId);
      console.log('[USE_DRIVE_ASSET] Public media gate validation', {
        requestId,
        canonicalMediaId,
        resolved: !!publicMedia,
      });
    } catch (gateError) {
      console.error('[USE_DRIVE_ASSET] Public media gate rejected', {
        requestId,
        canonicalMediaId,
        error: gateError instanceof Error ? gateError.message : String(gateError),
      });
      return NextResponse.json(
        {
          error: 'PUBLIC_MEDIA_GATE_REJECTED',
          message: 'Canonical asset failed public media gate validation',
          requestId,
        },
        { status: 400 }
      );
    }

    // Step 5: Mutate exactly the requested target slot with CAS/revision protection
    // Normalize service card slot IDs
    const serviceSlug = targetSlotId.startsWith('service-card-') 
      ? targetSlotId.replace('service-card-', '') 
      : targetSlotId;

    console.log('[USE_DRIVE_ASSET] Target slot normalized', {
      requestId,
      originalSlotId: targetSlotId,
      normalizedServiceSlug: serviceSlug,
    });

    // Get current assignment for CAS semantics
    const currentAssignment = await getServiceCardAssignment(serviceSlug);
    const actualExpectedRevision = expectedRevision ?? (currentAssignment?.revision || 0);

    console.log('[USE_DRIVE_ASSET] CAS revision check', {
      requestId,
      serviceSlug,
      currentRevision: currentAssignment?.revision,
      expectedRevision: actualExpectedRevision,
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
    await storeServiceCardAssignment(newAssignment, actualExpectedRevision, requestId);

    console.log('[USE_DRIVE_ASSET] Assignment committed', {
      requestId,
      serviceSlug,
      mediaId: canonicalMediaId,
      revision: actualExpectedRevision + 1,
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
      sourceFileId,
      targetSlotId,
      canonicalMediaId,
      revision: readbackAssignment?.revision,
    });

    return NextResponse.json({
      success: true,
      canonicalMediaId,
      targetSlotId,
      serviceSlug,
      assignment: readbackAssignment,
      asset: canonicalAsset,
      requestId,
    });
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
