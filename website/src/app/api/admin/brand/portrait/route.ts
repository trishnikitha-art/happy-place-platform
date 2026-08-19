/**
 * Admin Brand Portrait API Endpoint
 * 
 * Updates the owner portrait mediaId using persistent assignment store
 * 
 * POST /api/admin/brand/portrait
 * Body: { mediaId: string }
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { storeServiceCardAssignment, getServiceCardAssignment } from "@/lib/assignment-store";

export async function POST(request: Request) {
  const requestId = `portrait-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[BRAND PORTRAIT] REQUEST_RECEIVED', { requestId });

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

    console.log('[BRAND PORTRAIT] IDENTIFIER_VALIDATION', {
      requestId,
      mediaId,
    });

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    // Store assignment in persistent store using brand-portrait as serviceSlug
    const assignment = {
      serviceSlug: 'brand-portrait',
      mediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench' as const,
    };

    await storeServiceCardAssignment(assignment, requestId);

    console.log('[BRAND PORTRAIT] ASSIGNMENT_STORED', {
      requestId,
      mediaId,
    });

    // Read back to verify
    const storedAssignment = await getServiceCardAssignment('brand-portrait', requestId);
    console.log('[BRAND PORTRAIT] ASSIGNMENT_VERIFICATION', {
      requestId,
      storedMediaId: storedAssignment?.mediaId,
      matchesExpected: storedAssignment?.mediaId === mediaId,
    });

    console.log('[BRAND PORTRAIT] RESPONSE', {
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
    console.error('[BRAND PORTRAIT ERROR]', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json(
      { 
        error: "Failed to update brand portrait", 
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId,
        operationId: requestId 
      },
      { status: 500 }
    );
  }
}
