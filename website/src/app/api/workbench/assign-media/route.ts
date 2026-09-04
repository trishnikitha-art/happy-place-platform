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
  slotId: string;
  mediaId: string;
}

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
    const { slotId, mediaId } = body;

    console.log('[WORKBENCH_ASSIGNMENT] Request received', {
      requestId,
      slotId,
      mediaId,
    });

    if (!slotId || !mediaId) {
      return NextResponse.json(
        {
          error: 'REQUIRED_FIELDS_MISSING',
          message: 'slotId and mediaId are required',
          requestId,
        },
        { status: 400 }
      );
    }

    // Get current assignment for CAS semantics
    const currentAssignment = await getServiceCardAssignment(slotId);
    const expectedRevision = currentAssignment?.revision || 0;

    // Create new assignment
    const newAssignment = {
      serviceSlug: slotId,
      mediaId,
      source: 'workbench' as const,
      updatedAt: new Date().toISOString(),
      actor: 'workbench' as const,
    };

    // Store with CAS semantics - this validates mediaId resolves to PublishedMediaAsset
    await storeServiceCardAssignment(newAssignment, expectedRevision, requestId);

    console.log('[WORKBENCH_ASSIGNMENT] Success', {
      requestId,
      serviceSlug: slotId,
      mediaId,
      revision: expectedRevision + 1,
    });

    return NextResponse.json({
      success: true,
      assignment: newAssignment,
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
