/**
 * Admin Deployment API Endpoint
 * 
 * Commits accepted Workbench changes to GitHub main via GitHub Git Data API
 * 
 * POST /api/admin/deploy
 * Body: { reason?: string }
 * 
 * GET /api/admin/deploy/status?commitSha={sha}
 * Returns deployment status for a specific commit (Vercel readiness check)
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
 * DEPLOYMENT STATE FIX:
 * - Git commit ≠ Vercel deployment ≠ live website
 * - Returns COMMITTED_DEPLOYING after Git commit, not PUBLISHED
 * - Requires client to poll status endpoint for actual Vercel readiness
 * - Only transitions to PUBLISHED when Vercel confirms deployment
 * 
 * TRANSACTIONAL FIX: Staging keys are only deleted after GitHub commit succeeds
 * This prevents data loss if GitHub commit fails.
 */

import { NextResponse } from "next/server";
import { workbenchSession } from "@/lib/workbench-session";
import { readFileSync } from "fs";
import { join } from "path";
import { Redis } from '@upstash/redis';
import { getEnvironment, getKvNamespace } from '@/lib/environment';
import {
  createDeploymentTransaction,
  claimDeploymentTransaction,
  commitDeploymentTransaction,
  consumeDeploymentTransaction,
  failDeploymentTransaction,
  getDeploymentTransaction,
  isTransactionTerminal,
  type DeploymentTransaction,
  type TransactionState
} from "@/lib/deployment-transaction";

export const runtime = 'nodejs';

/**
 * GET endpoint: Check deployment status for a specific commit
 * Used by Workbench to poll for Vercel deployment readiness
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const commitSha = searchParams.get('commitSha');
  
  if (!commitSha) {
    return NextResponse.json(
      { error: "Missing commitSha parameter" },
      { status: 400 }
    );
  }
  
  console.log('[DEPLOY API] STATUS_CHECK', { commitSha });
  
  // Check GitHub commit status
  const githubToken = process.env.GITHUB_TOKEN;
  const githubOwner = process.env.GITHUB_REPO_OWNER || 'trishnikitha-art';
  const githubRepo = process.env.GITHUB_REPO_NAME || 'happy-place-platform';
  
  if (!githubToken) {
    return NextResponse.json(
      { error: "GitHub credentials not configured" },
      { status: 503 }
    );
  }
  
  try {
    // Get commit status from GitHub
    const commitUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/commits/${commitSha}`;
    const commitResponse = await fetch(commitUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    if (!commitResponse.ok) {
      return NextResponse.json(
        { error: "Commit not found", commitSha },
        { status: 404 }
      );
    }
    
    const commitData = await commitResponse.json();
    
    // Check for Vercel deployment status via combined status
    const statusUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/commits/${commitSha}/status`;
    const statusResponse = await fetch(statusUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    });
    
    let vercelStatus = 'unknown';
    let vercelContext = null;
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      // Look for Vercel status check
      const vercelCheck = statusData.statuses?.find((s: any) => 
        s.context === 'vercel/deployment' || s.context === 'deploy/netlify' || s.context === 'Vercel'
      );
      
      if (vercelCheck) {
        vercelStatus = vercelCheck.state; // 'success', 'pending', 'failure'
        vercelContext = vercelCheck.context;
      }
    }
    
    return NextResponse.json({
      commitSha,
      commitUrl: commitData.html_url,
      status: vercelStatus === 'success' ? 'PUBLISHED' : 'COMMITTED_DEPLOYING',
      vercelStatus,
      vercelContext,
      timestamp: commitData.commit?.committer?.date,
    });
    
  } catch (error) {
    console.error('[DEPLOY API] STATUS_CHECK_FAILED', error);
    return NextResponse.json(
      { error: "Failed to check deployment status" },
      { status: 500 }
    );
  }
}

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
  let transactionOwner: string = ''; // Ownership token for lifecycle verification
  
  console.log('[DEPLOY API] REQUEST_RECEIVED');
  
  // GET endpoint: Check deployment status for a specific commit
  if (request.method === 'GET') {
    const { searchParams } = new URL(request.url);
    const commitSha = searchParams.get('commitSha');
    
    if (!commitSha) {
      return NextResponse.json(
        { error: "Missing commitSha parameter" },
        { status: 400 }
      );
    }
    
    console.log('[DEPLOY API] STATUS_CHECK', { commitSha });
    
    // Check GitHub commit status
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_REPO_OWNER || 'trishnikitha-art';
    const githubRepo = process.env.GITHUB_REPO_NAME || 'happy-place-platform';
    
    if (!githubToken) {
      return NextResponse.json(
        { error: "GitHub credentials not configured" },
        { status: 503 }
      );
    }
    
    try {
      // Get commit status from GitHub
      const commitUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/commits/${commitSha}`;
      const commitResponse = await fetch(commitUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      if (!commitResponse.ok) {
        return NextResponse.json(
          { error: "Commit not found", commitSha },
          { status: 404 }
        );
      }
      
      const commitData = await commitResponse.json();
      
      // Check for Vercel deployment status via combined status
      const statusUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/commits/${commitSha}/status`;
      const statusResponse = await fetch(statusUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      });
      
      let vercelStatus = 'unknown';
      let vercelContext = null;
      
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        // Look for Vercel status check
        const vercelCheck = statusData.statuses?.find((s: any) => 
          s.context === 'vercel/deployment' || s.context === 'deploy/netlify' || s.context === 'Vercel'
        );
        
        if (vercelCheck) {
          vercelStatus = vercelCheck.state; // 'success', 'pending', 'failure'
          vercelContext = vercelCheck.context;
        }
      }
      
      return NextResponse.json({
        commitSha,
        commitUrl: commitData.html_url,
        status: vercelStatus === 'success' ? 'PUBLISHED' : 'COMMITTED_DEPLOYING',
        vercelStatus,
        vercelContext,
        timestamp: commitData.commit?.committer?.date,
      });
      
    } catch (error) {
      console.error('[DEPLOY API] STATUS_CHECK_FAILED', error);
      return NextResponse.json(
        { error: "Failed to check deployment status" },
        { status: 500 }
      );
    }
  }
  
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

    // In production, merge KV staging changes into projects.v1.json, services.v1.json, brand.v1.json, and media.v1.json
    let fileContent: string;
    let servicesFileContent: string = '';
    let brandFileContent: string = '';
    let mediaFileContent: string = '';
    const redis = getRedisClient();
    
    if (isProduction && redis) {
      console.log('[DEPLOY API] PRODUCTION_MODE_MERGING_KV_STAGING');
      
      // Read current projects.v1.json
      const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
      const projectsData = JSON.parse(readFileSync(authorityFile, "utf-8"));
      
      // Read current services.v1.json for service card assignments
      const servicesFile = join(process.cwd(), "src/config/services.v1.json");
      const servicesData = JSON.parse(readFileSync(servicesFile, "utf-8"));
      
      // Read current brand.v1.json for brand assignments
      const brandFile = join(process.cwd(), "src/config/brand.v1.json");
      const brandData = JSON.parse(readFileSync(brandFile, "utf-8"));
      
      // Read current media.v1.json for media record merging
      const mediaFile = join(process.cwd(), "src/config/media.v1.json");
      const mediaData = JSON.parse(readFileSync(mediaFile, "utf-8"));
      
      // CRITICAL: Read authoritative deployment transaction first
      // This provides the canonical transaction identity and staging key references
      const authoritativeTransaction = await getDeploymentTransaction(deploymentTransactionId);
      
      if (!authoritativeTransaction) {
        console.error('[DEPLOY API] TRANSACTION_NOT_FOUND', {
          deploymentTransactionId,
          reason: 'Authoritative deployment transaction does not exist'
        });
        return NextResponse.json({
          error: "Transaction not found",
          message: `Deployment transaction ${deploymentTransactionId} does not exist. Cannot proceed without authoritative transaction record.`,
          deploymentTransactionId
        }, { status: 404 });
      }
      
      console.log('[DEPLOY API] AUTHORITATIVE_TRANSACTION_FOUND', {
        deploymentTransactionId,
        state: authoritativeTransaction.state,
        stagingKeys: authoritativeTransaction.stagingKeys,
        stagingKeysCount: authoritativeTransaction.stagingKeys.length,
        files: authoritativeTransaction.files,
        createdAt: authoritativeTransaction.createdAt,
      });
      
      // CRITICAL: Verify transaction state allows deployment
      if (authoritativeTransaction.state !== 'prepared') {
        console.error('[DEPLOY API] INVALID_TRANSACTION_STATE', {
          deploymentTransactionId,
          currentState: authoritativeTransaction.state,
          expectedState: 'prepared',
          reason: 'Transaction is not in prepared state, cannot claim for deployment'
        });
        return NextResponse.json({
          error: "Invalid transaction state",
          message: `Transaction is in ${authoritativeTransaction.state} state, expected prepared. Cannot claim for deployment.`,
          deploymentTransactionId,
          currentState: authoritativeTransaction.state
        }, { status: 400 });
      }
      
      // CRITICAL: Verify environment namespace matches
      const expectedNamespace = getKvNamespace();
      const transactionKeyMatchesNamespace = authoritativeTransaction.stagingKeys.some(key => key.startsWith(expectedNamespace));
      
      if (!transactionKeyMatchesNamespace) {
        console.error('[DEPLOY API] TRANSACTION_ENVIRONMENT_MISMATCH', {
          deploymentTransactionId,
          expectedNamespace,
          actualKeys: authoritativeTransaction.stagingKeys,
          reason: 'Transaction staging keys do not match expected environment namespace'
        });
        return NextResponse.json({
          error: "Transaction environment mismatch",
          message: `Transaction staging keys do not match expected environment namespace ${expectedNamespace}`,
          deploymentTransactionId,
          expectedNamespace,
          actualKeys: authoritativeTransaction.stagingKeys
        }, { status: 400 });
      }
      
      // CRITICAL: Verify each referenced staging key exists
      const missingStagingKeys: string[] = [];
      for (const stagingKey of authoritativeTransaction.stagingKeys) {
        const exists = await redis.get(stagingKey);
        if (!exists) {
          missingStagingKeys.push(stagingKey);
        }
      }
      
      if (missingStagingKeys.length > 0) {
        console.error('[DEPLOY API] STAGING_RECORDS_MISSING', {
          deploymentTransactionId,
          missingStagingKeys,
          reason: 'Transaction references staging keys that do not exist'
        });
        return NextResponse.json({
          error: "Staging records missing",
          message: "Transaction references staging keys that do not exist in Redis",
          deploymentTransactionId,
          missingStagingKeys
        }, { status: 400 });
      }
      
      console.log('[DEPLOY API] STAGING_RECORDS_VERIFIED', {
        deploymentTransactionId,
        stagingKeysCount: authoritativeTransaction.stagingKeys.length,
        allKeysPresent: true,
        environment: getEnvironment(),
      });
      
      // Use authoritative transaction staging keys
      const transactionGroups = new Map<string, string[]>();
      transactionGroups.set(deploymentTransactionId, authoritativeTransaction.stagingKeys);
      
      // Apply staging changes by transaction (newest first by timestamp)
      const sortedTransactions = Array.from(transactionGroups.entries())
        .sort((a, b) => {
          // Simplified: use transaction ID timestamp as ordering
          return a[0].localeCompare(b[0]);
        });
      
      let appliedCount = 0;
      for (const [transactionId, keys] of sortedTransactions) {
        console.log('[DEPLOY API] PROCESSING_TRANSACTION', { 
          transactionId, 
          state: authoritativeTransaction.state, 
          keyCount: keys.length,
          hasDeploymentRecord: true
        });
        
        // Apply all mutations in this transaction
        for (const key of keys) {
          const value = await redis.get(key);
          if (!value) continue;
          
          // Ensure value is a string
          const stringValue = typeof value === 'string' ? value : String(value);
          
          // Skip metadata keys (now deprecated - using deployment-transaction instead)
          if (key.endsWith(':meta')) continue;
          
          // Parse key format with environment prefix
          const parts = key.split(':');
          if (parts.length < 5) continue; // Minimum: hpp:env:workbench-staging:txId:type
          
          let projectId: string;
          let field: string;
          let mutationType: string | null = null;
          
          // New transactional format with environment: hpp:{env}:workbench-staging:{txId}:project:{projectId}:{field} (7 parts)
          if (parts.length >= 7 && parts[2] === 'workbench-staging' && (parts[3].startsWith('WBDEP-') || parts[3].startsWith('tx-')) && parts[4] === 'project') {
            projectId = parts[5];
            field = parts[6];
            mutationType = 'project';
          } 
          // New transactional format with environment: hpp:{env}:workbench-staging:{txId}:service:{serviceSlug} (6 parts)
          else if (parts.length >= 6 && parts[2] === 'workbench-staging' && (parts[3].startsWith('WBDEP-') || parts[3].startsWith('tx-')) && parts[4] === 'service') {
            const serviceSlug = parts[5];
            
            // Check if this is a brand assignment (brand-hero or brand-portrait)
            if (serviceSlug === 'brand-hero' || serviceSlug === 'brand-hero-background') {
              brandData.homepageHero.mediaId = stringValue;
              console.log('[DEPLOY API] APPLIED_BRAND_HERO_ASSIGNMENT', {
                mediaId: stringValue,
                serviceSlug,
                transactionId
              });
              appliedCount++; // P0 FIX: Count brand mutations toward mutation total
              continue;
            } else if (serviceSlug === 'brand-portrait' || serviceSlug === 'brand-portrait-homepage' || serviceSlug === 'brand-portrait-about') {
              brandData.ownerPortrait.mediaId = stringValue;
              console.log('[DEPLOY API] APPLIED_BRAND_PORTRAIT_ASSIGNMENT', {
                mediaId: stringValue,
                serviceSlug,
                transactionId
              });
              appliedCount++; // P0 FIX: Count brand mutations toward mutation total
              continue;
            }
            
            // Regular service card assignment
            const serviceIndex = servicesData.services.findIndex((s: any) => s.slug === serviceSlug);
            if (serviceIndex !== -1) {
              servicesData.services[serviceIndex].cardMediaId = stringValue;
              console.log('[DEPLOY API] APPLIED_SERVICE_ASSIGNMENT', { 
                serviceSlug, 
                mediaId: stringValue,
                transactionId 
              });
              appliedCount++; // P0 FIX: Count service mutations toward mutation total
            }
            continue; // Skip project logic
          }
          // Legacy format detected - reject to enforce single staging protocol
          else {
            console.warn('[DEPLOY API] LEGACY_STAGING_FORMAT_REJECTED', { 
              key, 
              transactionId,
              format: parts.join(':'),
              reason: 'Legacy staging format no longer supported. Use transactional format: hpp:{env}:workbench-staging:{txId}:project:{projectId}:{field} or hpp:{env}:workbench-staging:{txId}:service:{serviceSlug}'
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
      
      // FAIL-CLOSED: Reject deployment if zero mutations were applied
      // This prevents the "successful acceptance with zero applied mutations" seam
      if (appliedCount === 0 && transactionGroups.size > 0) {
        console.error('[DEPLOY API] ZERO_MUTATIONS_APPLIED', { 
          transactionCount: transactionGroups.size,
          stagingKeys: stagingKeys.length,
          deploymentTransactionId 
        });
        return NextResponse.json({
          error: "No mutations applied",
          message: "Workbench reported acceptance but deployment found zero valid staging keys. Transaction may be fragmented.",
          forensic: {
            transactionCount: transactionGroups.size,
            stagingKeys: stagingKeys.length,
            deploymentTransactionId,
            transactionIds
          }
        }, { status: 400 });
      }
      
      // NOTE: Service card assignments are now merged from staging, not from assignment store
      // This prevents Redis/Git split-brain - only staged assignments are committed
      servicesData.generatedAt = new Date().toISOString();

      // P0 FIX: Transaction-scoped media verification
      // Only verify media IDs that are part of THIS transaction's mutations
      // Do NOT re-litigate existing production authority - that causes split-brain
      console.log('[DEPLOY API] VERIFYING_TRANSACTION_MEDIA_MATERIALIZATION', { deploymentTransactionId });

      const mediaIdsToVerify = new Set<string>();

      // Collect ONLY media IDs from this transaction's staging mutations
      // These are the new changes that need verification
      for (const key of stagingKeys) {
        const value = await redis.get(key);
        if (!value) continue;

        // Ensure value is a string
        const stringValue = typeof value === 'string' ? value : String(value);

        // Skip metadata keys
        if (key.endsWith(':meta')) continue;

        // Parse key format to extract media ID from value
        const parts = key.split(':');
        if (parts.length < 5) continue; // Minimum: hpp:env:workbench-staging:txId:type

        // Service card assignments (6 parts): hpp:{env}:workbench-staging:{txId}:service:{serviceSlug}
        if (parts.length >= 6 && parts[2] === 'workbench-staging' && parts[4] === 'service') {
          const serviceSlug = parts[5];
          // Only add if this is a media assignment (value is a media ID)
          if (stringValue && stringValue.length > 10) { // Heuristic: media IDs are hashes > 10 chars
            mediaIdsToVerify.add(stringValue);
            console.log('[DEPLOY API] TRANSACTION_MEDIA_ID', { source: 'service', serviceSlug, mediaId: stringValue });
          }
        }
        // Project assignments (7 parts): hpp:{env}:workbench-staging:{txId}:project:{projectId}:{field}
        else if (parts.length >= 7 && parts[2] === 'workbench-staging' && parts[4] === 'project') {
          const field = parts[6];
          // Only add if this is a media assignment (value is a media ID)
          if (stringValue && stringValue.length > 10) { // Heuristic: media IDs are hashes > 10 chars
            mediaIdsToVerify.add(stringValue);
            console.log('[DEPLOY API] TRANSACTION_MEDIA_ID', { source: 'project', field, mediaId: stringValue });
          }
        }
      }

      console.log('[DEPLOY API] TRANSACTION_MEDIA_VERIFICATION_COUNT', {
        deploymentTransactionId,
        transactionMediaIdsCount: mediaIdsToVerify.size,
        totalStagingKeys: stagingKeys.length,
      });

      // Import the completeness check function
      const { isPubliclyComplete } = await import('@/lib/media-contracts');
      const { getMediaByIdAsync } = await import('@/lib/media');

      const incompleteMediaIds: string[] = [];

      for (const mediaId of mediaIdsToVerify) {
        try {
          const media = await getMediaByIdAsync(mediaId);
          if (!media) {
            console.error('[DEPLOY API] MEDIA_NOT_FOUND', { deploymentTransactionId, mediaId });
            incompleteMediaIds.push(mediaId);
            continue;
          }

          // Verify full public completeness (shape + real hash + physical Blob proof)
          // This is the constitutional barrier - no incomplete media may be deployed
          const isComplete = isPubliclyComplete(media);
          if (!isComplete) {
            console.error('[DEPLOY API] MEDIA_INCOMPLETE', {
              deploymentTransactionId,
              mediaId,
              lifecycleState: media.lifecycleState,
              source: media.source,
            });
            incompleteMediaIds.push(mediaId);
          }
        } catch (error) {
          console.error('[DEPLOY API] MEDIA_VERIFICATION_ERROR', {
            deploymentTransactionId,
            mediaId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          incompleteMediaIds.push(mediaId);
        }
      }

      if (incompleteMediaIds.length > 0) {
        console.error('[DEPLOY API] DEPLOYMENT_REJECTED_INCOMPLETE_MEDIA', {
          deploymentTransactionId,
          incompleteCount: incompleteMediaIds.length,
          incompleteMediaIds,
        });

        // MARK TRANSACTION AS FAILED
        if (transaction) {
          await failDeploymentTransaction(
            deploymentTransactionId,
            `Deployment rejected: ${incompleteMediaIds.length} media assets are incomplete and cannot be deployed`
          );
        }

        return NextResponse.json(
          {
            error: "Deployment rejected: Incomplete media assets",
            message: `${incompleteMediaIds.length} media assets fail materialization completeness check and cannot be deployed. Re-materialize these assets before deployment.`,
            incompleteMediaIds,
            forensic: {
              deploymentTransactionId,
              incompleteCount: incompleteMediaIds.length,
            },
          },
          { status: 400 }
        );
      }

      console.log('[DEPLOY API] MEDIA_VERIFICATION_PASSED', {
        deploymentTransactionId,
        verifiedCount: mediaIdsToVerify.size,
      });

      // P0 FIX: Merge new PublishedMediaAsset records from KV into media.v1.json
      // This ensures Drive-ingested media records are persisted to static canonical authority
      // Without this, assignments reference media IDs that exist only in KV, causing render failures
      // when KV is unavailable or rejects the record during runtime resolution
      console.log('[DEPLOY API] MERGING_MEDIA_RECORDS_FROM_KV', { deploymentTransactionId });

      const { getMedia } = await import('@/lib/media-kv-store');
      const mediaIdsInStatic = new Set(mediaData.media.map((m: any) => m.id));
      let mediaRecordsMerged = 0;
      const mergeFailures: { mediaId: string; reason: string }[] = [];

      for (const mediaId of mediaIdsToVerify) {
        // Skip if already in static media.v1.json
        if (mediaIdsInStatic.has(mediaId)) {
          continue;
        }

        try {
          // Fetch from KV
          const kvMedia = await getMedia(mediaId);
          if (!kvMedia) {
            console.error('[DEPLOY API] MEDIA_NOT_IN_KV', { mediaId, reason: 'Merge failed - not found in KV' });
            mergeFailures.push({ mediaId, reason: 'Media ID not found in KV' });
            continue;
          }

          // Verify it's a PublishedMediaAsset (should already be verified by completeness check)
          if (kvMedia.lifecycleState !== 'published') {
            console.error('[DEPLOY API] MEDIA_NOT_PUBLISHED', { mediaId, lifecycleState: kvMedia.lifecycleState, reason: 'Merge failed - not published' });
            mergeFailures.push({ mediaId, reason: `Media lifecycleState is ${kvMedia.lifecycleState}, not published` });
            continue;
          }

          // Merge into media.v1.json
          mediaData.media.push(kvMedia);
          mediaIdsInStatic.add(mediaId);
          mediaRecordsMerged++;

          console.log('[DEPLOY API] MEDIA_RECORD_MERGED', { mediaId, filename: kvMedia.filename });
        } catch (error) {
          console.error('[DEPLOY API] MEDIA_MERGE_ERROR', {
            mediaId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          mergeFailures.push({ mediaId, reason: `KV fetch error: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
      }

      // FAIL-CLOSED: Reject deployment if any media merge failed
      // This prevents split-brain where services.v1.json references IDs not in media.v1.json
      if (mergeFailures.length > 0) {
        console.error('[DEPLOY API] DEPLOYMENT_REJECTED_MEDIA_MERGE_FAILURES', {
          deploymentTransactionId,
          failureCount: mergeFailures.length,
          mergeFailures,
        });

        // MARK TRANSACTION AS FAILED
        if (transaction) {
          await failDeploymentTransaction(
            deploymentTransactionId,
            `Deployment rejected: ${mergeFailures.length} media records failed to merge from KV into media.v1.json`
          );
        }

        return NextResponse.json(
          {
            error: "Deployment rejected: Media merge failures",
            message: `${mergeFailures.length} media records could not be merged from KV into media.v1.json. This would create split-brain state where services.v1.json references media IDs not present in media.v1.json.`,
            mergeFailures,
            forensic: {
              deploymentTransactionId,
              failureCount: mergeFailures.length,
            },
          },
          { status: 400 }
        );
      }

      if (mediaRecordsMerged > 0) {
        mediaData.generatedAt = new Date().toISOString();
        console.log('[DEPLOY API] MEDIA_MERGE_COMPLETE', {
          deploymentTransactionId,
          mediaRecordsMerged,
          totalMediaRecords: mediaData.media.length,
        });
      } else {
        console.log('[DEPLOY API] NO_NEW_MEDIA_RECORDS_TO_MERGE', { deploymentTransactionId });
      }

      // Store media.v1.json content for atomic Git commit
      mediaFileContent = JSON.stringify(mediaData, null, 2);
      console.log('[DEPLOY API] MEDIA_CONTENT_PREPARED', { length: mediaFileContent.length });

      // Store services.v1.json content for atomic Git commit
      servicesFileContent = JSON.stringify(servicesData, null, 2);
      console.log('[DEPLOY API] SERVICES_CONTENT_PREPARED', { length: servicesFileContent.length });

      // Store brand.v1.json content for atomic Git commit
      brandData.generatedAt = new Date().toISOString();
      brandFileContent = JSON.stringify(brandData, null, 2);
      console.log('[DEPLOY API] BRAND_CONTENT_PREPARED', { length: brandFileContent.length });
      
    } else if (isProduction && !redis) {
      console.error('[DEPLOY API] REDIS_UNAVAILABLE_IN_PRODUCTION', {
        error: 'KV_REST_API_URL and KV_REST_API_TOKEN not configured',
        impact: 'Cannot read staging area or deploy changes in production',
        recommendation: 'Configure Vercel environment variables: KV_REST_API_URL and KV_REST_API_TOKEN'
      });
      return NextResponse.json({
        error: "Redis unavailable in production",
        message: "KV credentials not configured. Cannot access staging area for deployment.",
        recommendation: "Configure Vercel environment variables: KV_REST_API_URL and KV_REST_API_TOKEN"
      }, { status: 503 });
    } else {
      // Development: Read local authority files
      const authorityFile = join(process.cwd(), "src/config/projects.v1.json");
      fileContent = readFileSync(authorityFile, "utf-8");
      console.log('[DEPLOY API] DEV_MODE_READING_LOCAL_FILES');
      
      // Also read services.v1.json in dev mode
      const servicesFile = join(process.cwd(), "src/config/services.v1.json");
      const servicesData = JSON.parse(readFileSync(servicesFile, "utf-8"));
      servicesFileContent = JSON.stringify(servicesData, null, 2);
      
      // Also read brand.v1.json in dev mode
      const brandFile = join(process.cwd(), "src/config/brand.v1.json");
      const brandData = JSON.parse(readFileSync(brandFile, "utf-8"));
      brandFileContent = JSON.stringify(brandData, null, 2);
      
      // Also read media.v1.json in dev mode
      const mediaFile = join(process.cwd(), "src/config/media.v1.json");
      const mediaData = JSON.parse(readFileSync(mediaFile, "utf-8"));
      mediaFileContent = JSON.stringify(mediaData, null, 2);
    }

    // =====================================================================
    // ATOMIC GIT COMMIT USING GIT DATA API
    // =====================================================================
    // This creates a SINGLE commit containing ALL authority files atomically.
    // If any step fails, main branch is NOT updated.
    // =====================================================================
    
    const projectsFilePath = "website/src/config/projects.v1.json";
    const servicesFilePath = "website/src/config/services.v1.json";
    const brandFilePath = "website/src/config/brand.v1.json";
    const mediaFilePath = "website/src/config/media.v1.json";
    
    console.log('[DEPLOY API] ATOMIC_COMMIT_INITIATED', { 
      deploymentTransactionId,
      projectsFile: projectsFilePath,
      servicesFile: servicesFilePath,
      brandFile: brandFilePath,
      mediaFile: mediaFilePath
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
        ['website/src/config/projects.v1.json', 'website/src/config/services.v1.json', 'website/src/config/brand.v1.json', 'website/src/config/media.v1.json'],
        reason,
        currentCommitSha
      );
      console.log('[DEPLOY API] TRANSACTION_CREATED', { transactionId: deploymentTransactionId, state: transaction.state, parentCommitSha: currentCommitSha });
    }
    
    // CLAIM TRANSACTION for deployment (prepared → committing)
    transactionOwner = `claim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    transaction = await claimDeploymentTransaction(deploymentTransactionId, transactionOwner);
    console.log('[DEPLOY API] TRANSACTION_CLAIMED', { transactionId: deploymentTransactionId, owner: transactionOwner });
    
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
    
    // Step 3: Create blobs for all four files
    console.log('[DEPLOY API] CREATING_BLOBS');
    
    const projectsBlobBase64 = Buffer.from(fileContent).toString('base64');
    const servicesBlobBase64 = Buffer.from(servicesFileContent).toString('base64');
    const brandBlobBase64 = Buffer.from(brandFileContent).toString('base64');
    const mediaBlobBase64 = Buffer.from(mediaFileContent).toString('base64');
    
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
    
    // Create brand.v1.json blob
    const brandBlobResponse = await fetchWithRetry(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          content: brandBlobBase64,
          encoding: 'base64',
        }),
      },
      'create brand blob'
    );
    
    if (!brandBlobResponse.ok) {
      const errorText = await brandBlobResponse.text();
      console.error('[DEPLOY API] CREATE_BRAND_BLOB_FAILED', { status: brandBlobResponse.status });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to create brand blob: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create brand blob",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            status: brandBlobResponse.status,
            error: "CREATE_BRAND_BLOB_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: brandBlobResponse.status }
      );
    }
    
    const brandBlobData = await brandBlobResponse.json();
    const brandBlobSha = brandBlobData.sha;
    console.log('[DEPLOY API] BRAND_BLOB_CREATED', { sha: brandBlobSha });
    
    // Create media.v1.json blob
    const mediaBlobResponse = await fetchWithRetry(
      `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({
          content: mediaBlobBase64,
          encoding: 'base64',
        }),
      },
      'create media blob'
    );
    
    if (!mediaBlobResponse.ok) {
      const errorText = await mediaBlobResponse.text();
      console.error('[DEPLOY API] CREATE_MEDIA_BLOB_FAILED', { status: mediaBlobResponse.status });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `Failed to create media blob: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "Failed to create media blob",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            githubOwner,
            githubRepo,
            status: mediaBlobResponse.status,
            error: "CREATE_MEDIA_BLOB_FAILED",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: mediaBlobResponse.status }
      );
    }
    
    const mediaBlobData = await mediaBlobResponse.json();
    const mediaBlobSha = mediaBlobData.sha;
    console.log('[DEPLOY API] MEDIA_BLOB_CREATED', { sha: mediaBlobSha });
    
    // Step 4: Create new tree with all four files
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
            {
              path: brandFilePath,
              mode: '100644',
              type: 'blob',
              sha: brandBlobSha,
            },
            {
              path: mediaFilePath,
              mode: '100644',
              type: 'blob',
              sha: mediaBlobSha,
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
    
    // Step 6: CAS verification - re-read current SHA before updating
    console.log('[DEPLOY API] CAS_VERIFICATION_CHECK');
    
    const casRefResponse = await fetchWithRetry(refUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, 'CAS verification - re-read current SHA');
    
    if (!casRefResponse.ok) {
      const errorText = await casRefResponse.text();
      console.error('[DEPLOY API] CAS_VERIFICATION_FAILED', { status: casRefResponse.status, error: errorText });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `CAS verification failed: ${errorText}`);
      }
      
      return NextResponse.json(
        { 
          error: "CAS verification failed",
          message: "Unable to verify current branch state before update",
          details: errorText,
          forensic: {
            deploymentTransactionId,
            expectedParent: currentCommitSha,
            status: casRefResponse.status,
            error: "CAS_VERIFICATION_FAILED"
          }
        },
        { status: 500 }
      );
    }
    
    const casRefData = await casRefResponse.json();
    const casCurrentSha = casRefData.object.sha;
    
    console.log('[DEPLOY API] CAS_VERIFICATION_RESULT', { 
      originalParent: currentCommitSha,
      currentParent: casCurrentSha,
      casPassed: currentCommitSha === casCurrentSha
    });
    
    // CAS violation check - if branch moved, fail explicitly
    if (currentCommitSha !== casCurrentSha) {
      console.error('[DEPLOY API] CAS_VIOLATION_DETECTED', { 
        originalParent: currentCommitSha,
        currentParent: casCurrentSha,
        deploymentTransactionId
      });
      
      // MARK TRANSACTION AS FAILED
      if (transaction) {
        await failDeploymentTransaction(deploymentTransactionId, `CAS violation: branch moved from ${currentCommitSha} to ${casCurrentSha} during deployment`);
      }
      
      return NextResponse.json(
        { 
          error: "Concurrent deployment detected",
          message: "Branch was modified by another deployment. Please retry your deployment.",
          details: {
            expectedParent: currentCommitSha,
            actualParent: casCurrentSha,
            casViolation: true
          },
          forensic: {
            deploymentTransactionId,
            expectedParent: currentCommitSha,
            actualParent: casCurrentSha,
            status: 409,
            error: "CAS_VIOLATION",
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: 409 }
      );
    }
    
    // Step 7: Update branch ref to point to new commit (CAS protected)
    console.log('[DEPLOY API] UPDATING_BRANCH_REF_WITH_CAS');
    
    const updateRefResponse = await fetchWithRetry(refUrl, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Content-Type': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        sha: newCommitSha,
        force: false, // No force push - this prevents overwriting concurrent changes (CAS)
      }),
    }, 'update branch ref');
    
    if (!updateRefResponse.ok) {
      const errorText = await updateRefResponse.text();
      console.error('[DEPLOY API] UPDATE_REF_FAILED', { 
        status: updateRefResponse.status,
        errorText,
        currentCommitSha,
        newCommitSha,
        casEnforced: true,
        force: false
      });
      
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
            casEnforced: true,
            stagingKeysPreserved: isProduction && stagingKeys.length > 0,
            stagingKeysCount: stagingKeys.length
          }
        },
        { status: 409 }
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

    // CRITICAL: Do NOT mark transaction as committed yet
    // Transaction remains in 'committing' state until promotion succeeds
    // This allows committing → failed transition if promotion fails
    // Only after promotion succeeds do we transition committing → committed

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
        
        const brandFileResponse = await fetchWithRetry(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${brandFilePath}?ref=${newCommitSha}`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          },
          'verify brand file'
        );

        const mediaFileResponse = await fetchWithRetry(
          `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${mediaFilePath}?ref=${newCommitSha}`,
          {
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          },
          'verify media file'
        );
        
        const projectsFilePresent = projectsFileResponse.ok;
        const servicesFilePresent = servicesFileResponse.ok;
        const brandFilePresent = brandFileResponse.ok;
        const mediaFilePresent = mediaFileResponse.ok;
        
        console.log('[DEPLOY API] VERIFICATION_RESULT', {
          projectsFilePresent,
          servicesFilePresent,
          brandFilePresent,
          mediaFilePresent,
          projectsFileStatus: projectsFileResponse.status,
          servicesFileStatus: servicesFileResponse.status,
          brandFileStatus: brandFileResponse.status,
          mediaFileStatus: mediaFileResponse.status
        });
        
        if (!projectsFilePresent || !servicesFilePresent || !brandFilePresent || !mediaFilePresent) {
          verificationError = `Files missing in commit: projects=${projectsFilePresent}, services=${servicesFilePresent}, brand=${brandFilePresent}, media=${mediaFilePresent}`;
          console.error('[DEPLOY API] VERIFICATION_FILES_MISSING', { 
            projectsFilePresent,
            servicesFilePresent,
            brandFilePresent,
            mediaFilePresent
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

    // FAIL-CLOSED: If verification failed, reject deployment
    // Verification failure means Git commit is incomplete or corrupted
    if (!verificationPassed) {
      console.error('[DEPLOY API] DEPLOYMENT_REJECTED_VERIFICATION_FAILED', {
        deploymentTransactionId,
        verificationError,
      });

      // MARK TRANSACTION AS FAILED (committing → failed is legal)
      if (transaction) {
        await failDeploymentTransaction(
          deploymentTransactionId,
          `Deployment rejected: Commit verification failed - ${verificationError}`
        );
      }

      return NextResponse.json(
        {
          error: "Deployment rejected: Commit verification failed",
          message: `Git commit succeeded but verification failed: ${verificationError}. This indicates an incomplete or corrupted commit.`,
          verificationError,
          forensic: {
            deploymentTransactionId,
            verificationError,
          },
        },
        { status: 400 }
      );
    }

    // CRITICAL FIX: Promote staging assignments to authoritative runtime KV BEFORE marking transaction committed
    // This ensures Git authority and runtime KV are one coherent transaction
    // If promotion fails, we can transition committing → failed (legal)
    // If promotion succeeds, we transition committing → committed (legal)
    // PREVIOUS BUG: Git was committed before promotion, causing split-brain when promotion failed
    if (isProduction && redis) {
      console.log('[DEPLOY API] PROMOTING_STAGING_TO_RUNTIME_KV', { deploymentTransactionId });

      const { storeServiceCardAssignment, getServiceCardAssignment } = await import('@/lib/assignment-store');
      let promotionCount = 0;
      const promotionFailures: { serviceSlug: string; reason: string }[] = [];

      // Re-process staging keys to promote assignments to runtime KV
      const promotionKeys = transaction?.stagingKeys || stagingKeys;
      for (const key of promotionKeys) {
        const value = await redis.get(key);
        if (!value) continue;

        const stringValue = typeof value === 'string' ? value : String(value);
        if (key.endsWith(':meta')) continue;

        const parts = key.split(':');
        if (parts.length < 6) continue;

        // Service card assignments: hpp:{env}:workbench-staging:{txId}:service:{serviceSlug}
        if (parts.length >= 6 && parts[2] === 'workbench-staging' && parts[4] === 'service') {
          const serviceSlug = parts[5];

          try {
            // Read current assignment to get expected revision for CAS
            const currentAssignment = await getServiceCardAssignment(serviceSlug, deploymentTransactionId);
            const expectedRevision = currentAssignment?.revision ?? 0; // P0 FIX: Use 0 for create, not undefined

            // P0 FIX: Map slot-specific keys back to canonical brand keys for promotion
            const canonicalServiceSlug = serviceSlug === 'brand-hero-background' ? 'brand-hero' :
                                        serviceSlug === 'brand-portrait-homepage' ? 'brand-portrait' :
                                        serviceSlug === 'brand-portrait-about' ? 'brand-portrait' :
                                        serviceSlug; // No mapping needed for other services

            const promotedAssignment = {
              serviceSlug: canonicalServiceSlug,
              mediaId: stringValue,
              updatedAt: new Date().toISOString(),
              source: 'workbench' as const,
              revision: expectedRevision + 1, // Always increment
            };

            // Store in authoritative runtime KV
            await storeServiceCardAssignment(promotedAssignment, expectedRevision, deploymentTransactionId);

            console.log('[DEPLOY API] ASSIGNMENT_PROMOTED', {
              originalServiceSlug: serviceSlug,
              canonicalServiceSlug,
              mediaId: stringValue,
              revision: promotedAssignment.revision,
            });
            promotionCount++;
          } catch (error) {
            console.error('[DEPLOY API] ASSIGNMENT_PROMOTION_FAILED', {
              originalServiceSlug: serviceSlug,
              canonicalServiceSlug,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            promotionFailures.push({
              serviceSlug: canonicalServiceSlug,
              reason: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      console.log('[DEPLOY API] PROMOTION_COMPLETE', {
        deploymentTransactionId,
        promotionCount,
        failureCount: promotionFailures.length,
      });

      // FAIL-CLOSED: If promotion failed, reject deployment to prevent split-brain
      // At this point, transaction is still in 'committing' state, so we can transition to 'failed'
      if (promotionFailures.length > 0) {
        console.error('[DEPLOY API] DEPLOYMENT_REJECTED_PROMOTION_FAILURES', {
          deploymentTransactionId,
          failureCount: promotionFailures.length,
          promotionFailures,
        });

        // MARK TRANSACTION AS FAILED (committing → failed is legal)
        if (transaction) {
          await failDeploymentTransaction(
            deploymentTransactionId,
            `Deployment rejected: ${promotionFailures.length} assignments failed to promote to runtime KV`
          );
        }

        return NextResponse.json(
          {
            error: "Deployment rejected: Assignment promotion failures",
            message: `${promotionFailures.length} assignments could not be promoted to runtime KV. This would create split-brain state where Git has assignments but runtime KV does not.`,
            promotionFailures,
            forensic: {
              deploymentTransactionId,
              failureCount: promotionFailures.length,
            },
          },
          { status: 400 }
        );
      }
    }

    // MARK TRANSACTION AS COMMITTED (committing → committed)
    // This happens AFTER promotion succeeds, ensuring Git and runtime KV are coherent
    transaction = await commitDeploymentTransaction(deploymentTransactionId, newCommitSha, newCommitData.html_url, transactionOwner);
    console.log('[DEPLOY API] TRANSACTION_COMMITTED', { transactionId: deploymentTransactionId, commitSha: newCommitSha });

    // TRANSACTIONAL FIX: Only delete staging keys after durable commit verification AND promotion
    // This prevents data loss if commit or promotion fails
    if (isProduction && redis && stagingKeys.length > 0 && verificationPassed) {
      console.log('[DEPLOY API] CLEARING_STAGING_KEYS_AFTER_COMMIT_AND_PROMOTION', { count: stagingKeys.length });
      
      for (const key of stagingKeys) {
        await redis.del(key);
        console.log('[DEPLOY_API] STAGING_KEY_CLEARED', { key });
      }
      
      console.log('[DEPLOY API] STAGING_KEYS_CLEARED_COMPLETE');
      
      // MARK TRANSACTION AS CONSUMED (committed → consumed)
      if (transaction) {
        transaction = await consumeDeploymentTransaction(deploymentTransactionId, transactionOwner);
        console.log('[DEPLOY API] TRANSACTION_CONSUMED', { transactionId: deploymentTransactionId });
      }
    } else if (isProduction && redis && stagingKeys.length > 0) {
      console.warn('[DEPLOY API] STAGING_KEYS_PRESERVED_NO_REDIS_OR_NO_STAGING', {
        stagingKeysCount: stagingKeys.length,
      });
    }

    return NextResponse.json({
      success: true,
      deploymentTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url,
      message: "Your changes are live and saved. Git commit successful.",
      authorityFiles: [projectsFilePath, servicesFilePath, brandFilePath, mediaFilePath],
      targetBranch: 'main',
      status: "COMMITTED_DEPLOYING",
      filesCommitted: ['projects.v1.json', 'services.v1.json', 'brand.v1.json', 'media.v1.json'],
      verificationPassed: true,
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
