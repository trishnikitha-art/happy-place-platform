/**
 * Admin System Status API Endpoint
 * 
 * Returns the runtime SystemStatus for the admin dashboard.
 * 
 * GET /api/admin/system
 * 
 * This endpoint:
 * - Returns SystemStatus (Google Drive, variants, EXIF, queues)
 * - Separate from authority validation (this is runtime state)
 * 
 * No calculations in the dashboard - everything happens here.
 */

import { NextResponse } from "next/server";
import { loadMediaManifest } from "@/lib/media";
import { getSystemStatus } from "@/lib/system-status";

export async function GET() {
  try {
    // Load media authority for variant generation status
    const media = loadMediaManifest();

    // Get system status
    const systemStatus = getSystemStatus(media);

    return NextResponse.json(systemStatus);
  } catch (error) {
    console.error("Error getting system status:", error);
    return NextResponse.json(
      { error: "Failed to get system status" },
      { status: 500 }
    );
  }
}
