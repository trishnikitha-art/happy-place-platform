/**
 * Admin Project Card API Endpoint
 * 
 * Updates the hero mediaId for a project in projects.v1.json
 * 
 * POST /api/admin/projects/card
 * Body: { projectId: string, mediaId: string }
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";

export async function POST(request: Request) {
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
    const { projectId, mediaId } = body;

    if (!projectId || !mediaId) {
      return NextResponse.json(
        { error: "projectId and mediaId are required" },
        { status: 400 }
      );
    }

    console.log('[DND SERVER 1] REQUEST_RECEIVED', { projectId, mediaId });
    console.log('[DND SERVER 2] IDENTIFIER_VALIDATION', { projectId, mediaId });

    // Read projects.v1.json
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    console.log('[DND SERVER 3] AUTHORITY_BEFORE', { projectId, currentMediaId: projectsData.projects.find((p: any) => p.id === projectId)?.media?.hero });

    // Find project and update hero mediaId
    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const newMediaId = mediaId;
    projectsData.projects[projectIndex].media.hero = newMediaId;
    projectsData.generatedAt = new Date().toISOString();

    console.log('[DND SERVER 4] AUTHORITY_WRITE', { projectId, newMediaId });

    // Write back
    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

    console.log('[DND SERVER 5] AUTHORITY_AFTER', { projectId, updatedMediaId: projectsData.projects[projectIndex].media?.hero });

    // Read-back verification
    const readBackData = JSON.parse(readFileSync(projectsPath, "utf-8"));
    const readBackMediaId = readBackData.projects.find((p: any) => p.id === projectId)?.media?.hero;
    const matchesExpected = readBackMediaId === newMediaId;

    console.log('[DND SERVER 6] READ_BACK_VERIFICATION', { projectId, projectMediaId: readBackMediaId, matchesExpected });

    console.log('[DND SERVER 7] RESPONSE', { success: true, projectId, mediaId });

    return NextResponse.json({ success: true, projectId, mediaId });
  } catch (error) {
    console.error("Error updating project card:", error);
    return NextResponse.json(
      { error: "Failed to update project card" },
      { status: 500 }
    );
  }
}
