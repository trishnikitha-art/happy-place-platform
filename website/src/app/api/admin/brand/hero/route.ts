/**
 * Admin Brand Hero API Endpoint
 * 
 * Updates the homepage hero mediaId using persistent assignment store
 * 
 * POST /api/admin/brand/hero
 * Body: { mediaId: string }
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { storeServiceCardAssignment, getServiceCardAssignment } from "@/lib/assignment-store";
import { getMediaByIdAsync } from "@/lib/media";
import { isDriveReference, isPublishedMediaAsset } from "@/types/media";

export async function POST(request: Request) {
  const requestId = `hero-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[BRAND HERO] REQUEST_RECEIVED', { requestId });

  // TEMPORARY LOCAL DEVELOPMENT BYPASS: Skip authentication in development
  if (process.env.NODE_ENV === 'development') {
    // Proceed without authentication
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Workbench authentication required" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json();
    const { mediaId } = body;

    console.log('[BRAND HERO] IDENTIFIER_VALIDATION', {
      requestId,
      mediaId,
    });

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    // WORKBENCH ACCEPTANCE CONTRACT: DriveReference must be materialized before assignment
    // Check if mediaId is a DriveReference
    const media = await getMediaByIdAsync(mediaId);
    if (!media) {
      return NextResponse.json(
        { error: "Media not found", message: "The specified media ID does not exist" },
        { status: 404 }
      );
    }

    // REJECT: DriveReference cannot be directly assigned - must be materialized first
    if (isDriveReference(media)) {
      console.error('[WORKBENCH_ACCEPTANCE] REJECTED: DriveReference cannot be directly assigned', {
        requestId,
        mediaId,
        lifecycleState: media.lifecycleState,
      });
      return NextResponse.json(
        { 
          error: "Asset must be materialized", 
          message: "DriveReference cannot be directly assigned to public presentation. The asset must be materialized to a PublishedMediaAsset before assignment.",
          lifecycleState: media.lifecycleState,
          requiresMaterialization: true,
        },
        { status: 400 }
      );
    }

    // VALIDATE: Only PublishedMediaAsset can be assigned
    if (!isPublishedMediaAsset(media)) {
      console.error('[WORKBENCH_ACCEPTANCE] REJECTED: Media is not a PublishedMediaAsset', {
        requestId,
        mediaId,
        lifecycleState: media.lifecycleState,
        source: media.source,
      });
      return NextResponse.json(
        { 
          error: "Invalid media lifecycle state", 
          message: "Only PublishedMediaAsset can be assigned to public presentation",
          lifecycleState: media.lifecycleState,
          source: media.source,
        },
        { status: 400 }
      );
    }

    console.log('[WORKBENCH_ACCEPTANCE] APPROVED: PublishedMediaAsset can be assigned', {
      requestId,
      mediaId,
      lifecycleState: media.lifecycleState,
    });

    // Store assignment in persistent store using brand-hero as serviceSlug
    const assignment = {
      serviceSlug: 'brand-hero',
      mediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench' as const,
    };

    await storeServiceCardAssignment(assignment, undefined, requestId);

    console.log('[BRAND HERO] ASSIGNMENT_STORED', {
      requestId,
      mediaId,
    });

    // Read back to verify
    const storedAssignment = await getServiceCardAssignment('brand-hero', requestId);
    console.log('[BRAND HERO] ASSIGNMENT_VERIFICATION', {
      requestId,
      storedMediaId: storedAssignment?.mediaId,
      matchesExpected: storedAssignment?.mediaId === mediaId,
    });

    console.log('[BRAND HERO] RESPONSE', {
      requestId,
      success: true,
      mediaId,
    });

    return NextResponse.json({ 
      success: true, 
      mediaId,
      assignment,
      requestId,
      operationId: requestId 
    });
  } catch (error) {
    console.error('[BRAND HERO ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { 
        error: "Failed to update brand hero", 
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        operationId: requestId 
      },
      { status: 500 }
    );
  }
}
