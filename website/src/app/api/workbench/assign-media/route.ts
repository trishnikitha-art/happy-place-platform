/**
 * Workbench Media Assignment API Route
 *
 * BRIDGE: Workbench UI → Media Assignment
 *
 * This endpoint handles media-to-slot assignment directly through the assignment store.
 * It validates that the mediaId resolves to a valid PublishedMediaAsset before assignment.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { storeServiceCardAssignment, getServiceCardAssignment } from '@/lib/assignment-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

interface AssignMediaRequest {
  slotId?: string; // DEPRECATED: single slot ID (backward compatibility)
  slotIds?: string[]; // NEW: multiple slot IDs
  mediaId: string;
  expectedRevision?: number; // DEPRECATED: single CAS revision (backward compatibility)
  slotRevisions?: Array<{ slotId: string; expectedRevision: number }>; // NEW: multi-slot CAS support
}

/**
 * P0 FIX: CAS Invariant Strengthening
 *
 * This endpoint now requires explicit expectedRevision for ALL requests (single and multi-slot).
 * The legacy fallback that derived revision from the store has been removed.
 *
 * Rationale:
 * - Automatic revision derivation weakens CAS protection
 * - Callers MUST read current state first and provide expected revision
 * - This prevents lost updates from stale UI state
 * - Use 0 for create (no existing assignment)
 *
 * Backward compatibility impact:
 * - Old callers that omitted expectedRevision will now receive 400 error
 * - This is intentional - the old behavior was unsafe
 * - Callers must be updated to read current revision first
 */

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    // Check Workbench authentication
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

    const body: AssignMediaRequest = await request.json();
    const { 
      slotId, // DEPRECATED: backward compatibility
      slotIds, // NEW: multi-slot support
      mediaId, 
      expectedRevision: clientExpectedRevision, // DEPRECATED: backward compatibility
      slotRevisions // NEW: multi-slot CAS support
    } = body;

    // Determine if this is a multi-slot or single-slot request
    const isMultiSlot = !!slotIds && slotIds.length > 0;
    const targetSlotIds = isMultiSlot ? slotIds : (slotId ? [slotId] : []);

    console.log('[WORKBENCH_ASSIGNMENT] Request received', {
      requestId,
      isMultiSlot,
      targetSlotIds,
      mediaId,
      slotRevisions,
      expectedRevision: clientExpectedRevision,
    });

    if (!mediaId || targetSlotIds.length === 0) {
      return NextResponse.json(
        {
          error: 'REQUIRED_FIELDS_MISSING',
          message: 'mediaId and slotId(s) are required',
          requestId,
        },
        { status: 400 }
      );
    }

    // P0 FIX: Require explicit CAS revisions for ALL requests (single and multi-slot)
    // Legacy fallback that derives revision from store is removed to strengthen CAS invariant
    // Callers MUST read current state first and provide expected revision
    if (isMultiSlot) {
      if (!slotRevisions || slotRevisions.length !== targetSlotIds.length) {
        return NextResponse.json(
          {
            error: 'SLOT_REVISIONS_REQUIRED',
            message: 'slotRevisions array must match slotIds length for multi-slot assignment',
            requestId,
          },
          { status: 400 }
        );
      }
    } else {
      // Single-slot also requires explicit expectedRevision
      if (clientExpectedRevision === undefined || clientExpectedRevision === null) {
        return NextResponse.json(
          {
            error: 'EXPECTED_REVISION_REQUIRED',
            message: 'expectedRevision is required for CAS enforcement (read current assignment first, use 0 for create)',
            requestId,
          },
          { status: 400 }
        );
      }
    }

    // Process each slot independently
    const slotResults: Array<{ slotId: string; serviceSlug: string; success: boolean; error?: string; revision?: number }> = [];
    
    for (const targetSlotId of targetSlotIds) {
      try {
        // Normalize service card slot IDs
        const serviceSlug = targetSlotId.startsWith('service-card-') 
          ? targetSlotId.replace('service-card-', '') 
          : targetSlotId;

        console.log('[WORKBENCH_ASSIGNMENT] Processing slot', {
          requestId,
          targetSlotId,
          serviceSlug,
        });

        // Determine expected revision for this slot
        let expectedRevision: number;
        if (isMultiSlot) {
          const slotRevision = slotRevisions!.find(sr => sr.slotId === targetSlotId);
          if (!slotRevision) {
            console.error('[WORKBENCH_ASSIGNMENT] Missing revision for slot', {
              requestId,
              targetSlotId,
            });
            slotResults.push({
              slotId: targetSlotId,
              serviceSlug,
              success: false,
              error: 'Missing expected revision',
            });
            continue;
          }
          expectedRevision = slotRevision.expectedRevision;
        } else {
          // Single-slot requires explicit expectedRevision (CAS invariant)
          expectedRevision = clientExpectedRevision!;
        }

        // Create new assignment
        const newAssignment = {
          serviceSlug,
          mediaId,
          source: 'workbench' as const,
          updatedAt: new Date().toISOString(),
          actor: 'workbench' as const,
        };

        // Store with CAS semantics - this validates mediaId resolves to PublishedMediaAsset
        const newRevision = await storeServiceCardAssignment(newAssignment, expectedRevision, requestId);

        console.log('[WORKBENCH_ASSIGNMENT] Slot assignment succeeded', {
          requestId,
          targetSlotId,
          serviceSlug,
          newRevision,
        });

        slotResults.push({
          slotId: targetSlotId,
          serviceSlug,
          success: true,
          revision: newRevision,
        });
      } catch (slotError) {
        console.error('[WORKBENCH_ASSIGNMENT] Slot assignment failed', {
          requestId,
          targetSlotId,
          error: slotError instanceof Error ? slotError.message : String(slotError),
        });

        slotResults.push({
          slotId: targetSlotId,
          serviceSlug: targetSlotId.startsWith('service-card-') ? targetSlotId.replace('service-card-', '') : targetSlotId,
          success: false,
          error: slotError instanceof Error ? slotError.message : String(slotError),
        });
      }
    }

    // Check if any slot assignments failed
    const failedSlots = slotResults.filter(r => !r.success);
    if (failedSlots.length > 0) {
      console.error('[WORKBENCH_ASSIGNMENT] Partial failure - some slot assignments failed', {
        requestId,
        failedSlots,
        succeededSlots: slotResults.filter(r => r.success),
      });
      
      return NextResponse.json(
        {
          error: 'PARTIAL_FAILURE',
          message: `${failedSlots.length} of ${slotResults.length} slot assignments failed`,
          details: {
            succeeded: slotResults.filter(r => r.success),
            failed: failedSlots,
          },
          requestId,
        },
        { status: 207 } // Multi-Status for partial success
      );
    }

    console.log('[WORKBENCH_ASSIGNMENT] All slot assignments succeeded', {
      requestId,
      slotCount: slotResults.length,
      slotResults,
    });

    return NextResponse.json({
      success: true,
      slotResults,
      requestId,
    });
  } catch (error) {
    console.error('[WORKBENCH_ASSIGNMENT] Error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      {
        error: 'ASSIGNMENT_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
        requestId,
      },
      { status: 500 }
    );
  }
}
