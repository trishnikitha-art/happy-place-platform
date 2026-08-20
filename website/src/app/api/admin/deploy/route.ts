/**
 * Admin Deployment Trigger API Endpoint
 * 
 * Commits accepted Workbench changes to Git and triggers Vercel production deployment
 * 
 * POST /api/admin/deploy
 * Body: { reason?: string }
 * 
 * Requires Workbench authentication.
 * Commits accepted authority changes to main before triggering deployment.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { execSync } from "child_process";
import { join } from "path";

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

    console.log('[DEPLOY TRIGGER] REQUEST_RECEIVED', { reason });

    // STEP 1: Commit accepted authority changes to Git
    console.log('[DEPLOY TRIGGER] COMMITTING_ACCEPTED_CHANGES');
    
    const repoPath = process.cwd();
    const authorityFile = join(repoPath, "src/config/projects.v1.json");
    
    try {
      // Check if authority file has changes
      const gitStatus = execSync('git status --short', { cwd: repoPath, encoding: 'utf-8' });
      const hasAuthorityChanges = gitStatus.includes('projects.v1.json');
      
      if (!hasAuthorityChanges) {
        console.log('[DEPLOY TRIGGER] NO_AUTHORITY_CHANGES_TO_COMMIT');
        return NextResponse.json(
          { 
            error: "No authority changes detected",
            message: "No changes to commit to projects.v1.json"
          },
          { status: 400 }
        );
      }
      
      // Stage only the authority file
      execSync(`git add src/config/projects.v1.json`, { cwd: repoPath });
      console.log('[DEPLOY TRIGGER] AUTHORITY_FILE_STAGED');
      
      // Commit the changes
      const commitMessage = `Workbench: accept media changes\n\n${reason}`;
      execSync(`git commit -m "${commitMessage}"`, { cwd: repoPath });
      console.log('[DEPLOY TRIGGER] COMMIT_CREATED');
      
      // Get the commit SHA
      const commitSha = execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf-8' }).trim();
      console.log('[DEPLOY TRIGGER] COMMIT_SHA', { commitSha });
      
      // Push to main
      execSync('git push origin main', { cwd: repoPath });
      console.log('[DEPLOY TRIGGER] PUSHED_TO_MAIN');
      
      // Verify origin/main matches HEAD
      const originSha = execSync('git rev-parse origin/main', { cwd: repoPath, encoding: 'utf-8' }).trim();
      if (originSha !== commitSha) {
        throw new Error(`Origin/main SHA mismatch: HEAD=${commitSha}, origin/main=${originSha}`);
      }
      console.log('[DEPLOY TRIGGER] ORIGIN_MAIN_VERIFIED', { commitSha, originSha });
      
    } catch (gitError) {
      console.error('[DEPLOY TRIGGER] GIT_OPERATION_FAILED', gitError);
      return NextResponse.json(
        { 
          error: "Failed to commit and push changes",
          message: gitError instanceof Error ? gitError.message : String(gitError)
        },
        { status: 500 }
      );
    }

    // STEP 2: Check if Vercel Git integration will auto-deploy
    // If Vercel is configured to auto-deploy on main push, we don't need explicit trigger
    console.log('[DEPLOY TRIGGER] CHECKING_VERCEL_GIT_INTEGRATION');
    
    const vercelToken = process.env.VERCEL_TOKEN;
    const vercelProjectId = process.env.VERCEL_PROJECT_ID;

    if (!vercelToken || !vercelProjectId) {
      console.log('[DEPLOY TRIGGER] NO_VERCEL_CREDENTIALS - RELYING_ON_GIT_AUTO_DEPLOY');
      return NextResponse.json({ 
        success: true,
        commitSha: execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf-8' }).trim(),
        message: "Changes committed and pushed to main. Vercel Git integration will trigger production deployment automatically."
      });
    }

    // STEP 3: Explicit Vercel deployment trigger (if credentials available)
    console.log('[DEPLOY TRIGGER] EXPLICIT_VERCEL_DEPLOYMENT_TRIGGER');
    
    const vercelApiUrl = `https://api.vercel.com/v13/deployments`;
    const commitSha = execSync('git rev-parse HEAD', { cwd: repoPath, encoding: 'utf-8' }).trim();
    
    console.log('[DEPLOY TRIGGER] CALLING_VERCEL_API', { projectId: vercelProjectId, commitSha });

    const vercelResponse = await fetch(vercelApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${vercelToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: vercelProjectId,
        target: 'production',
        gitSource: {
          type: 'github',
          repo: 'trishnikitha-art/happy-place-platform',
          branch: 'main',
          commitSha: commitSha,
        },
        metadata: {
          reason,
          triggeredBy: 'workbench',
          timestamp: new Date().toISOString(),
          commitSha,
        },
      }),
    });

    console.log('[DEPLOY TRIGGER] VERCEL_RESPONSE', { 
      status: vercelResponse.status,
      ok: vercelResponse.ok 
    });

    if (!vercelResponse.ok) {
      const errorText = await vercelResponse.text();
      console.error('[DEPLOY TRIGGER] VERCEL_ERROR', { 
        status: vercelResponse.status, 
        error: errorText 
      });
      // Don't fail the entire operation - changes are already committed/pushed
      return NextResponse.json({ 
        success: true,
        commitSha,
        deploymentError: "Failed to trigger explicit Vercel deployment",
        message: "Changes committed and pushed to main. Vercel Git integration will deploy automatically."
      });
    }

    const deploymentData = await vercelResponse.json();
    
    console.log('[DEPLOY TRIGGER] SUCCESS', { 
      deploymentId: deploymentData.id,
      deploymentUrl: deploymentData.url,
      state: deploymentData.state,
      commitSha
    });

    return NextResponse.json({ 
      success: true,
      commitSha,
      deploymentId: deploymentData.id,
      deploymentUrl: deploymentData.url,
      state: deploymentData.state,
      message: "Changes committed to main and production deployment triggered"
    });

  } catch (error) {
    console.error('[DEPLOY TRIGGER] ERROR', error);
    return NextResponse.json(
      { 
        error: "Failed to trigger deployment",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
