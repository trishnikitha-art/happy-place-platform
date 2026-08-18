/**
 * Admin Services Card API Endpoint
 * 
 * Updates the service card mediaId in services.v1.json
 * 
 * POST /api/admin/services/card
 * Body: { serviceSlug: string, mediaId: string }
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";

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

    // Read services.v1.json
    const servicesPath = join(process.cwd(), "src/config/services.v1.json");
    const servicesData = JSON.parse(readFileSync(servicesPath, "utf-8"));

    console.log('[DND SERVER 3] AUTHORITY_BEFORE', {
      serviceSlug,
      service: servicesData.services.find((s: any) => s.slug === serviceSlug),
    });

    // Find and update the service
    const serviceIndex = servicesData.services.findIndex((s: any) => s.slug === serviceSlug);
    if (serviceIndex === -1) {
      return NextResponse.json(
        { error: "Service not found" },
        { status: 404 }
      );
    }

    // Add or update the cardMediaId field
    servicesData.services[serviceIndex].cardMediaId = mediaId;
    servicesData.generatedAt = new Date().toISOString();

    console.log('[DND SERVER 4] AUTHORITY_WRITE', {
      serviceSlug,
      newCardMediaId: mediaId,
    });

    // Write back
    writeFileSync(servicesPath, JSON.stringify(servicesData, null, 2));

    console.log('[DND SERVER 5] AUTHORITY_AFTER', {
      serviceSlug,
      service: servicesData.services[serviceIndex],
    });

    // Read back to prove the write succeeded
    const readBackData = JSON.parse(readFileSync(servicesPath, "utf-8"));
    const readBackService = readBackData.services.find((s: any) => s.slug === serviceSlug);
    console.log('[DND SERVER 6] READ_BACK_VERIFICATION', {
      serviceSlug,
      cardMediaId: readBackService?.cardMediaId,
      matchesExpected: readBackService?.cardMediaId === mediaId,
    });

    console.log('[DND SERVER 7] RESPONSE', {
      success: true,
      serviceSlug,
      mediaId,
    });

    return NextResponse.json({ success: true, serviceSlug, mediaId });
  } catch (error) {
    console.error("Error updating service card:", error);
    return NextResponse.json(
      { error: "Failed to update service card" },
      { status: 500 }
    );
  }
}
