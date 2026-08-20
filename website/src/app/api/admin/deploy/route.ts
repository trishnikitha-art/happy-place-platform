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
 * 
 * Constitutional Architecture:
 * - Production: Pulls from KV staging area, merges into projects.v1.json, commits to GitHub
 * - Development: Reads local projects.v1.json and commits to GitHub
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { readFileSync } from "fs";
import { join } from "path";
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';

function getRedisClient(): Redis | null {
  try {
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

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
    console.log('[DEPLOY API] GITHUB_CONFIG_FORENSIC', {
      GITHUB_TOKEN_PRESENT: !!githubToken,
      GITHUB_REPO_OWNER_VALUE: githubOwner,
      GITHUB_REPO_NAME_VALUE: githubRepo,
      GITHUB_REPO_OWNER_SOURCE: process.env.GITHUB_REPO_OWNER ? 'ENV_VAR' : 'FALLBACK',
      GITHUB_REPO_NAME_SOURCE: process.env.GITHUB_REPO_NAME ? 'ENV_VAR' : 'FALLBACK'
    });

    // Verify repository exists before attempting file operations
    const repoUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}`;
    console.log('[DEPLOY API] VERIFYING_REPOSITORY', { repoUrl });
    
    const repoResponse = await fetch(repoUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!repoResponse.ok) {
      const errorText = await repoResponse.text();
      console.error('[DEPLOY API] REPOSITORY_LOOKUP_FAILED', { 
        status: repoResponse.status, 
        githubOwner,
        githubRepo,
        error: errorText 
      });
      
      // Classify the 404 as repository configuration issue, not file absence
      if (repoResponse.status === 404) {
        return NextResponse.json(
          { 
            error: "GitHub repository not found",
            message: `Repository ${githubOwner}/${githubRepo} does not exist or is not accessible with current credentials`,
            forensic: {
              githubOwner,
              githubRepo,
              status: repoResponse.status,
              error: "REPOSITORY_NOT_FOUND"
            }
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: "Failed to verify GitHub repository",
          details: errorText,
          forensic: {
            githubOwner,
            githubRepo,
            status: repoResponse.status
          }
        },
        { status: repoResponse.status }
      );
    }

    const repoData = await repoResponse.json();
    console.log('[DEPLOY API] REPOSITORY_VERIFIED', {
      fullName: repoData.full_name,
      defaultBranch: repoData.default_branch,
      id: repoData.id
    });

    // In production, merge KV staging changes into projects.v1.json
    let fileContent: string;
    const isProduction = process.env.NODE_ENV === 'production';
    const redis = getRedisClient();
    
    if (isProduction && redis) {
      console.log('[DEPLOY API] PRODUCTION_MODE_MERGING_KV_STAGING');
      
      // Read current projects.v1.json
      const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
      const projectsData = JSON.parse(readFileSync(authorityFile, "utf-8"));
      
      // Scan for all staging keys
      const stagingKeys: string[] = [];
      let cursor = '0';
      do {
        const result = await redis.scan(cursor, { match: `${WORKBENCH_STAGING_PREFIX}*`, count: 100 });
        cursor = result[0];
        stagingKeys.push(...result[1]);
      } while (cursor !== '0');
      
      console.log('[DEPLOY API] FOUND_STAGING_KEYS', { count: stagingKeys.length });
      
      // Apply staging changes to projects data
      for (const key of stagingKeys) {
        const value = await redis.get(key);
        if (!value) continue;
        
        // Parse key format: workbench-staging:project:{projectId}:{field}
        const parts = key.split(':');
        if (parts.length < 4) continue;
        
        const projectId = parts[2];
        const field = parts[3]; // 'hero', 'gallery', 'before', 'after'
        
        const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
        if (projectIndex === -1) {
          console.log('[DEPLOY API] STAGING_PROJECT_NOT_FOUND', { projectId, key });
          continue;
        }
        
        if (!projectsData.projects[projectIndex].media) {
          projectsData.projects[projectIndex].media = {};
        }
        
        if (field === 'hero') {
          projectsData.projects[projectIndex].media.hero = value;
        } else if (field === 'gallery') {
          const galleryArray = Array.isArray(value) ? value : [value];
          projectsData.projects[projectIndex].media.gallery = galleryArray;
        } else if (field === 'before' || field === 'after') {
          projectsData.projects[projectIndex].media[field] = value;
        }
        
        console.log('[DEPLOY API] APPLIED_STAGING_CHANGE', { projectId, field, key });
        
        // Clear staging key after applying
        await redis.del(key);
      }
      
      projectsData.generatedAt = new Date().toISOString();
      fileContent = JSON.stringify(projectsData, null, 2);
      console.log('[DEPLOY API] PRODUCTION_MERGE_COMPLETE', { stagingKeysApplied: stagingKeys.length });
    } else {
      // Development: Read current projects.v1.json directly
      const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
      fileContent = readFileSync(authorityFile, "utf-8");
      console.log('[DEPLOY API] DEV_MODE_READING_LOCAL_FILE');
    }

    const fileContentBase64 = Buffer.from(fileContent).toString('base64');

    // Get current file SHA from GitHub (repository root path)
    const filePath = "website/src/config/projects.v1.json";
    
    console.log('[DEPLOY API] FILE_CONTENT_LENGTH', { contentLength: fileContent.length });
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
          details: errorText,
          forensic: {
            githubOwner,
            githubRepo,
            filePath,
            status: getFileResponse.status
          }
        },
        { status: getFileResponse.status }
      );
    }

    // Generate deployment transaction ID
    const deploymentTransactionId = `WBDEP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    console.log('[DEPLOY API] TRANSACTION_ID', { deploymentTransactionId });

    // Commit the file to GitHub
    const commitMessage = `Workbench: accept media changes\n\n${reason}\n\nTransaction ID: ${deploymentTransactionId}`;
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

    console.log('[DEPLOY API] COMMITTING_TO_GITHUB', { 
      deploymentTransactionId,
      filePath, 
      branch: 'main', 
      hasSha: !!currentFileSha,
      contentBytes: fileContentBase64.length 
    });

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
      console.error('[DEPLOY API] COMMIT_FAILED', { 
        deploymentTransactionId,
        status: commitResponse.status, 
        error: errorText,
        githubOwner,
        githubRepo,
        filePath,
        branch: 'main',
        hasSha: !!currentFileSha
      });
      
      // Classify the commit failure
      return NextResponse.json(
        { 
          error: "Failed to commit to GitHub",
          message: "GitHub commit failed - Workbench changes were NOT persisted to repository",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            filePath,
            branch: 'main',
            hasSha: !!currentFileSha,
            status: commitResponse.status,
            error: "GITHUB_COMMIT_FAILED"
          }
        },
        { status: commitResponse.status }
      );
    }

    const commitData = await commitResponse.json();
    const commitSha = commitData.commit.sha;
    
    console.log('[DEPLOY API] COMMIT_SUCCESS', { 
      deploymentTransactionId,
      commitSha,
      commitUrl: commitData.commit.html_url
    });

    return NextResponse.json({ 
      success: true,
      deploymentTransactionId,
      commitSha,
      commitUrl: commitData.commit.html_url,
      message: "Changes committed to main. Vercel Git integration will automatically deploy to production.",
      authorityFile: filePath,
      targetBranch: 'main',
      status: "GITHUB_COMMIT_SUCCEEDED"
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
