/**
 * Admin Project Gallery Photo API Endpoint
 * 
 * Updates a specific gallery photo mediaId for a project in projects.v1.json
 * 
 * POST /api/admin/projects/gallery
 * Body: { projectId: string, galleryIndex: number, mediaId: string, operation: 'replace' | 'add' }
 * 
 * operation:
 *   - 'replace': Replace existing gallery item at index (default)
 *   - 'add': Append new mediaId to gallery (galleryIndex ignored)
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from "next/server";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { workbenchSession } from "@/lib/workbench-session";
import { getMediaById, getMediaByIdAsync } from "@/lib/media";

export const runtime = 'nodejs';

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
    const { projectId, galleryIndex, mediaId, operation = 'replace' } = body;

    if (!projectId || !mediaId) {
      return NextResponse.json(
        { error: "projectId and mediaId are required" },
        { status: 400 }
      );
    }

    if (operation === 'replace' && galleryIndex === undefined) {
      return NextResponse.json(
        { error: "galleryIndex is required for replace operation" },
        { status: 400 }
      );
    }

    console.log('[GALLERY POST] REQUEST_RECEIVED', { projectId, galleryIndex, mediaId, operation });

    // Validate mediaId exists in authoritative media sources
    const mediaExists = getMediaById(mediaId) || await getMediaByIdAsync(mediaId);
    if (!mediaExists) {
      console.log('[GALLERY POST] INVALID_MEDIA_ID', { mediaId });
      return NextResponse.json(
        { error: "Media ID not found in authoritative media sources" },
        { status: 400 }
      );
    }

    // Read projects.v1.json
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    // Find project
    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Ensure gallery array exists
    if (!projectsData.projects[projectIndex].media) {
      projectsData.projects[projectIndex].media = {};
    }
    if (!projectsData.projects[projectIndex].media.gallery) {
      projectsData.projects[projectIndex].media.gallery = [];
    }

    const gallery = projectsData.projects[projectIndex].media.gallery;

    if (operation === 'add') {
      // ADD: Append new mediaId to gallery
      console.log('[GALLERY ADD] BEFORE', { projectId, galleryLength: gallery.length, newMediaId: mediaId });
      gallery.push(mediaId);
      projectsData.generatedAt = new Date().toISOString();
      console.log('[GALLERY ADD] AFTER', { projectId, galleryLength: gallery.length, addedMediaId: mediaId });
    } else {
      // REPLACE: Update existing gallery item at index
      if (galleryIndex < 0 || galleryIndex >= gallery.length) {
        return NextResponse.json(
          { error: "Gallery index out of bounds" },
          { status: 400 }
        );
      }

      console.log('[GALLERY REPLACE] BEFORE', { projectId, galleryIndex, currentMediaId: gallery[galleryIndex], newMediaId: mediaId });
      gallery[galleryIndex] = mediaId;
      projectsData.generatedAt = new Date().toISOString();
      console.log('[GALLERY REPLACE] AFTER', { projectId, galleryIndex, updatedMediaId: gallery[galleryIndex] });
    }

    // Write back
    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

    // Read-back verification
    const readBackData = JSON.parse(readFileSync(projectsPath, "utf-8"));
    const readBackGallery = readBackData.projects.find((p: any) => p.id === projectId)?.media?.gallery;
    
    console.log('[GALLERY READ_BACK_VERIFICATION]', { 
      projectId, 
      operation,
      galleryLength: readBackGallery?.length,
      mediaId,
      added: operation === 'add' ? readBackGallery?.includes(mediaId) : readBackGallery?.[galleryIndex] === mediaId
    });

    return NextResponse.json({ 
      success: true, 
      projectId, 
      operation,
      galleryIndex: operation === 'add' ? readBackGallery?.length - 1 : galleryIndex,
      mediaId,
      galleryLength: readBackGallery?.length
    });
  } catch (error) {
    console.error("Error updating project gallery photo:", error);
    return NextResponse.json(
      { error: "Failed to update project gallery photo" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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
    const { projectId, galleryIndex } = body;

    if (!projectId || galleryIndex === undefined) {
      return NextResponse.json(
        { error: "projectId and galleryIndex are required" },
        { status: 400 }
      );
    }

    console.log('[GALLERY DELETE] REQUEST_RECEIVED', { projectId, galleryIndex });

    // Read projects.v1.json
    const projectsPath = join(process.cwd(), "src/config/projects.v1.json");
    const projectsData = JSON.parse(readFileSync(projectsPath, "utf-8"));

    // Find project and delete gallery photo mediaId
    const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
    if (projectIndex === -1) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!projectsData.projects[projectIndex].media?.gallery) {
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

    // Set to null to remove the assignment
    projectsData.projects[projectIndex].media.gallery[galleryIndex] = null;
    projectsData.generatedAt = new Date().toISOString();

    console.log('[GALLERY DELETE] AUTHORITY_WRITE', { projectId, galleryIndex });

    // Write back
    writeFileSync(projectsPath, JSON.stringify(projectsData, null, 2));

    console.log('[GALLERY DELETE] SUCCESS', { projectId, galleryIndex });

    return NextResponse.json({ success: true, projectId, galleryIndex });
  } catch (error) {
    console.error("Error deleting project gallery photo:", error);
    return NextResponse.json(
      { error: "Failed to delete project gallery photo" },
      { status: 500 }
    );
  }
}
