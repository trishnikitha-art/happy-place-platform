/**
 * Admin Deployment API Endpoint
 * 
 * Commits accepted Workbench changes to GitHub main via GitHub API
 * 
 * POST /api/admin/deploy
 * Body: { reason?: string }
 * 
 * Requires Workbench authentication.
 * Uses GitHub API to commit projects.v1.json to main branch.
 * Vercel Git integration will automatically deploy when changes are pushed to main.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { readFileSync } from "fs";
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

    console.log('[DEPLOY API] REQUEST_RECEIVED', { reason });

    // Check for GitHub credentials
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_REPO_OWNER || 'trishnikitha-art';
    const githubRepo = process.env.GITHUB_REPO_NAME || 'happy-place-platform';

    if (!githubToken) {
      console.log('[DEPLOY API] MISSING_GITHUB_CREDENTIALS');
      return NextResponse.json(
        { 
          error: "GitHub credentials not configured",
          message: "Set GITHUB_TOKEN environment variable to enable automatic Git commit/push"
        },
        { status: 503 }
      );
    }

    console.log('[DEPLOY API] GITHUB_COMMIT_INITIATED', { githubOwner, githubRepo });

    // Read the current authority file (from local website directory)
    const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
    const fileContent = readFileSync(authorityFile, "utf-8");
    const fileContentBase64 = Buffer.from(fileContent).toString('base64');

    // Get current file SHA from GitHub (repository root path)
    const filePath = "website/src/config/projects.v1.json";
    
    console.log('[DEPLOY API] LOCAL_FILE_READ', { authorityFile, contentLength: fileContent.length });
    console.log('[DEPLOY API] GITHUB_FILE_PATH', { filePath });
    const getFileUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`;
    
    console.log('[DEPLOY API] GETTING_CURRENT_FILE_SHA', { filePath });
    
    const getFileResponse = await fetch(getFileUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    let currentFileSha = null;
    if (getFileResponse.ok) {
      const fileData = await getFileResponse.json();
      currentFileSha = fileData.sha;
      console.log('[DEPLOY API] CURRENT_FILE_SHA', { currentFileSha });
    } else if (getFileResponse.status === 404) {
      console.log('[DEPLOY API] FILE_NOT_FOUND (new file)', { filePath });
      // For 404, we'll create the file, so sha should be null
      currentFileSha = null;
    } else {
      const errorText = await getFileResponse.text();
      console.error('[DEPLOY API] GET_FILE_FAILED', { status: getFileResponse.status, error: errorText });
      return NextResponse.json(
        { 
          error: "Failed to get current file from GitHub",
          details: errorText
        },
        { status: getFileResponse.status }
      );
    }

    // Commit the file to GitHub
    const commitMessage = `Workbench: accept media changes\n\n${reason}`;
    const commitBody: {
      message: string;
      content: string;
      branch: string;
      sha?: string;
    } = {
      message: commitMessage,
      content: fileContentBase64,
      branch: 'main',
    };
    
    // Only include sha if we're updating an existing file
    if (currentFileSha) {
      commitBody.sha = currentFileSha;
    }

    console.log('[DEPLOY API] COMMITTING_TO_GITHUB', { filePath, branch: 'main', hasSha: !!currentFileSha });

    const commitResponse = await fetch(getFileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(commitBody),
    });

    if (!commitResponse.ok) {
      const errorText = await commitResponse.text();
      console.error('[DEPLOY API] COMMIT_FAILED', { status: commitResponse.status, error: errorText });
      return NextResponse.json(
        { 
          error: "Failed to commit to GitHub",
          details: errorText
        },
        { status: commitResponse.status }
      );
    }

    const commitData = await commitResponse.json();
    const commitSha = commitData.commit.sha;
    
    console.log('[DEPLOY API] COMMIT_SUCCESS', { 
      commitSha,
      commitUrl: commitData.commit.html_url
    });

    return NextResponse.json({ 
      success: true,
      commitSha,
      commitUrl: commitData.commit.html_url,
      message: "Changes committed to main. Vercel Git integration will automatically deploy to production.",
      authorityFile: filePath,
      targetBranch: 'main'
    });

  } catch (error) {
    console.error('[DEPLOY API] ERROR', error);
    return NextResponse.json(
      { 
        error: "Failed to commit to GitHub",
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
