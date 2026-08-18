/**
 * Admin Project Gallery Photo API Endpoint
 * 
 * Updates a specific gallery photo mediaId for a project in projects.v1.json
 * 
 * POST /api/admin/projects/gallery
 * Body: { projectId: string, galleryIndex: number, mediaId: string }
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
    const { projectId, galleryIndex, mediaId } = body;

    if (!projectId || galleryIndex === undefined || !mediaId) {
      return NextResponse.json(
        { error: "projectId, galleryIndex, and mediaId are required" },
        { status: 400 }
      );
    }

    console.log('[DND SERVER 1] REQUEST_RECEIVED', { projectId, galleryIndex, mediaId });
    console.log('[DND SERVER 2] IDENTIFIER_VALIDATION', { projectId, galleryIndex, mediaId });

    // Read projects.v1.json
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    console.log('[DND SERVER 3] AUTHORITY_BEFORE', { projectId, galleryIndex, currentMediaId: projectsData.projects.find(p => p.id === projectId)?.media?.gallery?.[galleryIndex] });

    // Find project and update gallery photo mediaId
    const projectIndex = projectsData.projects.findIndex(p => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!projectsData.projects[projectIndex].media.gallery) {
      return NextResponse.json(
        { error: "Project has no gallery" },
        { status: 400 }
      );
    }

    if (galleryIndex < 0 || galleryIndex >= projectsData.projects[projectIndex].media.gallery.length) {
      return NextResponse.json(
        { error: "Gallery index out of bounds" },
        { status: 400 }
      );
    }

    const newMediaId = mediaId;
    projectsData.projects[projectIndex].media.gallery[galleryIndex] = newMediaId;
    projectsData.generatedAt = new Date().toISOString();

    console.log('[DND SERVER 4] AUTHORITY_WRITE', { projectId, galleryIndex, newMediaId });

    // Write back
    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

    console.log('[DND SERVER 5] AUTHORITY_AFTER', { projectId, galleryIndex, updatedMediaId: projectsData.projects[projectIndex].media.gallery[galleryIndex] });

    // Read-back verification
    const readBackData = JSON.parse(readFileSync(projectsPath, "utf-8"));
    const readBackMediaId = readBackData.projects.find(p => p.id === projectId)?.media?.gallery?.[galleryIndex];
    const matchesExpected = readBackMediaId === newMediaId;

    console.log('[DND SERVER 6] READ_BACK_VERIFICATION', { projectId, galleryIndex, galleryMediaId: readBackMediaId, matchesExpected });

    console.log('[DND SERVER 7] RESPONSE', { success: true, projectId, galleryIndex, mediaId });

    return NextResponse.json({ success: true, projectId, galleryIndex, mediaId });
  } catch (error) {
    console.error("Error updating project gallery photo:", error);
    return NextResponse.json(
      { error: "Failed to update project gallery photo" },
      { status: 500 }
    );
  }
}
