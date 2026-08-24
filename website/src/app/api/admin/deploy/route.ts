/**
 * Admin Deployment API Endpoint
 * 
 * Commits accepted Workbench changes to GitHub main via GitHub Git Data API
 * 
 * POST /api/admin/deploy
 * Body: { reason?: string }
 * 
 * Requires Workbench authentication.
 * Uses GitHub Git Data API to create a SINGLE atomic commit containing both
 * projects.v1.json and services.v1.json. This ensures true atomicity - either
 * both files land together, or neither does.
 * 
 * Constitutional Architecture:
 * - Production: Pulls from KV staging area, merges into both authority files,
 *   creates one Git commit with both files, updates main branch
 * - Development: Reads local authority files and commits to GitHub
 * 
 * ATOMIC COMMIT GUARANTEE:
 * - Uses Git Data API: blobs → tree → commit → ref update
 * - Single Git commit contains BOTH projects.v1.json and services.v1.json
 * - If any step fails, main branch is NOT updated
 * - No split-brain state where only one file is committed
 * 
 * TRANSACTIONAL FIX: Staging keys are only deleted after GitHub commit succeeds
 * This prevents data loss if GitHub commit fails.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { readFileSync } from "fs";
import { join } from "path";
import { Redis } from '@upstash/redis';
import {
  createDeploymentTransaction,
  claimDeploymentTransaction,
  commitDeploymentTransaction,
  consumeDeploymentTransaction,
  failDeploymentTransaction,
  getDeploymentTransaction,
  isTransactionTerminal,
  type DeploymentTransaction
} from "@/lib/deployment-transaction";

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
  let deploymentTransactionId: string = ''; // Will be set from request body
  let transaction: DeploymentTransaction | null = null;
  
  console.log('[DEPLOY API] REQUEST_RECEIVED');
  
  // SECURITY: Require authentication in production
  // Development bypass requires explicit DRIVE_AUTH_BYPASS=true
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (process.env.NODE_ENV !== 'development' || !isDevBypass) {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Workbench authentication required" },
        { status: 401 }
      );
    }
  } else {
    console.warn('[DEPLOY API] DEV_MODE_BYPASS_ACTIVE', { 
      reason: 'DRIVE_AUTH_BYPASS=true',
      securityNote: 'This bypass is for development only'
    });
  }

  try {
    const body = await request.json();
    const { reason = "Workbench media changes accepted", transactionIds } = body;

    console.log('[DEPLOY API] REQUEST_RECEIVED', { reason, transactionIds });
    
    // IDEMPOTENCY: Use provided transaction IDs or generate new one
    if (transactionIds && transactionIds.length > 0) {
      // Use the first transaction ID as the deployment transaction ID
      deploymentTransactionId = transactionIds[0];
      console.log('[DEPLOY API] USING_PROVIDED_TRANSACTION_IDS', { deploymentTransactionId, transactionIds });
    } else {
      // Legacy fallback: generate random transaction ID
      deploymentTransactionId = `WBDEP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      console.log('[DEPLOY API] GENERATED_NEW_TRANSACTION_ID', { deploymentTransactionId });
    }
    
    // IDEMPOTENCY CHECK: Check if transaction already exists
    const existingTransaction = await getDeploymentTransaction(deploymentTransactionId);
    if (existingTransaction) {
      console.log('[DEPLOY API] EXISTING_TRANSACTION_FOUND', { 
        transactionId: deploymentTransactionId,
        state: existingTransaction.state,
        commitSha: existingTransaction.commitSha 
      });
      
      // If already committed/consumed, return idempotent result
      if (existingTransaction.state === 'committed' || existingTransaction.state === 'consumed') {
        return NextResponse.json({
          success: true,
          deploymentTransactionId,
          commitSha: existingTransaction.commitSha,
          commitUrl: existingTransaction.commitUrl,
          message: "Idempotent replay: transaction already committed",
          authorityFiles: existingTransaction.files,
          status: "IDEMPOTENT_REPLAY",
          filesCommitted: existingTransaction.files,
          atomic: true,
          originalState: existingTransaction.state,
          originalCommittedAt: existingTransaction.committedAt
        });
      }
      
      // If in terminal failed state, return error
      if (existingTransaction.state === 'failed' && (existingTransaction.retryCount || 0) >= 3) {
        return NextResponse.json({
          error: "Transaction terminal",
          message: "Transaction failed after maximum retries",
          deploymentTransactionId,
          state: existingTransaction.state,
          failureReason: existingTransaction.failureReason,
          retryCount: existingTransaction.retryCount
        }, { status: 409 });
      }
      
      // If currently committing, reject concurrent deployment
      if (existingTransaction.state === 'committing') {
        return NextResponse.json({
          error: "Concurrent deployment in progress",
          message: "Transaction is currently being deployed by another process",
          deploymentTransactionId,
          state: existingTransaction.state,
          owner: existingTransaction.owner
        }, { status: 409 });
      }
    }

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
    let servicesFileContent: string = '';
    const redis = getRedisClient();
    
    if (isProduction && redis) {
      console.log('[DEPLOY API] PRODUCTION_MODE_MERGING_KV_STAGING');
      
      // Read current projects.v1.json
      const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
      const projectsData = JSON.parse(readFileSync(authorityFile, "utf-8"));
      
      // Read current services.v1.json for service card assignments
      const servicesFile = join(process.cwd(), "src/config/services.v1.json");
      const servicesData = JSON.parse(readFileSync(servicesFile, "utf-8"));
      
      // PROCESS SPECIFIC TRANSACTIONS ONLY (transaction isolation)
      // Scan for all staging keys and group by transaction ID
      let cursor = '0';
      const transactionGroups = new Map<string, string[]>(); // transactionId -> keys
      
      do {
        const result = await redis.scan(cursor, { match: `${WORKBENCH_STAGING_PREFIX}*`, count: 100 });
        cursor = result[0];
        
        for (const key of result[1]) {
          // Parse key format: ONLY accept transactional format: workbench-staging:{txId}:project:{projectId}:{field}
          const parts = key.split(':');
          
          // ONLY accept new transactional format
          if (parts.length >= 5 && (parts[1].startsWith('WBDEP-') || parts[1].startsWith('tx-'))) {
            const transactionId = parts[1];
            if (!transactionGroups.has(transactionId)) {
              transactionGroups.set(transactionId, []);
            }
            transactionGroups.get(transactionId)!.push(key);
          }
          // Skip legacy formats - enforce single staging protocol
          else {
            console.warn('[DEPLOY API] LEGACY_STAGING_KEY_SKIPPED', { 
              key, 
              reason: 'Legacy format no longer supported. Use transactional format: workbench-staging:{txId}:project:{projectId}:{field}'
            });
          }
        }
      } while (cursor !== '0');
      
      console.log('[DEPLOY API] FOUND_TRANSACTION_GROUPS', { transactionCount: transactionGroups.size });
      
      // FILTER: Only process the specific transaction IDs provided (transaction isolation)
      const targetTransactionIds = transactionIds || [deploymentTransactionId];
      const filteredTransactionGroups = new Map<string, string[]>();
      
      for (const [transactionId, keys] of transactionGroups) {
        if (targetTransactionIds.includes(transactionId)) {
          filteredTransactionGroups.set(transactionId, keys);
        }
      }
      
      console.log('[DEPLOY API] FILTERED_TRANSACTION_GROUPS', { 
        total: transactionGroups.size, 
        filtered: filteredTransactionGroups.size,
        targetTransactionIds 
      });
      
      // Apply staging changes by transaction (newest first by timestamp)
      const sortedTransactions = Array.from(filteredTransactionGroups.entries())
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
          let mutationType: string | null = null;
          
          // New transactional format: workbench-staging:{txId}:project:{projectId}:{field}
          if (parts.length >= 5 && (parts[1].startsWith('WBDEP-') || parts[1].startsWith('tx-')) && parts[2] === 'project') {
            projectId = parts[3];
            field = parts[4];
            mutationType = 'project';
          } 
          // New transactional format: workbench-staging:{txId}:service:{serviceSlug}
          else if (parts.length >= 4 && (parts[1].startsWith('WBDEP-') || parts[1].startsWith('tx-')) && parts[2] === 'service') {
            const serviceSlug = parts[3];
            const serviceIndex = servicesData.services.findIndex((s: any) => s.slug === serviceSlug);
            if (serviceIndex !== -1) {
              servicesData.services[serviceIndex].cardMediaId = value;
              console.log('[DEPLOY API] APPLIED_SERVICE_ASSIGNMENT', { 
                serviceSlug, 
                mediaId: value,
                transactionId 
              });
            }
            continue; // Skip project logic
          }
          // Legacy format detected - reject to enforce single staging protocol
          else {
            console.warn('[DEPLOY API] LEGACY_STAGING_FORMAT_REJECTED', { 
              key, 
              transactionId,
              format: parts.join(':'),
              reason: 'Legacy staging format no longer supported. Use transactional format: workbench-staging:{txId}:project:{projectId}:{field}'
            });
            continue; // Skip legacy keys
          }
          
          // Only process if we have a valid mutationType
          if (!mutationType) {
            console.warn('[DEPLOY API] UNKNOWN_MUTATION_TYPE', { key, parts });
            continue;
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
      
      // NOTE: Service card assignments are now merged from staging, not from assignment store
      // This prevents Redis/Git split-brain - only staged assignments are committed
      servicesData.generatedAt = new Date().toISOString();
      
      // Store services.v1.json content for atomic Git commit
      servicesFileContent = JSON.stringify(servicesData, null, 2);
      console.log('[DEPLOY API] SERVICES_CONTENT_PREPARED', { length: servicesFileContent.length });
      
    } else {
      // Development: Read local authority files
      const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
      fileContent = readFileSync(authorityFile, "utf-8");
      console.log('[DEPLOY API] DEV_MODE_READING_LOCAL_FILES');
      
      // Also read services.v1.json in dev mode
      const servicesFile = join(process.cwd(), "src/config/services.v1.json");
      const servicesData = JSON.parse(readFileSync(servicesFile, "utf-8"));
      servicesFileContent = JSON.stringify(servicesData, null, 2);
    }

    // =====================================================================
    // ATOMIC GIT COMMIT USING GIT DATA API
    // =====================================================================
    // This creates a SINGLE commit containing BOTH files atomically.
    // If any step fails, main branch is NOT updated.
    // =====================================================================
    
    const projectsFilePath = "website/src/config/projects.v1.json";
    const servicesFilePath = "website/src/config/services.v1.json";
    
    console.log('[DEPLOY API] ATOMIC_COMMIT_INITIATED', { 
      deploymentTransactionId,
      projectsFile: projectsFilePath,
      servicesFile: servicesFilePath
    });
    
    // Step 1: Get current commit SHA (branch head)
    const refUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/refs/heads/main`;
    console.log('[DEPLOY API] GETTING_CURRENT_COMMIT_SHA');
    
    const refResponse = await fetchWithRetry(refUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, 'get current commit SHA');
    
    if (!refResponse.ok) {
      const errorText = await refResponse.text();
      console.error('[DEPLOY API] GET_REF_FAILED', { status: refResponse.status, error: errorText });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to get current branch reference: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to get current branch reference",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            branch: 'main',
            status: refResponse.status,
            error: "GET_REF_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: refResponse.status }
      );
    }
    
    const refData = await refResponse.json();
    const currentCommitSha = refData.object.sha;
    console.log('[DEPLOY API] CURRENT_COMMIT_SHA', { currentCommitSha });
    
    // CREATE TRANSACTION in prepared state with parent commit SHA for concurrent safety
    if (!transaction) {
      transaction = await createDeploymentTransaction(
        deploymentTransactionId,
        stagingKeys,
        ['website/src/config/projects.v1.json', 'website/src/config/services.v1.json'],
        reason,
        currentCommitSha
      );
      console.log('[DEPLOY API] TRANSACTION_CREATED', { transactionId: deploymentTransactionId, state: transaction.state, parentCommitSha: currentCommitSha });
    }
    
    // CLAIM TRANSACTION for deployment (prepared → committing)
    const claimToken = `claim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    transaction = await claimDeploymentTransaction(deploymentTransactionId, claimToken);
    console.log('[DEPLOY API] TRANSACTION_CLAIMED', { transactionId: deploymentTransactionId, owner: claimToken });
    
    // Step 2: Get current tree SHA from the commit
    const commitUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/commits/${currentCommitSha}`;
    console.log('[DEPLOY API] GETTING_CURRENT_TREE_SHA');
    
    const commitResponse = await fetchWithRetry(commitUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, 'get current tree SHA');
    
    if (!commitResponse.ok) {
      const errorText = await commitResponse.text();
      console.error('[DEPLOY API] GET_COMMIT_FAILED', { status: commitResponse.status, error: errorText });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to get current commit: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to get current commit",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            commitSha: currentCommitSha,
            status: commitResponse.status,
            error: "GET_COMMIT_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: commitResponse.status }
      );
    }
    
    const commitData = await commitResponse.json();
    const currentTreeSha = commitData.tree.sha;
    console.log('[DEPLOY API] CURRENT_TREE_SHA', { currentTreeSha });
    
    // Step 3: Create blobs for both files
    console.log('[DEPLOY API] CREATING_BLOBS');
    
    const projectsBlobBase64 = Buffer.from(fileContent).toString('base64');
    const servicesBlobBase64 = Buffer.from(servicesFileContent).toString('base64');
    
    // Create projects.v1.json blob
    const projectsBlobResponse = await fetchWithRetry(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          content: projectsBlobBase64,
          encoding: 'base64',
        }),
      },
      'create projects blob'
    );
    
    if (!projectsBlobResponse.ok) {
      const errorText = await projectsBlobResponse.text();
      console.error('[DEPLOY API] CREATE_PROJECTS_BLOB_FAILED', { status: projectsBlobResponse.status });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to create projects blob: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create projects blob",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            status: projectsBlobResponse.status,
            error: "CREATE_PROJECTS_BLOB_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: projectsBlobResponse.status }
      );
    }
    
    const projectsBlobData = await projectsBlobResponse.json();
    const projectsBlobSha = projectsBlobData.sha;
    console.log('[DEPLOY API] PROJECTS_BLOB_CREATED', { sha: projectsBlobSha });
    
    // Create services.v1.json blob
    const servicesBlobResponse = await fetchWithRetry(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          content: servicesBlobBase64,
          encoding: 'base64',
        }),
      },
      'create services blob'
    );
    
    if (!servicesBlobResponse.ok) {
      const errorText = await servicesBlobResponse.text();
      console.error('[DEPLOY API] CREATE_SERVICES_BLOB_FAILED', { status: servicesBlobResponse.status });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to create services blob: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create services blob",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            status: servicesBlobResponse.status,
            error: "CREATE_SERVICES_BLOB_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: servicesBlobResponse.status }
      );
    }
    
    const servicesBlobData = await servicesBlobResponse.json();
    const servicesBlobSha = servicesBlobData.sha;
    console.log('[DEPLOY API] SERVICES_BLOB_CREATED', { sha: servicesBlobSha });
    
    // Step 4: Create new tree with both files
    console.log('[DEPLOY API] CREATING_NEW_TREE');
    
    const treeResponse = await fetchWithRetry(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/trees`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          base_tree: currentTreeSha,
          tree: [
            {
              path: projectsFilePath,
              mode: '100644',
              type: 'blob',
              sha: projectsBlobSha,
            },
            {
              path: servicesFilePath,
              mode: '100644',
              type: 'blob',
              sha: servicesBlobSha,
            },
          ],
        }),
      },
      'create new tree'
    );
    
    if (!treeResponse.ok) {
      const errorText = await treeResponse.text();
      console.error('[DEPLOY API] CREATE_TREE_FAILED', { status: treeResponse.status });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to create new tree: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create new tree",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            baseTree: currentTreeSha,
            status: treeResponse.status,
            error: "CREATE_TREE_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: treeResponse.status }
      );
    }
    
    const treeData = await treeResponse.json();
    const newTreeSha = treeData.sha;
    console.log('[DEPLOY API] NEW_TREE_CREATED', { sha: newTreeSha });
    
    // Step 5: Create new commit
    console.log('[DEPLOY API] CREATING_NEW_COMMIT');
    
    const newCommitResponse = await fetchWithRetry(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/commits`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          message: `Workbench: accept media changes\n\n${reason}\n\nTransaction ID: ${deploymentTransactionId}`,
          tree: newTreeSha,
          parents: [currentCommitSha],
        }),
      },
      'create new commit'
    );
    
    if (!newCommitResponse.ok) {
      const errorText = await newCommitResponse.text();
      console.error('[DEPLOY API] CREATE_COMMIT_FAILED', { status: newCommitResponse.status });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to create new commit: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create new commit",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            treeSha: newTreeSha,
            parentCommit: currentCommitSha,
            status: newCommitResponse.status,
            error: "CREATE_COMMIT_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: newCommitResponse.status }
      );
    }
    
    const newCommitData = await newCommitResponse.json();
    const newCommitSha = newCommitData.sha;
    console.log('[DEPLOY API] NEW_COMMIT_CREATED', { sha: newCommitSha });
    
    // Step 6: Update branch ref to point to new commit
    console.log('[DEPLOY API] UPDATING_BRANCH_REF');
    
    const updateRefResponse = await fetchWithRetry(refUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false, // No force push - this prevents overwriting concurrent changes
      }),
    }, 'update branch ref');
    
    if (!updateRefResponse.ok) {
      const errorText = await updateRefResponse.text();
      console.error('[DEPLOY API] UPDATE_REF_FAILED', { status: updateRefResponse.status });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to update branch reference: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to update branch reference",
          message: "Branch update failed - this may indicate a concurrent deployment. Please retry.",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            newCommitSha,
            expectedParent: currentCommitSha,
            status: updateRefResponse.status,
            error: "UPDATE_REF_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: updateRefResponse.status }
      );
    }
    
    console.log('[DEPLOY API] BRANCH_REF_UPDATED', { newCommitSha });
    
    // EXTERNAL COMMIT POINT: Git ref update is the irreversible external side effect
    // At this point, the deployment exists in the repository regardless of what follows
    console.log('[DEPLOY API] EXTERNAL_COMMIT_POINT_REACHED', { 
      deploymentTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url
    });
    
    // MARK TRANSACTION AS COMMITTED (committing → committed)
    // This happens AFTER the external commit point because Redis state is coordination, not atomic
    transaction = await commitDeploymentTransaction(deploymentTransactionId, newCommitSha, newCommitData.html_url);
    console.log('[DEPLOY API] TRANSACTION_COMMITTED', { transactionId: deploymentTransactionId, commitSha: newCommitSha });
    
    // Step 7: Verify the commit contains both files (post-commit verification, NOT a commit gate)
    // If verification fails, the deployment still succeeded - this is for monitoring/reconciliation
    console.log('[DEPLOY API] VERIFYING_COMMIT_CONTENTS');
    
    const verifyCommitResponse = await fetchWithRetry(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/commits/${newCommitSha}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      },
      'verify commit contents'
    );
    
    let verificationPassed = false;
    let verificationError: string | null = null;
    
    if (!verifyCommitResponse.ok) {
      verificationError = `Verification request failed: ${verifyCommitResponse.status}`;
      console.error('[DEPLOY API] VERIFY_COMMIT_REQUEST_FAILED', { status: verifyCommitResponse.status });
    } else {
      const verifyData = await verifyCommitResponse.json();
      const treeUrl = verifyData.tree.url;
      
      const verifyTreeResponse = await fetchWithRetry(treeUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }, 'verify tree contents');
      
      if (!verifyTreeResponse.ok) {
        verificationError = `Tree verification failed: ${verifyTreeResponse.status}`;
        console.error('[DEPLOY_API] VERIFY_TREE_REQUEST_FAILED', { status: verifyTreeResponse.status });
      } else {
        const verifyTreeData = await verifyTreeResponse.json();
        
        // FIX: Check if files exist by fetching them directly, not just checking tree
        // The tree might be recursive and not show files at top level
        const projectsFileResponse = await fetchWithRetry(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${projectsFilePath}?ref=${newCommitSha}`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          },
          'verify projects file'
        );
        
        const servicesFileResponse = await fetchWithRetry(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${servicesFilePath}?ref=${newCommitSha}`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          },
          'verify services file'
        );
        
        const projectsFilePresent = projectsFileResponse.ok;
        const servicesFilePresent = servicesFileResponse.ok;
        
        console.log('[DEPLOY API] VERIFICATION_RESULT', {
          projectsFilePresent,
          servicesFilePresent,
          projectsFileStatus: projectsFileResponse.status,
          servicesFileStatus: servicesFileResponse.status
        });
        
        if (!projectsFilePresent || !servicesFilePresent) {
          verificationError = `Files missing in commit: projects=${projectsFilePresent}, services=${servicesFilePresent}`;
          console.error('[DEPLOY API] VERIFICATION_FILES_MISSING', { 
            projectsFilePresent,
            servicesFilePresent 
          });
        } else {
          verificationPassed = true;
        }
      }
    }
    
    console.log('[DEPLOY API] ATOMIC_COMMIT_SUCCESS', { 
      deploymentTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url,
      verificationPassed,
      verificationError
    });

    // TRANSACTIONAL FIX: Only delete staging keys after durable commit verification
    // This prevents data loss if commit fails
    if (isProduction && redis && stagingKeys.length > 0 && verificationPassed) {
      console.log('[DEPLOY API] CLEARING_STAGING_KEYS_AFTER_COMMIT', { count: stagingKeys.length });
      
      for (const key of stagingKeys) {
        await redis.del(key);
        console.log('[DEPLOY_API] STAGING_KEY_CLEARED', { key });
      }
      
      console.log('[DEPLOY API] STAGING_KEYS_CLEARED_COMPLETE');
      
      // MARK TRANSACTION AS CONSUMED (committed → consumed)
      if (transaction) {
        transaction = await consumeDeploymentTransaction(deploymentTransactionId);
        console.log('[DEPLOY API] TRANSACTION_CONSUMED', { transactionId: deploymentTransactionId });
      }
    } else if (isProduction && redis && stagingKeys.length > 0 && !verificationPassed) {
      console.warn('[DEPLOY API] STAGING_KEYS_PRESERVED_DUE_TO_VERIFICATION_FAILURE', { 
        stagingKeysCount: stagingKeys.length,
        verificationError 
      });
    }

    return NextResponse.json({ 
      success: true,
      deploymentTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url,
      message: verificationPassed 
        ? "Your changes are live and saved. Git commit successful."
        : "Git commit succeeded but verification failed. Changes are in staging for retry.",
      authorityFiles: [projectsFilePath, servicesFilePath],
      targetBranch: 'main',
      status: verificationPassed ? "PUBLISHED" : "COMMITTED_NEEDS_RECONCILIATION",
      filesCommitted: ['projects.v1.json', 'services.v1.json'],
      verificationPassed,
      verificationError: verificationError || undefined,
      externalCommitPoint: true
    });

  } catch (error) {
    console.error('[DEPLOY API] ERROR', error);
    
    // MARK TRANSACTION AS FAILED on uncaught errors
    if (transaction) {
      try {
        await failDeploymentTransaction(
          deploymentTransactionId,
          error instanceof Error ? error.message : String(error)
        );
      } catch (txError) {
        console.error('[DEPLOY API] TRANSACTION_MARK_FAILED', { txError });
      }
    }
    
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
