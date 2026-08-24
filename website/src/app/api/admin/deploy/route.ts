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
 * 
 * TRANSACTIONAL FIX: Staging keys are only deleted after GitHub commit succeeds
 * This prevents data loss if GitHub commit fails.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { readFileSync } from "fs";
import { join } from "path";
import { Redis } from '@upstash/redis';

export const runtime = 'nodejs';

const WORKBENCH_STAGING_PREFIX = 'workbench-staging:';

// GitHub API retry configuration
const GITHUB_MAX_RETRIES = 3;
const GITHUB_RETRY_DELAY_MS = 1000; // 1 second base delay
const GITHUB_RETRY_BACKOFF_MULTIPLIER = 2; // Exponential backoff

/**
 * GitHub API fetch with retry logic and exponential backoff
 * Handles network timeouts and transient GitHub API failures
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  operation: string
): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= GITHUB_MAX_RETRIES; attempt++) {
    try {
      console.log(`[GITHUB_RETRY] ${operation} attempt ${attempt}/${GITHUB_MAX_RETRIES}`, { url });
      
      const response = await fetch(url, options);
      
      // If successful, return the response
      if (response.ok) {
        console.log(`[GITHUB_RETRY] ${operation} succeeded on attempt ${attempt}`);
        return response;
      }
      
      // If not a retryable error, return immediately
      if (response.status >= 400 && response.status < 500) {
        console.log(`[GITHUB_RETRY] ${operation} failed with non-retryable status ${response.status}`);
        return response;
      }
      
      // For 5xx errors, retry with backoff
      lastError = new Error(`GitHub API returned ${response.status}: ${response.statusText}`);
      console.warn(`[GITHUB_RETRY] ${operation} failed with ${response.status}, will retry`);
      
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`[GITHUB_RETRY] ${operation} failed with network error: ${lastError.message}, will retry`);
    }
    
    // Don't wait after the last attempt
    if (attempt < GITHUB_MAX_RETRIES) {
      const delay = GITHUB_RETRY_DELAY_MS * Math.pow(GITHUB_RETRY_BACKOFF_MULTIPLIER, attempt - 1);
      console.log(`[GITHUB_RETRY] Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries exhausted
  console.error(`[GITHUB_RETRY] ${operation} failed after ${GITHUB_MAX_RETRIES} attempts`);
  throw lastError || new Error(`${operation} failed after ${GITHUB_MAX_RETRIES} retries`);
}

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
  // TRANSACTIONAL VARIABLES: Declare before try block for error handling access
  let stagingKeys: string[] = [];
  let isProduction = process.env.NODE_ENV === 'production';
  let deploymentTransactionId = `WBDEP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  
  console.log('[DEPLOY API] TRANSACTION_ID', { deploymentTransactionId });
  
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
    
    const repoResponse = await fetchWithRetry(repoUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, 'repository verification');

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
    const redis = getRedisClient();
    
    if (isProduction && redis) {
      console.log('[DEPLOY API] PRODUCTION_MODE_MERGING_KV_STAGING');
      
      // Read current projects.v1.json
      const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
      const projectsData = JSON.parse(readFileSync(authorityFile, "utf-8"));
      
      // Read current services.v1.json for service card assignments
      const servicesFile = join(process.cwd(), "src/config/services.v1.json");
      const servicesData = JSON.parse(readFileSync(servicesFile, "utf-8"));
      
      // Scan for all staging keys and group by transaction ID
      let cursor = '0';
      const transactionGroups = new Map<string, string[]>(); // transactionId -> keys
      
      do {
        const result = await redis.scan(cursor, { match: `${WORKBENCH_STAGING_PREFIX}*`, count: 100 });
        cursor = result[0];
        
        for (const key of result[1]) {
          // Parse key format: workbench-staging:{transactionId}:project:{projectId}:{field}
          // OR legacy format: workbench-staging:project:{projectId}:{field}
          const parts = key.split(':');
          
          if (parts.length >= 5 && parts[1].startsWith('tx-')) {
            // New transactional format
            const transactionId = parts[1];
            if (!transactionGroups.has(transactionId)) {
              transactionGroups.set(transactionId, []);
            }
            transactionGroups.get(transactionId)!.push(key);
          } else if (parts.length >= 4) {
            // Legacy format - treat as single transaction
            const transactionId = 'legacy-' + key;
            if (!transactionGroups.has(transactionId)) {
              transactionGroups.set(transactionId, []);
            }
            transactionGroups.get(transactionId)!.push(key);
          }
        }
      } while (cursor !== '0');
      
      console.log('[DEPLOY API] FOUND_TRANSACTION_GROUPS', { transactionCount: transactionGroups.size });
      
      // Apply staging changes by transaction (newest first by timestamp)
      const sortedTransactions = Array.from(transactionGroups.entries())
        .sort((a, b) => {
          // Try to get transaction metadata to determine order
          const aMetaKey = `${WORKBENCH_STAGING_PREFIX}${a[0]}:meta`;
          const bMetaKey = `${WORKBENCH_STAGING_PREFIX}${b[0]}:meta`;
          // Simplified: use transaction ID timestamp as ordering
          return a[0].localeCompare(b[0]);
        });
      
      let appliedCount = 0;
      for (const [transactionId, keys] of sortedTransactions) {
        // Get transaction metadata if available
        const metaKey = `${WORKBENCH_STAGING_PREFIX}${transactionId}:meta`;
        const meta = await redis.get(metaKey);
        const transactionState = meta ? (JSON.parse(meta as string) as any).state : 'unknown';
        
        console.log('[DEPLOY API] PROCESSING_TRANSACTION', { transactionId, state: transactionState, keyCount: keys.length });
        
        // Apply all mutations in this transaction
        for (const key of keys) {
          const value = await redis.get(key);
          if (!value) continue;
          
          // Skip metadata keys
          if (key.endsWith(':meta')) continue;
          
          // Parse key format
          const parts = key.split(':');
          if (parts.length < 4) continue;
          
          let projectId: string;
          let field: string;
          
          // New transactional format: workbench-staging:{txId}:project:{projectId}:{field}
          if (parts.length >= 5 && parts[1].startsWith('tx-') && parts[2] === 'project') {
            projectId = parts[3];
            field = parts[4];
          } 
          // Legacy format: workbench-staging:project:{projectId}:{field}
          else if (parts[1] === 'project') {
            projectId = parts[2];
            field = parts[3];
          } 
          // Very old format without 'project' prefix
          else {
            projectId = parts[2];
            field = parts[3];
          }
          
          const projectIndex = projectsData.projects.findIndex((p: any) => p.id === projectId);
          if (projectIndex === -1) {
            console.log('[DEPLOY API] STAGING_PROJECT_NOT_FOUND', { projectId, key });
            continue;
          }
          
          if (!projectsData.projects[projectIndex].media) {
            projectsData.projects[projectIndex].media = {};
          }
          
          if (field === 'hero') {
            if (value) projectsData.projects[projectIndex].media.hero = value;
          } else if (field === 'gallery') {
            const galleryArray = Array.isArray(value) ? value : (value ? [value] : []);
            projectsData.projects[projectIndex].media.gallery = galleryArray;
          } else if (field === 'before' || field === 'after') {
            if (value) projectsData.projects[projectIndex].media[field] = value;
          }
          
          console.log('[DEPLOY API] APPLIED_STAGING_CHANGE', { projectId, field, key, transactionId });
          appliedCount++;
        }
        
        // Track all keys in this transaction for cleanup
        stagingKeys.push(...keys);
      }
      
      projectsData.generatedAt = new Date().toISOString();
      fileContent = JSON.stringify(projectsData, null, 2);
      console.log('[DEPLOY API] PRODUCTION_MERGE_COMPLETE', { stagingKeysApplied: appliedCount, transactionCount: transactionGroups.size });
      
      // CRITICAL FIX: Merge service card assignments from Redis into services.v1.json
      console.log('[DEPLOY API] MERGING_SERVICE_CARD_ASSIGNMENTS');
      const { getAllServiceCardAssignments } = await import('@/lib/assignment-store');
      const assignments = await getAllServiceCardAssignments();
      
      let servicesUpdatedCount = 0;
      for (const assignment of assignments) {
        const serviceIndex = servicesData.services.findIndex((s: any) => s.slug === assignment.serviceSlug);
        if (serviceIndex !== -1) {
          servicesData.services[serviceIndex].cardMediaId = assignment.mediaId;
          servicesUpdatedCount++;
          console.log('[DEPLOY API] APPLIED_SERVICE_ASSIGNMENT', { 
            serviceSlug: assignment.serviceSlug, 
            mediaId: assignment.mediaId 
          });
        }
      }
      
      servicesData.generatedAt = new Date().toISOString();
      
      // Store services.v1.json content for separate GitHub commit
      const servicesFileContent = JSON.stringify(servicesData, null, 2);
      
      // Commit services.v1.json to GitHub
      const servicesFilePath = "website/src/config/services.v1.json";
      const servicesGetFileUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${servicesFilePath}`;
      
      console.log('[DEPLOY API] COMMITTING_SERVICES_JSON', { servicesFilePath });
      
      const servicesGetResponse = await fetchWithRetry(servicesGetFileUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }, 'get services file SHA');
      
      let servicesCurrentSha = null;
      if (servicesGetResponse.ok) {
        const servicesFileData = await servicesGetResponse.json();
        servicesCurrentSha = servicesFileData.sha;
      }
      
      const servicesCommitBody = {
        message: `Workbench: service card assignments\n\n${reason}\n\nTransaction ID: ${deploymentTransactionId}`,
        content: Buffer.from(servicesFileContent).toString('base64'),
        branch: 'main',
        sha: servicesCurrentSha || undefined,
      };
      
      const servicesCommitResponse = await fetchWithRetry(servicesGetFileUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(servicesCommitBody),
      }, 'services GitHub commit');
      
      if (!servicesCommitResponse.ok) {
        console.error('[DEPLOY API] SERVICES_COMMIT_FAILED', { status: servicesCommitResponse.status });
        // Continue with projects commit - services failure is not fatal
      } else {
        console.log('[DEPLOY API] SERVICES_COMMIT_SUCCESS');
      }
      
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
    
    const getFileResponse = await fetchWithRetry(getFileUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, 'get current file SHA');

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

    const commitResponse = await fetchWithRetry(getFileUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(commitBody),
    }, 'GitHub commit');

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
      // TRANSACTIONAL FIX: Staging keys are preserved for retry
      return NextResponse.json(
        { 
          error: "Failed to commit to GitHub",
          message: "GitHub commit failed - Workbench changes were NOT persisted to repository. Staging keys are preserved for retry.",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            filePath,
            branch: 'main',
            hasSha: !!currentFileSha,
            status: commitResponse.status,
            error: "GITHUB_COMMIT_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
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

    // TRANSACTIONAL FIX: Only delete staging keys after GitHub commit succeeds
    // This prevents data loss if GitHub commit fails
    if (isProduction && redis && stagingKeys.length > 0) {
      console.log('[DEPLOY API] CLEARING_STAGING_KEYS_AFTER_COMMIT', { count: stagingKeys.length });
      
      for (const key of stagingKeys) {
        await redis.del(key);
        console.log('[DEPLOY_API] STAGING_KEY_CLEARED', { key });
      }
      
      console.log('[DEPLOY API] STAGING_KEYS_CLEARED_COMPLETE');
    }

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
    // TRANSACTIONAL FIX: Staging keys are preserved on error for retry
    return NextResponse.json(
      { 
        error: "Failed to commit to GitHub",
        message: error instanceof Error ? error.message : String(error),
        stagingKeysPreserved: isProduction && stagingKeys.length > 0,
        stagingKeysCount: stagingKeys.length
      },
      { status: 500 }
    );
  }
}
