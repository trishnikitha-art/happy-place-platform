/**
 * Admin Service Preview API Endpoint
 * 
 * Updates the service preview mediaId in service-projection.json
 * 
 * POST /api/admin/service/preview
 * Body: { serviceSlug: string, mediaId: string }
 */

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { serviceSlug, mediaId } = body;

    if (!serviceSlug || !mediaId) {
      return NextResponse.json(
        { error: "serviceSlug and mediaId are required" },
        { status: 400 }
      );
    }

    // Read service-projection.json
    const projectionPath = join(process.cwd(), ".generated/service-projection.json");
    const projectionData = JSON.parse(readFileSync(projectionPath, "utf-8"));

    // Find the service and update its representative
    const service = projectionData.services.find((s: any) => s.serviceName === serviceSlug);
    if (!service) {
      return NextResponse.json(
        { error: `Service ${serviceSlug} not found in projection` },
        { status: 404 }
      );
    }

    // Get the media filename from media.v1.json
    const mediaPath = join(process.cwd(), "src/config/media.v1.json");
    const mediaData = JSON.parse(readFileSync(mediaPath, "utf-8"));
    const media = mediaData.media.find((m: any) => m.id === mediaId);
    
    if (!media) {
      return NextResponse.json(
        { error: `Media ${mediaId} not found in media.v1.json` },
        { status: 404 }
      );
    }

    // Update service representative
    service.serviceRepresentative = media.filename;
    projectionData.generatedAt = new Date().toISOString();

    // Write back
    writeFileSync(projectionPath, JSON.stringify(projectionData, null, 2));

    return NextResponse.json({ success: true, serviceSlug, mediaId, filename: media.filename });
  } catch (error) {
    console.error("Error updating service preview:", error);
    return NextResponse.json(
      { error: "Failed to update service preview" },
      { status: 500 }
    );
  }
}
