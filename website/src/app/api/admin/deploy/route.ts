/**
 * Admin Deployment Readiness API Endpoint
 * 
 * Indicates that accepted Workbench changes are ready for Git commit/push
 * 
 * POST /api/admin/deploy
 * Body: { reason?: string }
 * 
 * Requires Workbench authentication.
 * 
 * NOTE: This endpoint does NOT perform Git operations or trigger Vercel deployment.
 * Git commit/push must be performed from a machine with Git access.
 * Vercel Git integration will automatically deploy when changes are pushed to main.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";

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
    const { reason = "Workbench media changes accepted" } = body;

    console.log('[DEPLOY READINESS] REQUEST_RECEIVED', { reason });

    // Check if authority file has uncommitted changes
    const { readFileSync } = require('fs');
    const { join } = require('path');
    const { execSync } = require('child_process');
    
    const repoPath = process.cwd();
    const authorityFile = join(repoPath, "src/config/projects.v1.json");
    
    // Check if file has been modified (git status)
    try {
      const gitStatus = execSync('git status --short', { cwd: repoPath, encoding: 'utf-8' });
      const hasAuthorityChanges = gitStatus.includes('projects.v1.json');
      
      console.log('[DEPLOY READINESS] GIT_STATUS_CHECK', { 
        hasAuthorityChanges,
        gitStatus: gitStatus.trim()
      });
      
      if (!hasAuthorityChanges) {
        return NextResponse.json(
          { 
            success: true,
            readyForCommit: false,
            message: "No uncommitted authority changes detected"
          },
          { status: 200 }
        );
      }
    } catch (gitError) {
      console.log('[DEPLOY READINESS] GIT_STATUS_FAILED (running in Vercel runtime)', { error: gitError instanceof Error ? gitError.message : String(gitError) });
      // In Vercel runtime, git may not be available - assume changes need commit
      console.log('[DEPLOY READINESS] ASSUMING_CHANGES_READY_FOR_COMMIT');
    }

    // Indicate that changes are ready for manual or automated commit/push
    return NextResponse.json({ 
      success: true,
      readyForCommit: true,
      message: "Workbench changes accepted and persisted. Authority file is ready for Git commit/push to main.",
      nextSteps: [
        "Commit src/config/projects.v1.json to Git",
        "Push commit to main branch",
        "Vercel Git integration will automatically deploy the pushed commit"
      ],
      authorityFile: "src/config/projects.v1.json",
      targetBranch: "main"
    });

  } catch (error) {
    console.error('[DEPLOY READINESS] ERROR', error);
    return NextResponse.json(
      { 
        error: "Failed to check deployment readiness",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
