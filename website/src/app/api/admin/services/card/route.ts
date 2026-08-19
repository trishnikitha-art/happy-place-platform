/**
 * Admin Services Card API Endpoint
 * 
 * Updates the service card mediaId using persistent assignment store
 * 
 * POST /api/admin/services/card
 * Body: { serviceSlug: string, mediaId: string }
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { storeServiceCardAssignment, getServiceCardAssignment } from "@/lib/assignment-store";
import { getAllServices } from "@/lib/registries";

export const runtime = 'nodejs';

export async function POST(request: Request) {
  console.log('[DND SERVER 1] REQUEST_RECEIVED');

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
    const { serviceSlug, mediaId } = body;

    console.log('[DND SERVER 2] IDENTIFIER_VALIDATION', {
      serviceSlug,
      mediaId,
    });

    if (!serviceSlug) {
      return NextResponse.json(
        { error: "serviceSlug is required" },
        { status: 400 }
      );
    }

    if (!mediaId) {
      return NextResponse.json(
        { error: "mediaId is required" },
        { status: 400 }
      );
    }

    // Verify the service exists in static configuration
    const services = getAllServices();
    const service = services.find(s => s.slug === serviceSlug);
    
    if (!service) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    console.log('[DND SERVER 3] SERVICE_VERIFIED', {
      serviceSlug,
      serviceExists: true,
    });

    // Store assignment in persistent store
    const assignment = {
      serviceSlug,
      mediaId,
      updatedAt: new Date().toISOString(),
      source: 'workbench' as const,
    };

    await storeServiceCardAssignment(assignment);

    console.log('[DND SERVER 4] ASSIGNMENT_STORED', {
      serviceSlug,
      mediaId,
    });

    // Read back to verify
    const storedAssignment = await getServiceCardAssignment(serviceSlug);
    console.log('[DND SERVER 5] ASSIGNMENT_VERIFICATION', {
      serviceSlug,
      storedMediaId: storedAssignment?.mediaId,
      matchesExpected: storedAssignment?.mediaId === mediaId,
    });

    console.log('[DND SERVER 6] RESPONSE', {
      success: true,
      serviceSlug,
      mediaId,
    });

    return NextResponse.json({ 
      success: true, 
      serviceSlug, 
      mediaId,
      assignment 
    });
  } catch (error) {
    console.error('[DND SERVER ERROR]', error);
    return NextResponse.json(
      { 
        error: "Failed to update service card", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}