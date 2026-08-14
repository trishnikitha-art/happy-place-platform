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
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { loadMediaManifest } from "@/lib/media";
import { getSystemStatus } from "@/lib/system-status";
import { workbenchSession } from "@/lib/workbench-session";

export async function GET() {
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
