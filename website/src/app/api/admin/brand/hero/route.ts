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

export async function POST(request: Request) {
  console.log('[BRAND HERO] REQUEST_RECEIVED');

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
      mediaId,
    });

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    // Store assignment in persistent store using brand-hero as serviceSlug
    const assignment = {
      serviceSlug: 'brand-hero',
      mediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench' as const,
    };

    await storeServiceCardAssignment(assignment);

    console.log('[BRAND HERO] ASSIGNMENT_STORED', {
      mediaId,
    });

    // Read back to verify
    const storedAssignment = await getServiceCardAssignment('brand-hero');
    console.log('[BRAND HERO] ASSIGNMENT_VERIFICATION', {
      storedMediaId: storedAssignment?.mediaId,
      matchesExpected: storedAssignment?.mediaId === mediaId,
    });

    console.log('[BRAND HERO] RESPONSE', {
      success: true,
      mediaId,
    });

    return NextResponse.json({ 
      success: true, 
      mediaId,
      assignment 
    });
  } catch (error) {
    console.error('[BRAND HERO ERROR]', error);
    return NextResponse.json(
      { 
        error: "Failed to update brand hero", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
