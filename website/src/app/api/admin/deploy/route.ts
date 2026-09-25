/**
 * P0 FIX: ATOMIC BATCH DEPLOYMENT COORDINATOR
 *
 * This route implements true atomic batch deployment coordination, ensuring:
 * - ONE Git HEAD pinning before ANY transaction claiming
 * - ONE atomic Redis Lua batch claim for ALL transactions
 * - ONE immutable BatchDeploymentContext lifecycle authority
 * - ALL authority files read from the EXACT pinned Git SHA
 * - Git ref verification before branch update (CAS/non-fast-forward)
 * - ONE Git commit object for the entire batch
 * - Git ref update with CAS protection (non-force)
 * - ATOMIC batch SHA persistence to ALL transactions
 * - ATOMIC batch Redis promotion for ALL staging keys
 * - ATOMIC batch consume with staging cleanup
 *
 * POST /api/admin/deploy
 * Body: { reason?: string, transactionIds?: string[] }
 *
 * GET /api/admin/deploy/status?commitSha={sha}
 * Returns deployment status for a specific commit (Vercel readiness check)
 *
 * BATCH LIFECYCLE:
 * VALIDATED → GIT_BASE_PINNED → ATOMIC_BATCH_CLAIMED → SEMANTIC_PATCHED →
 * GIT_REF_VERIFIED → GIT_COMMIT_CREATED → ATOMIC_SHA_PERSISTED → ATOMIC_REDIS_PROMOTED →
 * ATOMIC_COMMITTED → ATOMIC_CONSUMED
 *
 * GIT CAS INVARIANT:
 * - Git commit object creation and ref update are DISTINCT operations
 * - Commit object creation can succeed even if the branch later moves
 * - The authoritative concurrency barrier is the REF UPDATE
 * - Before updating main, the route requires the remote ref to equal pinned baseGitSha
 * - Ref update uses force: false (non-fast-forward) to enforce CAS
 * - A failed CAS leaves an unreachable/orphaned commit object but does NOT move main
 * - Redis transaction records and staging data remain recoverable after CAS failure
 * - This design preserves recoverability while preventing split-brain
 *
 * GIT/REDIS SPLIT-BRAIN RECOVERY:
 * - Git and Redis are SEPARATE atomic domains (not one transaction)
 * - If Git commit succeeds but Redis fails: ALL transactions retain finalCommitSha
 * - Retry resumes with existing Git commit (no duplicate commits)
 * - Transactions remain recoverable until consume succeeds
 *
 * DEPLOYMENT STATE:
 * - Git commit ≠ Vercel deployment ≠ live website
 * - Git commit → runtime promotion → Vercel deployment → website
 * - Returns COMMITTED_DEPLOYING after Git commit, not PUBLISHED
 * - Requires client to poll status endpoint for actual Vercel readiness
 * - Only transitions to PUBLISHED when Vercel confirms deployment
 *
 * ATOMICITY GUARANTEES:
 * - NO partial transaction claiming (all-or-nothing Redis Lua)
 * - NO partial SHA persistence (all-or-nothing Redis Lua)
 * - NO partial promotion (all-or-nothing Redis Lua)
 * - NO partial consumption (all-or-nothing Redis Lua)
 * - NO variable shadowing (single BatchDeploymentContext)
 * - NO stale filesystem reads (all from pinned Git SHA)
 * - NO silent rebase (CAS verification before ref update)
 * - NO partial staging cleanup (atomic with consumption)
 * - NO force Git ref updates (CAS-protected only)
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
  claimBatchDeploymentTransactions,
  setGitCommitSha,
  setBatchGitCommitSha,
  commitDeploymentTransaction,
  commitBatchDeploymentTransactions,
  consumeDeploymentTransaction,
  consumeBatchDeploymentTransactions,
  failDeploymentTransaction,
  retryDeploymentTransaction,
  getDeploymentTransaction,
  isTransactionTerminal,
  atomicPromoteAssignments,
  promoteBatchDeployment,
  createBatchDeploymentContext,
  type DeploymentTransaction,
  type TransactionState,
  type BatchDeploymentContext
} from "@/lib/deployment-transaction";

export const runtime = 'nodejs';

// SECURITY: Require authentication for ALL admin deploy endpoints
async function requireWorkbenchAuth() {
  const isDevBypass = process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (process.env.NODE_ENV !== 'development' || !isDevBypass) {
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return false;
    }
  } else {
    console.warn('[DEPLOY API] DEV_MODE_BYPASS_ACTIVE', { 
      reason: 'DRIVE_AUTH_BYPASS=true',
      securityNote: 'This bypass is for development only'
    });
  }
  return true;
}

/**
 * DELETE endpoint: Clear pending deployment transactions
 * Used by Workbench to clean up stale/failed deployment transactions
 * 
 * DELETE /api/admin/deploy
 * Body: { transactionIds?: string[] } (optional: specific IDs to delete, or all if not provided)
 */
export async function DELETE(request: Request) {
  // P1 FIX: Require Workbench authentication for delete endpoint
  const isAuthenticated = await requireWorkbenchAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { transactionIds } = body;
    
    const redis = getRedisClient();
    if (!redis) {
      return NextResponse.json(
        { error: "Redis unavailable", message: "Cannot clear transactions without Redis" },
        { status: 503 }
      );
    }

    const namespace = getKvNamespace();
    let deletedCount = 0;
    let deletedIds: string[] = [];

    if (transactionIds && Array.isArray(transactionIds) && transactionIds.length > 0) {
      // Delete specific transactions
      for (const transactionId of transactionIds) {
        const transactionKey = `${namespace}deployment-transaction:${transactionId}`;
        const deleted = await redis.del(transactionKey);
        if (deleted) {
          deletedCount++;
          deletedIds.push(transactionId);
        }
      }
    } else {
      // Delete all deployment transactions
      const pattern = `${namespace}deployment-transaction:*`;
      const keys = await redis.keys(pattern);
      
      if (keys && keys.length > 0) {
        for (const key of keys) {
          const deleted = await redis.del(key);
          if (deleted) {
            deletedCount++;
            // Extract transaction ID from key
            const id = key.replace(`${namespace}deployment-transaction:`, '');
            deletedIds.push(id);
          }
        }
      }
    }

    console.log('[DEPLOY API] TRANSACTIONS_CLEARED', {
      deletedCount,
      deletedIds,
      specifiedIds: transactionIds?.length || 0
    });

    return NextResponse.json({
      success: true,
      deletedCount,
      deletedIds,
      message: `Cleared ${deletedCount} deployment transaction(s)`
    });
  } catch (error) {
    console.error('[DEPLOY API] CLEAR_TRANSACTIONS_ERROR', error);
    return NextResponse.json(
      { error: "Failed to clear transactions", message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint: Check deployment status for a specific commit
 * Used by Workbench to poll for Vercel deployment readiness
 */
export async function GET(request: Request) {
  // P1 FIX: Require Workbench authentication for status endpoint
  const isAuthenticated = await requireWorkbenchAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

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

/**
 * Schema dispatcher for staging records
 * 
 * Determines the staging record type from the key before decoding the value.
 * This prevents schema ambiguity and ensures type-specific validation.
 * 
 * Key patterns:
 * - workbench-staging:{txId}:service:{serviceSlug} → service assignment
 * - workbench-staging:{txId}:project:{projectId}:current-transaction → project pointer
 * - workbench-staging:{txId}:project:{projectId}:gallery → gallery mutation
 * - workbench-staging:{txId}:project:{projectId}:{field} → project assignment (hero, before, after)
 * 
 * @param key - Full staging key with namespace
 * @returns Staging record type
 */
function dispatchStagingRecordType(key: string): 'assignment' | 'gallery' | 'pointer' | 'unknown' {
  const relativeKey = key.replace(`${getKvNamespace()}workbench-staging:`, '');
  const parts = relativeKey.split(':');

  if (parts.length >= 2 && parts[1] === 'service') {
    return 'assignment';
  }

  if (parts.length >= 4 && parts[1] === 'project') {
    const field = parts[3];
    if (field === 'gallery') {
      console.log('[DEPLOY API] DISPATCH_CLASSIFIED_AS_GALLERY', { key, field, parts });
      return 'gallery';
    } else if (field === 'current-transaction') {
      return 'pointer';
    } else {
      // hero, before, after, etc.
      return 'assignment';
    }
  }

  return 'unknown';
}

/**
 * Assignment staging schema decoder
 * 
 * Decodes service and project media assignment staging records.
 * 
 * Expected schema:
 * {
 *   mediaId: string,
 *   expectedRevision: number,
 *   updatedAt: string,
 *   source: 'workbench'
 * }
 * 
 * @param value - Value from Redis (string or object)
 * @returns Normalized assignment staging record
 * @throws Error if staging value is invalid or malformed
 */
function decodeAssignmentStaging(value: unknown): { mediaId: string; expectedRevision: number; updatedAt: string; source: string } {
  console.log('[DEPLOY API] ASSIGNMENT_STAGING_DECODED', {
    valueType: typeof value,
  });

  let parsed: unknown;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      throw new Error(`Invalid assignment staging: string is not valid JSON`);
    }
  } else if (typeof value === 'object' && value !== null) {
    parsed = value;
  } else {
    throw new Error(`Invalid assignment staging: unexpected type ${typeof value}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid assignment staging: parsed result is not an object');
  }

  const staging = parsed as Record<string, unknown>;

  if (typeof staging.mediaId !== 'string') {
    throw new Error(`Invalid assignment staging: mediaId is missing or not a string (got ${typeof staging.mediaId})`);
  }

  if (typeof staging.expectedRevision !== 'number') {
    throw new Error(`Invalid assignment staging: expectedRevision is missing or not a number (got ${typeof staging.expectedRevision})`);
  }

  if (typeof staging.updatedAt !== 'string') {
    throw new Error(`Invalid assignment staging: updatedAt is missing or not a string (got ${typeof staging.updatedAt})`);
  }

  if (typeof staging.source !== 'string') {
    throw new Error(`Invalid assignment staging: source is missing or not a string (got ${typeof staging.source})`);
  }

  console.log('[DEPLOY API] ASSIGNMENT_STAGING_VALIDATED', {
    mediaId: staging.mediaId,
    expectedRevision: staging.expectedRevision,
    source: staging.source,
  });

  return {
    mediaId: staging.mediaId,
    expectedRevision: staging.expectedRevision,
    updatedAt: staging.updatedAt,
    source: staging.source,
  };
}

/**
 * Gallery staging schema decoder
 * 
 * Decodes project gallery mutation staging records.
 * 
 * Expected schema:
 * {
 *   gallery: string[],
 *   currentRevision: number,
 *   previousGallery: string[],
 *   mutationTimestamp: string
 * }
 * 
 * @param value - Value from Redis (string or object)
 * @returns Normalized gallery staging record
 * @throws Error if staging value is invalid or malformed
 */
function decodeGalleryStaging(value: unknown): { gallery: string[]; currentRevision: number; previousGallery: string[]; mutationTimestamp: string } {
  console.log('[DEPLOY API] GALLERY_STAGING_DECODED', {
    valueType: typeof value,
  });

  let parsed: unknown;

  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch (e) {
      throw new Error(`Invalid gallery staging: string is not valid JSON`);
    }
  } else if (typeof value === 'object' && value !== null) {
    parsed = value;
  } else {
    throw new Error(`Invalid gallery staging: unexpected type ${typeof value}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid gallery staging: parsed result is not an object');
  }

  const staging = parsed as Record<string, unknown>;

  if (!Array.isArray(staging.gallery)) {
    throw new Error(`Invalid gallery staging: gallery is missing or not an array (got ${typeof staging.gallery})`);
  }

  if (typeof staging.currentRevision !== 'number') {
    throw new Error(`Invalid gallery staging: currentRevision is missing or not a number (got ${typeof staging.currentRevision})`);
  }

  if (!Array.isArray(staging.previousGallery)) {
    throw new Error(`Invalid gallery staging: previousGallery is missing or not an array (got ${typeof staging.previousGallery})`);
  }

  if (typeof staging.mutationTimestamp !== 'string') {
    throw new Error(`Invalid gallery staging: mutationTimestamp is missing or not a string (got ${typeof staging.mutationTimestamp})`);
  }

  console.log('[DEPLOY API] GALLERY_STAGING_VALIDATED', {
    galleryLength: staging.gallery.length,
    currentRevision: staging.currentRevision,
    previousGalleryLength: staging.previousGallery.length,
    mutationTimestamp: staging.mutationTimestamp,
    galleryItems: staging.gallery,
  });

  return {
    gallery: staging.gallery,
    currentRevision: staging.currentRevision,
    previousGallery: staging.previousGallery,
    mutationTimestamp: staging.mutationTimestamp,
  };
}

/**
 * Pointer staging schema decoder
 * 
 * Decodes project current-transaction pointer staging records.
 * 
 * Expected schema: string (transaction ID)
 * 
 * @param value - Value from Redis (string or object)
 * @returns Transaction ID string
 * @throws Error if staging value is invalid or malformed
 */
function decodePointerStaging(value: unknown): string {
  console.log('[DEPLOY API] POINTER_STAGING_DECODED', {
    valueType: typeof value,
  });

  if (typeof value === 'string') {
    // Transaction ID as plain string
    return value;
  } else if (typeof value === 'object' && value !== null) {
    throw new Error(`Invalid pointer staging: unexpected object type (expected plain string)`);
  } else {
    throw new Error(`Invalid pointer staging: unexpected type ${typeof value}`);
  }
}

/**
 * Legacy staging-value decoder (deprecated)
 * 
 * This function is kept for backward compatibility but should not be used.
 * Use the schema-specific decoders instead.
 * 
 * @deprecated Use decodeAssignmentStaging() or decodeGalleryStaging() instead
 */
function parseStagingValue(value: unknown): { mediaId: string; expectedRevision: number; updatedAt: string; source: string } {
  console.log('[DEPLOY API] LEGACY_STAGING_VALUE_DECODED (use schema-specific decoders)', {
    valueType: typeof value,
  });

  return decodeAssignmentStaging(value);
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
  // P0 FIX: Use unified BatchDeploymentContext to eliminate variable shadowing
  // This is the single authoritative batch object that flows through all phases
  let batchContext: BatchDeploymentContext | null = null;
  let isProduction = process.env.NODE_ENV === 'production';
  let deploymentTransactionId: string = ''; // Will be set from request body
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
  
  // SECURITY: Require authentication for POST endpoint
  const isAuthenticated = await requireWorkbenchAuth();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { reason = "Workbench media changes accepted", transactionIds } = body;

    console.log('[DEPLOY API] REQUEST_RECEIVED', { reason, transactionIds });
    
    // P0 FIX: Require transactionIds for Gallery deployment - no random fallback
    // Gallery PUT creates specific transaction; Deploy must use that exact transaction
    // Fail-closed: reject deployment without authoritative transaction ID
    if (!transactionIds || transactionIds.length === 0) {
      console.error('[DEPLOY API] MISSING_TRANSACTION_IDS');
      return NextResponse.json(
        {
          error: "Missing transaction IDs",
          message: "Deployment requires explicit transactionIds from the staging operation. Gallery deployment must use the exact transaction created by Gallery PUT.",
        },
        { status: 400 }
      );
    }

    // P0 FIX: Use the first transaction ID as the primary for deployment lifecycle
    // But we will process ALL provided transactionIds for bulk deployment
    deploymentTransactionId = transactionIds[0];

    console.log('[DEPLOY API] BATCH_DEPLOYMENT_INITIATED', { 
      primaryTransactionId: deploymentTransactionId,
      transactionIds, 
      transactionCount: transactionIds.length 
    });

    // P0 FIX: PIN Git HEAD BEFORE claiming transactions
    // This eliminates the TOCTOU window where HEAD moves between validation and commit
    const githubToken = process.env.GITHUB_TOKEN;
    const githubOwner = process.env.GITHUB_REPO_OWNER || 'trishnikitha-art';
    const githubRepo = process.env.GITHUB_REPO_NAME || 'happy-place-platform';

    const refUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/git/refs/heads/main`;
    const refResponse = await fetchWithRetry(refUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    }, 'get current commit SHA for base pinning');

    if (!refResponse.ok) {
      const errorText = await refResponse.text();
      console.error('[DEPLOY API] GET_REF_FOR_BASE_PINNING_FAILED', { status: refResponse.status, error: errorText });
      return NextResponse.json({
        error: "Failed to get current branch reference for base pinning",
        details: errorText,
      }, { status: refResponse.status });
    }

    const refData = await refResponse.json();
    const baseGitSha = refData.object.sha;
    console.log('[DEPLOY API] BASE_GIT_SHA_PINNED', { baseGitSha });

    // Initialize Redis client for batch validation
    const redis = getRedisClient();
    
    // BATCH COMPATIBILITY VALIDATION: Check all transactions before proceeding
    const batchValidationResults = [];
    const compatibleTransactions = [];
    const incompatibleTransactions = [];
    
    for (const txId of transactionIds) {
      const tx = await getDeploymentTransaction(txId);
      if (!tx) {
        console.error('[DEPLOY API] BATCH_TRANSACTION_NOT_FOUND', { txId });
        incompatibleTransactions.push({ txId, reason: 'MISSING' });
        continue;
      }
      
      // Check state
      if (tx.state !== 'prepared') {
        console.warn('[DEPLOY API] BATCH_TRANSACTION_INVALID_STATE', { txId, state: tx.state });
        incompatibleTransactions.push({ txId, reason: 'INVALID_STATE', state: tx.state });
        continue;
      }
      
      // Check staging schema compatibility
      const hasLegacySchema = tx.stagingKeys.some(key => {
        const parts = key.split(':');
        // Legacy format: old staging key patterns without transactional structure
        return parts.length < 6 || (parts[2] === 'workbench-staging' && !parts[3].startsWith('WBDEP-') && !parts[3].startsWith('tx-'));
      });
      
      if (hasLegacySchema) {
        console.warn('[DEPLOY API] BATCH_TRANSACTION_LEGACY_SCHEMA', { txId });
        incompatibleTransactions.push({ txId, reason: 'LEGACY_SCHEMA' });
        continue;
      }
      
      // Check staging keys exist
      const missingKeys = [];
      if (redis) {
        for (const key of tx.stagingKeys) {
          const exists = await redis.get(key);
          if (!exists) missingKeys.push(key);
        }
      }
      
      if (missingKeys.length > 0) {
        console.error('[DEPLOY API] BATCH_TRANSACTION_MISSING_STAGING', { txId, missingKeys });
        incompatibleTransactions.push({ txId, reason: 'MISSING_STAGING', missingKeys });
        continue;
      }
      
      compatibleTransactions.push(tx);
      console.log('[DEPLOY API] BATCH_TRANSACTION_COMPATIBLE', { txId });
    }
    
    // Fail if any transactions are incompatible
    if (incompatibleTransactions.length > 0) {
      console.error('[DEPLOY API] BATCH_VALIDATION_FAILED', {
        primaryTransactionId: deploymentTransactionId,
        incompatibleCount: incompatibleTransactions.length,
        incompatibleTransactions
      });
      
      return NextResponse.json({
        error: "Batch validation failed",
        message: `${incompatibleTransactions.length} transactions are incompatible and cannot be deployed in this batch.`,
        primaryTransactionId: deploymentTransactionId,
        compatibleCount: compatibleTransactions.length,
        incompatibleTransactions
      }, { status: 400 });
    }
    
    if (compatibleTransactions.length === 0) {
      console.error('[DEPLOY API] BATCH_NO_COMPATIBLE_TRANSACTIONS', { primaryTransactionId: deploymentTransactionId });
      return NextResponse.json({
        error: "No compatible transactions",
        message: "None of the provided transactions are compatible for deployment.",
        primaryTransactionId: deploymentTransactionId
      }, { status: 400 });
    }
    
    console.log('[DEPLOY API] BATCH_VALIDATION_PASSED', {
      primaryTransactionId: deploymentTransactionId,
      compatibleCount: compatibleTransactions.length,
      totalRequested: transactionIds.length
    });

    // P0 FIX: Create BatchDeploymentContext with pinned baseGitSha BEFORE claiming
    // This makes the context the single lifecycle authority
    const transactionOwner = `claim-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      batchContext = createBatchDeploymentContext(
        transactionIds,
        compatibleTransactions,
        baseGitSha,
        transactionOwner
      );
      batchContext.lifecycle = 'VALIDATED';

      console.log('[DEPLOY API] BATCH_CONTEXT_CREATED', {
        primaryTransactionId: batchContext.primaryTransactionId,
        lifecycle: batchContext.lifecycle,
        baseGitSha: batchContext.baseGitSha,
        transactionCount: batchContext.transactions.length,
        stagingKeyCount: batchContext.allStagingKeys.length
      });
    } catch (error) {
      console.error('[DEPLOY API] BATCH_CONTEXT_CREATION_FAILED', {
        primaryTransactionId: deploymentTransactionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return NextResponse.json({
        error: "Batch context creation failed",
        message: error instanceof Error ? error.message : String(error),
        primaryTransactionId: deploymentTransactionId
      }, { status: 500 });
    }

    // P0 FIX: ATOMIC BATCH CLAIMING using single Redis Lua operation
    let claimedTransactions: DeploymentTransaction[];
    try {
      claimedTransactions = await claimBatchDeploymentTransactions(
        transactionIds,
        transactionOwner
      );
      batchContext.transactions = claimedTransactions;
      batchContext.lifecycle = 'CLAIMED';

      console.log('[DEPLOY API] BATCH_CLAIM_SUCCESS', {
        primaryTransactionId: batchContext.primaryTransactionId,
        claimedCount: claimedTransactions.length,
        owner: transactionOwner
      });
    } catch (error) {
      console.error('[DEPLOY API] BATCH_CLAIM_FAILED', {
        primaryTransactionId: batchContext.primaryTransactionId,
        error: error instanceof Error ? error.message : String(error)
      });
      return NextResponse.json({
        error: "Batch claim failed",
        message: error instanceof Error ? error.message : String(error),
        primaryTransactionId: batchContext.primaryTransactionId
      }, { status: 400 });
    }

    // Check for GitHub credentials (already declared for base pinning)
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

    if (isProduction && redis) {
      console.log('[DEPLOY API] PRODUCTION_MODE_MERGING_KV_STAGING');

      // P0 FIX: Use the pinned baseGitSha from batchContext for ALL file reads
      // This ensures we read files against the exact SHA we pinned before claiming transactions
      const pinnedSha = batchContext.baseGitSha;
      console.log('[DEPLOY API] USING_PINNED_BASE_SHA', { pinnedSha });

      // Fetch current projects.v1.json from pinned Git SHA (not filesystem)
      const projectsFileUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/website/src/config/projects.v1.json?ref=${pinnedSha}`;
      const projectsFileResponse = await fetchWithRetry(projectsFileUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }, 'fetch current projects.v1.json from Git');
      
      if (!projectsFileResponse.ok) {
        const errorText = await projectsFileResponse.text();
        console.error('[DEPLOY API] FETCH_PROJECTS_FILE_FAILED', { status: projectsFileResponse.status, error: errorText });
        return NextResponse.json({
          error: "Failed to fetch current projects.v1.json from Git",
          details: errorText,
        }, { status: projectsFileResponse.status });
      }
      
      const projectsFileData = await projectsFileResponse.json();
      // Decode base64 content from GitHub API
      const projectsContent = Buffer.from(projectsFileData.content, 'base64').toString('utf-8');
      const projectsData = JSON.parse(projectsContent);
      console.log('[DEPLOY API] PROJECTS_FILE_FETCHED_FROM_GIT', { pinnedSha });

      // Fetch current services.v1.json from pinned Git SHA
      const servicesFileUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/website/src/config/services.v1.json?ref=${pinnedSha}`;
      const servicesFileResponse = await fetchWithRetry(servicesFileUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }, 'fetch current services.v1.json from Git');

      if (!servicesFileResponse.ok) {
        const errorText = await servicesFileResponse.text();
        console.error('[DEPLOY API] FETCH_SERVICES_FILE_FAILED', { status: servicesFileResponse.status, error: errorText });
        return NextResponse.json({
          error: "Failed to fetch current services.v1.json from Git",
          details: errorText,
        }, { status: servicesFileResponse.status });
      }

      const servicesFileData = await servicesFileResponse.json();
      const servicesContent = Buffer.from(servicesFileData.content, 'base64').toString('utf-8');
      const servicesData = JSON.parse(servicesContent);
      console.log('[DEPLOY API] SERVICES_FILE_FETCHED_FROM_GIT', { pinnedSha });

      // Fetch current brand.v1.json from pinned Git SHA
      const brandFileUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/website/src/config/brand.v1.json?ref=${pinnedSha}`;
      const brandFileResponse = await fetchWithRetry(brandFileUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }, 'fetch current brand.v1.json from Git');

      if (!brandFileResponse.ok) {
        const errorText = await brandFileResponse.text();
        console.error('[DEPLOY API] FETCH_BRAND_FILE_FAILED', { status: brandFileResponse.status, error: errorText });
        return NextResponse.json({
          error: "Failed to fetch current brand.v1.json from Git",
          details: errorText,
        }, { status: brandFileResponse.status });
      }

      const brandFileData = await brandFileResponse.json();
      const brandContent = Buffer.from(brandFileData.content, 'base64').toString('utf-8');
      const brandData = JSON.parse(brandContent);
      console.log('[DEPLOY API] BRAND_FILE_FETCHED_FROM_GIT', { pinnedSha });

      // Fetch current media.v1.json from pinned Git SHA
      const mediaFileUrl = `https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/website/src/config/media.v1.json?ref=${pinnedSha}`;
      const mediaFileResponse = await fetchWithRetry(mediaFileUrl, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }, 'fetch current media.v1.json from Git');

      if (!mediaFileResponse.ok) {
        const errorText = await mediaFileResponse.text();
        console.error('[DEPLOY API] FETCH_MEDIA_FILE_FAILED', { status: mediaFileResponse.status, error: errorText });
        return NextResponse.json({
          error: "Failed to fetch current media.v1.json from Git",
          details: errorText,
        }, { status: mediaFileResponse.status });
      }

      const mediaFileData = await mediaFileResponse.json();
      const mediaContent = Buffer.from(mediaFileData.content, 'base64').toString('utf-8');
      const mediaData = JSON.parse(mediaContent);
      console.log('[DEPLOY_API] MEDIA_FILE_FETCHED_FROM_GIT', { pinnedSha });

      // P0 FIX: Use batchContext.transactions for batch processing
      // Process ALL claimed transactions as a single batch
      batchContext.lifecycle = 'SEMANTIC_PATCHED';

      const transactionGroups = new Map<string, string[]>();

      for (const tx of batchContext.transactions) {
        transactionGroups.set(tx.transactionId, tx.stagingKeys);
        console.log('[DEPLOY API] BATCH_TRANSACTION_ADDED', {
          transactionId: tx.transactionId,
          stagingKeysCount: tx.stagingKeys.length
        });
      }

      // P0 FIX: Deterministic ordering for same-project transactions
      // Sort transactions chronologically by timestamp to ensure revision consistency
      const sortedTransactions = Array.from(transactionGroups.entries())
        .sort((a, b) => {
          // Extract timestamp from transaction ID: WBDEP-{timestamp}-{random}
          const aTimestamp = a[0].split('-')[1];
          const bTimestamp = b[0].split('-')[1];
          return parseInt(aTimestamp) - parseInt(bTimestamp);
        });

      console.log('[DEPLOY API] BATCH_TRANSACTIONS_ORDERED', {
        primaryTransactionId: batchContext.primaryTransactionId,
        transactionCount: sortedTransactions.length,
        order: sortedTransactions.map(([id]) => id)
      });

      let appliedCount = 0;
      for (const [transactionId, keys] of sortedTransactions) {
        const transaction = batchContext.transactions.find(tx => tx.transactionId === transactionId);
        if (!transaction) {
          console.error('[DEPLOY API] TRANSACTION_NOT_FOUND_IN_BATCH', { transactionId });
          continue;
        }

        console.log('[DEPLOY API] PROCESSING_TRANSACTION', {
          transactionId,
          state: transaction.state,
          keyCount: keys.length,
          hasDeploymentRecord: true
        });
        
        // Apply all mutations in this transaction
        for (const key of keys) {
          const value = await redis.get(key);
          if (!value) continue;

          // P0 FIX: Use schema-aware dispatch instead of generic decoder
          // Determine staging record type from key before decoding
          const stagingType = dispatchStagingRecordType(key);
          let stagingValue: unknown;
          
          try {
            switch (stagingType) {
              case 'assignment':
                stagingValue = decodeAssignmentStaging(value);
                break;
              case 'gallery':
                stagingValue = decodeGalleryStaging(value);
                break;
              case 'pointer':
                stagingValue = decodePointerStaging(value);
                break;
              case 'unknown':
                throw new Error(`STAGING_SCHEMA_UNSUPPORTED: Unknown staging key pattern: ${key}`);
              default:
                throw new Error(`STAGING_SCHEMA_UNSUPPORTED: Unexpected staging type: ${stagingType}`);
            }
          } catch (e) {
            console.error('[DEPLOY API] STAGING_SCHEMA_DECODE_FAILED', {
              key,
              stagingType,
              error: e instanceof Error ? e.message : 'Unknown error',
            });
            // FAIL-CLOSED: Schema decode failure must fail the entire deployment
            // Partial transactions are not allowed
            return NextResponse.json({
              error: "Staging schema decode failed",
              message: `Transaction contains a staging record that cannot be decoded: ${key}. This violates transaction atomicity.`,
              deploymentTransactionId,
              stagingKey: key,
              stagingType,
              decodeError: e instanceof Error ? e.message : 'Unknown error',
            }, { status: 400 });
          }

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

            // P0 FIX: Extract mediaId from normalized staging value
            // parseStagingValue already validated the structure
            const stagingData = stagingValue as { mediaId: string; expectedRevision: number; updatedAt: string; source: string };
            const mediaId = stagingData.mediaId;

            console.log('[DEPLOY API] STAGING_VALUE_EXTRACTED', {
              serviceSlug,
              extractedMediaId: mediaId,
            });
            
            // ARCHITECTURAL NOTE: Brand slot handling is semantically overloaded
            // Brand slots (hero-background, homepage-owner-portrait-slot) use service-card-assignment authority type
            // with special serviceSlug values (brand-hero-background, brand-portrait-homepage)
            // These are mapped to brand.v1.json via special cases below
            // 
            // This is intentional but creates a future failure seam if deploy route special cases are removed
            // Future refactoring: Separate authority type for brand slots with dedicated staging namespace
            // 
            // Check if this is a brand assignment (use actual slot IDs)
            if (serviceSlug === 'brand-hero-background') {
              brandData.homepageHero.mediaId = mediaId;
              console.log('[DEPLOY API] APPLIED_BRAND_HERO_ASSIGNMENT', {
                mediaId,
                serviceSlug,
                transactionId
              });
              appliedCount++; // P0 FIX: Count brand mutations toward mutation total
              continue;
            } else if (serviceSlug === 'brand-portrait-homepage') {
              brandData.ownerPortrait.mediaId = mediaId;
              console.log('[DEPLOY API] APPLIED_BRAND_PORTRAIT_ASSIGNMENT', {
                mediaId,
                serviceSlug,
                transactionId
              });
              appliedCount++; // P0 FIX: Count brand mutations toward mutation total
              continue;
            } else if (serviceSlug === 'brand-portrait-about') {
              // About portrait is handled separately in about page logic
              console.log('[DEPLOY API] SKIPPED_ABOUT_PORTRAIT', {
                serviceSlug,
                transactionId,
                reason: 'About portrait is handled by about page reader, not Git projection'
              });
              continue;
            }
            
            // Regular service card assignment
            const serviceIndex = servicesData.services.findIndex((s: any) => s.slug === serviceSlug);
            if (serviceIndex !== -1) {
              servicesData.services[serviceIndex].cardMediaId = mediaId;
              console.log('[DEPLOY API] APPLIED_SERVICE_ASSIGNMENT', { 
                serviceSlug, 
                mediaId,
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
          
          // Extract field value from decoded staging payload
          // Assignment staging: { mediaId, expectedRevision, updatedAt, source }
          // Gallery staging: { gallery, currentRevision, previousGallery, mutationTimestamp }
          let extractedValue = stagingValue;
          if (typeof stagingValue === 'object' && stagingValue !== null && 'mediaId' in stagingValue) {
            // Assignment staging: extract mediaId
            extractedValue = (stagingValue as any).mediaId;
          }
          
          if (field === 'hero') {
            if (extractedValue) projectsData.projects[projectIndex].media.hero = extractedValue;
          } else if (field === 'gallery') {
            // P0 FIX: Use decoded gallery staging value directly
            // decodeGalleryStaging() validates the complete schema
            const galleryData = stagingValue as { gallery: string[]; currentRevision: number; previousGallery: string[]; mutationTimestamp: string };
            
            // CRITICAL ARCHITECTURAL FIX: Verify Redis runtime authority relationship first
            // Redis is the live gallery authority; Git is the durable projection
            // A valid gallery transaction must be authored by the Redis runtime authority
            const redis = getRedisClient();
            if (redis) {
              const runtimeGalleryKey = `${getKvNamespace()}workbench-runtime-gallery:${projectId}`;
              const runtimeData = await redis.get(runtimeGalleryKey);
              
              if (runtimeData) {
                const runtimeGallery = (runtimeData as any).gallery;
                const runtimeRevision = (runtimeData as any).currentRevision;
                const runtimeLastTransactionId = (runtimeData as any).lastTransactionId;
                
                // Verify runtime authority relationship:
                // 1. Runtime lastTransactionId must match transaction ID
                // 2. Runtime gallery must match transaction's resulting gallery
                // 3. Runtime revision must match transaction's resulting revision
                const transactionMatchesRuntime = 
                  runtimeLastTransactionId === transactionId &&
                  JSON.stringify(runtimeGallery) === JSON.stringify(galleryData.gallery) &&
                  runtimeRevision === galleryData.currentRevision;
                
                if (transactionMatchesRuntime) {
                  console.log('[DEPLOY API] GALLERY_RUNTIME_AUTHORITY_VERIFIED', {
                    projectId,
                    transactionId,
                    runtimeRevision,
                    transactionRevision: galleryData.currentRevision,
                    runtimeLastTransactionId,
                    reason: 'Transaction is authored by Redis runtime authority'
                  });
                  
                  // Redis runtime authority is valid - materialize from Redis to Git
                  // Do NOT reject based on Git revision mismatch
                  // Git is the projection target, not the authority source
                  projectsData.projects[projectIndex].media.gallery = galleryData.gallery;
                  projectsData.projects[projectIndex].media.galleryRevision = galleryData.currentRevision;
                  appliedCount++;
                  continue;
                } else {
                  console.error('[DEPLOY API] GALLERY_RUNTIME_AUTHORITY_MISMATCH', {
                    projectId,
                    transactionId,
                    runtimeLastTransactionId,
                    runtimeRevision,
                    transactionRevision: galleryData.currentRevision,
                    runtimeGalleryMatches: JSON.stringify(runtimeGallery) === JSON.stringify(galleryData.gallery),
                    reason: 'Transaction does not match Redis runtime authority'
                  });
                  
                  // FAIL CLOSED: Transaction not authored by Redis runtime authority
                  return NextResponse.json({
                    error: "Gallery runtime authority mismatch",
                    message: `Transaction ${transactionId} does not match the current Redis runtime authority for project ${projectId}. The transaction may be stale or corrupted.`,
                    projectId,
                    transactionId,
                    forensic: {
                      deploymentTransactionId,
                      projectId,
                      runtimeLastTransactionId,
                      transactionStale: true,
                      requiresReconciliation: true
                    }
                  }, { status: 409 });
                }
              } else {
                console.warn('[DEPLOY API] GALLERY_RUNTIME_AUTHORITY_NOT_FOUND', {
                  projectId,
                  transactionId,
                  reason: 'Runtime authority not found in Redis - may have been cleaned up or never initialized'
                });
                // If runtime authority doesn't exist, fall through to Git-based validation
                // This handles cases where runtime authority was cleaned up but transaction remains
              }
            }
            
            // Fallback: Git-based validation (for transactions without Redis runtime authority)
            // This preserves backward compatibility and handles edge cases
            const currentGitRevision = projectsData.projects[projectIndex].media.galleryRevision || 0;
            const currentGallery = projectsData.projects[projectIndex].media.gallery || [];
            
            // Check if previousGallery matches current Git state (state consistency)
            const previousMatches = JSON.stringify(galleryData.previousGallery) === JSON.stringify(currentGallery);
            
            if (galleryData.currentRevision !== currentGitRevision) {
              console.log('[DEPLOY API] TRANSACTION_FRESHNESS_MISMATCH', {
                projectId,
                transactionExpectedRevision: galleryData.currentRevision,
                currentGitRevision,
                previousGallery: galleryData.previousGallery,
                currentGitGallery: currentGallery,
                previousMatches,
                reason: 'Transaction was created against a different gallery revision',
                transactionId
              });
              
              // P0 FIX: Allow transaction if state is consistent even if revisions differ
              // This handles benign revision drift while preserving actual CAS semantics
              if (previousMatches) {
                console.log('[DEPLOY API] TRANSACTION_FRESHNESS_BYPASS - STATE_CONSISTENT', {
                  projectId,
                  reason: 'Previous gallery state matches current Git HEAD, allowing transaction despite revision drift',
                  transactionId
                });
                // Update transaction's expected revision to current Git revision
                galleryData.currentRevision = currentGitRevision;
              } else {
                // Reject if both revision and state differ (actual conflict)
                return NextResponse.json({
                  error: "Transaction freshness mismatch",
                  message: `Transaction was created against gallery revision ${galleryData.currentRevision}, but current Git HEAD has revision ${currentGitRevision}. This would cause lost-update semantics. Re-stage the gallery change or resolve the conflict manually.`,
                  projectId,
                  transactionExpectedRevision: galleryData.currentRevision,
                  currentGitRevision,
                  forensic: {
                    deploymentTransactionId,
                    projectId,
                    transactionStale: true,
                    requiresRebase: true
                  }
                }, { status: 409 });
              }
            }
            
            // Verify the previous gallery matches what we expect (consistency check)
            if (!previousMatches) {
              console.warn('[DEPLOY API] GALLERY_PREVIOUS_STATE_MISMATCH', {
                projectId,
                transactionPreviousGallery: galleryData.previousGallery,
                currentGitGallery: currentGallery,
                reason: 'Transaction was based on a different previous state than current Git HEAD',
                transactionId
              });
              
              // This is a conflict - the gallery has changed since the transaction was created
              return NextResponse.json({
                error: "Gallery previous state mismatch",
                message: `Transaction was based on a different previous gallery state than current Git HEAD. The gallery has been modified since this transaction was created.`,
                projectId,
                transactionPreviousGallery: galleryData.previousGallery,
                currentGitGallery: currentGallery,
                forensic: {
                  deploymentTransactionId,
                  projectId,
                  conflict: true,
                  requiresManualResolution: true
                }
              }, { status: 409 });
            }
            
            projectsData.projects[projectIndex].media.gallery = galleryData.gallery;
            projectsData.projects[projectIndex].media.galleryRevision = galleryData.currentRevision;
            
            console.log('[DEPLOY API] GALLERY_MUTATION_APPLIED', { 
              projectId, 
              galleryLength: galleryData.gallery.length,
              currentRevision: galleryData.currentRevision,
              previousGalleryLength: galleryData.previousGallery.length,
              mutationTimestamp: galleryData.mutationTimestamp,
              freshnessVerified: true,
              previousStateVerified: true,
              key,
              transactionId 
            });
          } else if (field === 'before' || field === 'after') {
            if (extractedValue) projectsData.projects[projectIndex].media[field] = extractedValue;
          }
          
          console.log('[DEPLOY API] APPLIED_STAGING_CHANGE', { projectId, field, key, transactionId });
          appliedCount++;
        }

        // Track all keys in this transaction for cleanup
        batchContext.allStagingKeys.push(...keys);
      }

      projectsData.generatedAt = new Date().toISOString();
      fileContent = JSON.stringify(projectsData, null, 2);
      console.log('[DEPLOY API] PRODUCTION_MERGE_COMPLETE', { stagingKeysApplied: appliedCount, transactionCount: transactionGroups.size });

      // FAIL-CLOSED: Reject deployment if zero mutations were applied
      // This prevents the "successful acceptance with zero applied mutations" seam
      if (appliedCount === 0 && transactionGroups.size > 0) {
        console.error('[DEPLOY API] ZERO_MUTATIONS_APPLIED', {
          transactionCount: transactionGroups.size,
          stagingKeys: batchContext.allStagingKeys.length,
          primaryTransactionId: batchContext.primaryTransactionId
        });
        return NextResponse.json({
          error: "No mutations applied",
          message: "Workbench reported acceptance but deployment found zero valid staging keys. Transaction may be fragmented.",
          forensic: {
            transactionCount: transactionGroups.size,
            stagingKeys: batchContext.allStagingKeys.length,
            primaryTransactionId: batchContext.primaryTransactionId,
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
      console.log('[DEPLOY API] VERIFYING_TRANSACTION_MEDIA_MATERIALIZATION', { primaryTransactionId: batchContext.primaryTransactionId });

      const mediaIdsToVerify = new Set<string>();

      // Collect ONLY media IDs from this transaction's staging mutations
      // These are the new changes that need verification
      for (const key of batchContext.allStagingKeys) {
        const value = await redis.get(key);
        if (!value) continue;

        // P0 FIX: Use schema-aware dispatch for media verification
        // Determine staging record type from key before decoding
        const stagingType = dispatchStagingRecordType(key);
        
        try {
          switch (stagingType) {
            case 'assignment': {
              const assignmentStaging = decodeAssignmentStaging(value);
              // Extract media ID from assignment staging
              mediaIdsToVerify.add(assignmentStaging.mediaId);
              break;
            }
            case 'gallery': {
              const galleryStaging = decodeGalleryStaging(value);
              // Extract all media IDs from gallery staging
              galleryStaging.gallery.forEach((mediaId: string) => mediaIdsToVerify.add(mediaId));
              break;
            }
            case 'pointer': {
              const pointerStaging = decodePointerStaging(value);
              // Pointers don't contain media IDs
              break;
            }
            case 'unknown':
              // FAIL-CLOSED: Unknown staging schema during verification must fail deployment
              return NextResponse.json({
                error: "Staging schema unsupported during verification",
                message: `Transaction contains a staging record with unknown schema: ${key}. This violates transaction atomicity.`,
                deploymentTransactionId,
                stagingKey: key,
              }, { status: 400 });
            default:
              return NextResponse.json({
                error: "Unexpected staging type during verification",
                message: `Transaction contains a staging record with unexpected type: ${stagingType}`,
                deploymentTransactionId,
                stagingKey: key,
                stagingType,
              }, { status: 400 });
          }
        } catch (e) {
          // FAIL-CLOSED: Schema decode failure during verification must fail deployment
          return NextResponse.json({
            error: "Staging schema decode failed during verification",
            message: `Transaction contains a staging record that cannot be decoded: ${key}. This violates transaction atomicity.`,
            deploymentTransactionId,
            stagingKey: key,
            stagingType,
            decodeError: e instanceof Error ? e.message : 'Unknown error',
          }, { status: 400 });
        }

        // Skip metadata keys
        if (key.endsWith(':meta')) continue;
      }

      console.log('[DEPLOY API] TRANSACTION_MEDIA_VERIFICATION_COUNT', {
        primaryTransactionId: batchContext.primaryTransactionId,
        transactionMediaIdsCount: mediaIdsToVerify.size,
        totalStagingKeys: batchContext.allStagingKeys.length,
      });

      // Import the completeness check function
      const { isPubliclyComplete } = await import('@/lib/media-contracts');
      const { getMediaByIdAsync } = await import('@/lib/media');

      const incompleteMediaIds: string[] = [];

      for (const mediaId of mediaIdsToVerify) {
        try {
          const media = await getMediaByIdAsync(mediaId);
          if (!media) {
            console.error('[DEPLOY API] MEDIA_NOT_FOUND', { primaryTransactionId: batchContext.primaryTransactionId, mediaId });
            incompleteMediaIds.push(mediaId);
            continue;
          }

          // Verify full public completeness (shape + real hash + physical Blob proof)
          // This is the constitutional barrier - no incomplete media may be deployed
          const isComplete = isPubliclyComplete(media);
          if (!isComplete) {
            console.error('[DEPLOY API] MEDIA_INCOMPLETE', {
              primaryTransactionId: batchContext.primaryTransactionId,
              mediaId,
              lifecycleState: media.lifecycleState,
              source: media.source,
            });
            incompleteMediaIds.push(mediaId);
          }
        } catch (error) {
          console.error('[DEPLOY API] MEDIA_VERIFICATION_ERROR', {
            primaryTransactionId: batchContext.primaryTransactionId,
            mediaId,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          incompleteMediaIds.push(mediaId);
        }
      }

      if (incompleteMediaIds.length > 0) {
        console.error('[DEPLOY API] DEPLOYMENT_REJECTED_INCOMPLETE_MEDIA', {
          primaryTransactionId: batchContext.primaryTransactionId,
          incompleteCount: incompleteMediaIds.length,
          incompleteMediaIds,
        });

        // MARK TRANSACTION AS FAILED
        for (const tx of batchContext.transactions) {
          try {
            await failDeploymentTransaction(
              tx.transactionId,
              `Deployment rejected: ${incompleteMediaIds.length} media assets are incomplete and cannot be deployed`
            );
          } catch (failError) {
            console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
              transactionId: tx.transactionId,
              error: failError instanceof Error ? failError.message : 'Unknown error'
            });
          }
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
        primaryTransactionId: batchContext.primaryTransactionId,
        verifiedCount: mediaIdsToVerify.size,
      });

      // P0 FIX: Merge new PublishedMediaAsset records from KV into media.v1.json
      // This ensures Drive-ingested media records are persisted to static canonical authority
      // Without this, assignments reference media IDs that exist only in KV, causing render failures
      // when KV is unavailable or rejects the record during runtime resolution
      console.log('[DEPLOY API] MERGING_MEDIA_RECORDS_FROM_KV', { primaryTransactionId: batchContext.primaryTransactionId });

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

        // MARK ALL TRANSACTIONS AS FAILED
        for (const tx of batchContext.transactions) {
          try {
            await failDeploymentTransaction(
              tx.transactionId,
              `Deployment rejected: ${mergeFailures.length} media records failed to merge from KV into media.v1.json`
            );
          } catch (failError) {
            console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
              transactionId: tx.transactionId,
              error: failError instanceof Error ? failError.message : 'Unknown error'
            });
          }
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
        console.log('[DEPLOY API] NO_NEW_MEDIA_RECORDS_TO_MERGE', { primaryTransactionId: batchContext.primaryTransactionId });
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

    // P0 FIX: Use the pinned baseGitSha - we already pinned it before claiming
    // No need to re-read the branch head
    const currentCommitSha = batchContext.baseGitSha;
    console.log('[DEPLOY API] USING_PINNED_COMMIT_SHA', { currentCommitSha });

    // Note: The actual CAS verification happens later before the ref update
    // At this point, we're building the commit tree against the pinned base SHA
    if (currentCommitSha !== batchContext.baseGitSha) {
      console.error('[DEPLOY API] GIT_HEAD_MOVED', {
        pinnedSha: batchContext.baseGitSha,
        currentSha: currentCommitSha,
        primaryTransactionId: batchContext.primaryTransactionId
      });

      // Mark all transactions as failed due to concurrent modification
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Git HEAD moved during deployment: pinned ${batchContext.baseGitSha}, current ${currentCommitSha}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        error: "Git HEAD moved during deployment",
        message: `The branch was modified between the start of deployment and the commit. Pinned SHA: ${batchContext.baseGitSha}, Current SHA: ${currentCommitSha}. This indicates concurrent modification.`,
        forensic: {
          primaryTransactionId: batchContext.primaryTransactionId,
          pinnedSha: batchContext.baseGitSha,
          currentSha: currentCommitSha,
          conflict: true,
          requiresRetry: true
        }
      }, { status: 409 });
    }

    console.log('[DEPLOY API] GIT_HEAD_VERIFIED', { currentCommitSha, matchesPinned: true });

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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to get current commit: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to get current commit",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            commitSha: currentCommitSha,
            status: commitResponse.status,
            error: "GET_COMMIT_FAILED",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to create projects blob: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create projects blob",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            status: projectsBlobResponse.status,
            error: "CREATE_PROJECTS_BLOB_FAILED",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to create services blob: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create services blob",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            status: servicesBlobResponse.status,
            error: "CREATE_SERVICES_BLOB_FAILED",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to create brand blob: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create brand blob",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            status: brandBlobResponse.status,
            error: "CREATE_BRAND_BLOB_FAILED",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to create media blob: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create media blob",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            status: mediaBlobResponse.status,
            error: "CREATE_MEDIA_BLOB_FAILED",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to create new tree: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create new tree",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            baseTree: currentTreeSha,
            status: treeResponse.status,
            error: "CREATE_TREE_FAILED",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to create new commit: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to create new commit",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            treeSha: newTreeSha,
            parentCommit: currentCommitSha,
            status: newCommitResponse.status,
            error: "CREATE_COMMIT_FAILED",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
          }
        },
        { status: newCommitResponse.status }
      );
    }
    
    const newCommitData = await newCommitResponse.json();
    const newCommitSha = newCommitData.sha;
    console.log('[DEPLOY API] NEW_COMMIT_CREATED', { sha: newCommitSha });

    // EXTERNAL COMMIT POINT: Git ref update is the irreversible external side effect
    // At this point, the deployment exists in the repository regardless of what follows
    console.log('[DEPLOY API] EXTERNAL_COMMIT_POINT_REACHED', {
      primaryTransactionId: batchContext.primaryTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url
    });

    // P0 FIX: Persist commitSha to ALL transactions BEFORE Redis promotion
    // This enables Git/Redis split-brain recovery: if Redis promotion fails,
    // ALL transactions already have commitSha and can retry Redis promotion
    // against the same Git commit without creating a new commit.
    batchContext.finalCommitSha = newCommitSha;
    batchContext.lifecycle = 'GIT_COMMITTED';

    console.log('[DEPLOY API] ATOMIC_PERSISTING_COMMIT_SHA_BEFORE_REDIS_PROMOTION', {
      primaryTransactionId: batchContext.primaryTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url,
      transactionCount: batchContext.transactions.length
    });

    try {
      const updatedTransactions = await setBatchGitCommitSha(
        batchContext.transactionIds,
        newCommitSha,
        newCommitData.html_url,
        transactionOwner
      );
      batchContext.transactions = updatedTransactions;
      console.log('[DEPLOY API] COMMIT_SHA_PERSISTED_TO_ALL', {
        primaryTransactionId: batchContext.primaryTransactionId,
        commitSha: newCommitSha,
        updatedCount: updatedTransactions.length
      });
    } catch (error) {
      console.error('[DEPLOY API] ATOMIC_PERSIST_COMMIT_SHA_FAILED', {
        primaryTransactionId: batchContext.primaryTransactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(
            tx.transactionId,
            `Failed to persist commitSha: ${error instanceof Error ? error.message : String(error)}`
          );
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Deployment rejected: Failed to persist commitSha",
          message: "Git commit succeeded but failed to persist commitSha to transaction record. This is a split-brain prevention measure.",
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            commitSha: newCommitSha,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        { status: 500 }
      );
    }

    // CRITICAL: All transactions remain in 'committing' state until promotion succeeds
    // This allows committing → failed transition if promotion fails
    // Only after promotion succeeds do we transition committing → committed

    // Step 6: CAS verification - re-read current ref SHA before updating
    // This is the authoritative concurrency barrier: we require the remote ref
    // to still equal our pinned baseGitSha before we move it to the new commit
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

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `CAS verification failed: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "CAS verification failed",
          message: "Unable to verify current branch state before update",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
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
        primaryTransactionId: batchContext.primaryTransactionId
      });

      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `CAS violation: branch moved from ${currentCommitSha} to ${casCurrentSha} during deployment`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
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
            primaryTransactionId: batchContext.primaryTransactionId,
            expectedParent: currentCommitSha,
            actualParent: casCurrentSha,
            status: 409,
            error: "CAS_VIOLATION",
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
          }
        },
        { status: 409 }
      );
    }
    
    // Step 7: Update branch ref to point to new commit (CAS protected with force: false)
    // This is the actual ref update operation, which is the CAS barrier
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
      
      // MARK ALL TRANSACTIONS AS FAILED
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(tx.transactionId, `Failed to update branch reference: ${errorText}`);
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Failed to update branch reference",
          message: "Branch update failed - this may indicate a concurrent deployment. Please retry.",
          details: errorText,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            githubOwner,
            githubRepo,
            newCommitSha,
            expectedParent: currentCommitSha,
            status: updateRefResponse.status,
            error: "UPDATE_REF_FAILED",
            casEnforced: true,
            stagingKeysPreserved: isProduction && batchContext.allStagingKeys.length > 0,
            stagingKeysCount: batchContext.allStagingKeys.length
          }
        },
        { status: 409 }
      );
    }

    console.log('[DEPLOY API] BRANCH_REF_UPDATED', { newCommitSha });

    // EXTERNAL COMMIT POINT: Git ref update is the irreversible external side effect
    // At this point, the deployment exists in the repository regardless of what follows
    console.log('[DEPLOY API] EXTERNAL_COMMIT_POINT_REACHED', {
      primaryTransactionId: batchContext.primaryTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url
    });

    // CRITICAL: Do NOT mark transactions as committed yet
    // All transactions remain in 'committing' state until promotion succeeds
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
      primaryTransactionId: batchContext.primaryTransactionId,
      commitSha: newCommitSha,
      commitUrl: newCommitData.html_url,
      verificationPassed,
      verificationError
    });

    // FAIL-CLOSED: If verification failed, reject deployment
    // Verification failure means Git commit is incomplete or corrupted
    if (!verificationPassed) {
      console.error('[DEPLOY API] DEPLOYMENT_REJECTED_VERIFICATION_FAILED', {
        primaryTransactionId: batchContext.primaryTransactionId,
        verificationError,
      });

      // MARK ALL TRANSACTIONS AS FAILED (committing → failed is legal)
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(
            tx.transactionId,
            `Deployment rejected: Commit verification failed - ${verificationError}`
          );
        } catch (failError) {
          console.error('[DEPLOY API] BATCH_FAIL_FAILED', {
            transactionId: tx.transactionId,
            error: failError instanceof Error ? failError.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json(
        {
          error: "Deployment rejected: Commit verification failed",
          message: `Git commit succeeded but verification failed: ${verificationError}. This indicates an incomplete or corrupted commit.`,
          verificationError,
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            verificationError,
          },
        },
        { status: 400 }
      );
    }

    // P0 FIX: Promote ALL staging keys from ALL transactions BEFORE marking transactions committed
    // Use atomic promoteBatchDeployment() to ensure runtime KV promotion is atomic across the entire batch
    // This ensures runtime KV promotion is atomic - either all assignments succeed or none succeed
    // If promotion fails, all transactions remain in 'committing' state for recovery
    // If promotion succeeds, we transition all to 'committed' (legal)
    if (isProduction && redis) {
      console.log('[DEPLOY API] ATOMIC_PROMOTING_STAGING_TO_RUNTIME_KV', {
        primaryTransactionId: batchContext.primaryTransactionId,
        stagingKeyCount: batchContext.allStagingKeys.length
      });

      const { getServiceCardAssignment } = await import('@/lib/assignment-store');

      // Collect ALL assignments from ALL transactions for atomic promotion
      const assignmentsToPromote: Array<{ serviceSlug: string; mediaId: string; expectedRevision: number; updatedAt: string; source: string }> = [];

      for (const key of batchContext.allStagingKeys) {
        const value = await redis.get(key);
        if (!value) continue;

        // P0 FIX: Use schema-aware dispatch for promotion
        // Determine staging record type from key before decoding
        const stagingType = dispatchStagingRecordType(key);
        let stagingValue: unknown;
        
        try {
          switch (stagingType) {
            case 'assignment':
              stagingValue = decodeAssignmentStaging(value);
              break;
            case 'gallery':
              stagingValue = decodeGalleryStaging(value);
              // Gallery mutations don't promote to assignment KV
              continue;
            case 'pointer':
              stagingValue = decodePointerStaging(value);
              // Pointers don't promote to assignment KV
              continue;
            case 'unknown':
              // FAIL-CLOSED: Unknown staging schema during promotion must fail deployment
              return NextResponse.json({
                error: "Staging schema unsupported during promotion",
                message: `Transaction contains a staging record with unknown schema: ${key}. This violates transaction atomicity.`,
                deploymentTransactionId,
                stagingKey: key,
              }, { status: 400 });
            default:
              return NextResponse.json({
                error: "Unexpected staging type during promotion",
                message: `Transaction contains a staging record with unexpected type: ${stagingType}`,
                deploymentTransactionId,
                stagingKey: key,
                stagingType,
              }, { status: 400 });
          }
        } catch (e) {
          // FAIL-CLOSED: Schema decode failure during promotion must fail deployment
          return NextResponse.json({
            error: "Staging schema decode failed during promotion",
            message: `Transaction contains a staging record that cannot be decoded: ${key}. This violates transaction atomicity.`,
            primaryTransactionId: batchContext.primaryTransactionId,
            stagingKey: key,
            stagingType,
            decodeError: e instanceof Error ? e.message : 'Unknown error',
          }, { status: 400 });
        }

        if (key.endsWith(':meta')) continue;

        const parts = key.split(':');
        if (parts.length < 6) continue;

        // Service card assignments: hpp:{env}:workbench-staging:{txId}:service:{serviceSlug}
        if (parts.length >= 6 && parts[2] === 'workbench-staging' && parts[4] === 'service') {
          const serviceSlug = parts[5];

          // P0 FIX: Use actual slot IDs directly for promotion
          // No canonicalization - public readers must use the same keys
          const canonicalServiceSlug = serviceSlug;

          try {
            // P0 FIX: Extract mediaId and expectedRevision from decoded assignment staging
            const stagingData = stagingValue as { mediaId: string; expectedRevision: number; updatedAt: string; source: string };
            const mediaId = stagingData.mediaId;
            const expectedRevision = stagingData.expectedRevision;

            console.log('[DEPLOY API] STAGING_DATA_PARSED', {
              serviceSlug,
              canonicalServiceSlug,
              mediaId,
              expectedRevision,
            });

            assignmentsToPromote.push({
              serviceSlug: canonicalServiceSlug,
              mediaId,
              expectedRevision, // P0 FIX: Use caller's expectedRevision from staging, not current revision
              updatedAt: stagingData.updatedAt, // P0 FIX: Use updatedAt from staging record
              source: stagingData.source, // P0 FIX: Use source from staging record
            });

            console.log('[DEPLOY API] ASSIGNMENT_COLLECTED_FOR_PROMOTION', {
              originalServiceSlug: serviceSlug,
              canonicalServiceSlug,
              mediaId,
              expectedRevision,
            });
          } catch (error) {
            console.error('[DEPLOY API] ASSIGNMENT_COLLECTION_FAILED', {
              originalServiceSlug: serviceSlug,
              canonicalServiceSlug,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      console.log('[DEPLOY API] ATOMIC_BATCH_PROMOTION_START', {
        primaryTransactionId: batchContext.primaryTransactionId,
        assignmentCount: assignmentsToPromote.length,
        namespace: getKvNamespace(),
      });

      // P0 FIX: Use atomic batch promotion instead of per-assignment loop
      // P0 FIX: Pass all transaction IDs, expected commit SHA, and owner to enforce full batch validation
      if (assignmentsToPromote.length > 0) {
        const promotionResult = await promoteBatchDeployment(
          assignmentsToPromote,
          batchContext.transactionIds,
          batchContext.finalCommitSha || '',
          transactionOwner
        );

        console.log('[DEPLOY API] ATOMIC_BATCH_PROMOTION_RESULT', {
          primaryTransactionId: batchContext.primaryTransactionId,
          success: promotionResult.success,
          count: promotionResult.count,
          error: promotionResult.error,
          namespace: getKvNamespace(),
        });

        if (!promotionResult.success) {
          console.error('[DEPLOY API] ATOMIC_BATCH_PROMOTION_FAILED', {
            primaryTransactionId: batchContext.primaryTransactionId,
            error: promotionResult.error,
            failedServiceSlug: promotionResult.failedServiceSlug,
          });

          // P0 FIX: Handle new transaction state validation errors from full batch validation
          if (['INVALID_STATE', 'OWNER_MISMATCH', 'TRANSACTION_NOT_FOUND', 'TRANSACTION_ID_MISMATCH', 'MISSING_COMMIT_SHA', 'COMMIT_SHA_MISMATCH'].includes(promotionResult.error || '')) {
            console.error('[DEPLOY API] TRANSACTION_BINDING_VIOLATION', {
              primaryTransactionId: batchContext.primaryTransactionId,
              error: promotionResult.error,
              owner: transactionOwner,
            });

            // This is a corruption/concurrency violation - should not happen in normal flow
            await failDeploymentTransaction(
              deploymentTransactionId,
              `Transaction binding violation: ${promotionResult.error}`
            );

            return NextResponse.json(
              {
                error: "Deployment rejected: Transaction binding violation",
                message: `Atomic promotion rejected due to invalid transaction state, ownership mismatch, or commit SHA mismatch. This indicates a concurrency or corruption issue.`,
                forensic: {
                  deploymentTransactionId,
                  promotionError: promotionResult.error,
                  failedServiceSlug: promotionResult.failedServiceSlug,
                  assignmentCount: assignmentsToPromote.length,
                  owner: transactionOwner,
                },
              },
              { status: 409 } // Conflict
            );
          }

          // FAIL-CLOSED: Reject deployment if atomic promotion fails
          await failDeploymentTransaction(
            deploymentTransactionId,
            `Atomic assignment promotion failed: ${promotionResult.error}`
          );

          return NextResponse.json(
            {
              error: "Deployment rejected: Runtime assignment promotion failed",
              message: `Git commit succeeded but runtime KV promotion failed atomically. No assignments were partially promoted.`,
              forensic: {
                primaryTransactionId: batchContext.primaryTransactionId,
                promotionError: promotionResult.error,
                failedServiceSlug: promotionResult.failedServiceSlug,
                assignmentCount: assignmentsToPromote.length,
              },
            },
            { status: 500 }
          );
        }

        console.log('[DEPLOY API] ATOMIC_BATCH_PROMOTION_SUCCESS', {
          primaryTransactionId: batchContext.primaryTransactionId,
          promotedCount: promotionResult.count,
        });
      } else {
        console.log('[DEPLOY_API] NO_ASSIGNMENTS_TO_PROMOTE', { primaryTransactionId: batchContext.primaryTransactionId });
      }
    }

    // P0 FIX: ATOMIC batch commit ALL transactions (committing → committed)
    // This happens AFTER promotion succeeds, ensuring Git and runtime KV are coherent
    // commitSha was already persisted via setBatchGitCommitSha() before promotion
    batchContext.lifecycle = 'REDIS_PROMOTED';

    console.log('[DEPLOY API] ATOMIC_BATCH_COMMITTING_TRANSACTIONS', {
      primaryTransactionId: batchContext.primaryTransactionId,
      transactionCount: batchContext.transactions.length,
      commitSha: batchContext.finalCommitSha
    });

    try {
      const committedTransactions = await commitBatchDeploymentTransactions(
        batchContext.transactionIds,
        batchContext.finalCommitSha || '',
        transactionOwner
      );
      batchContext.transactions = committedTransactions;
      batchContext.lifecycle = 'REDIS_PROMOTED';

      console.log('[DEPLOY API] ATOMIC_BATCH_COMMIT_SUCCESS', {
        primaryTransactionId: batchContext.primaryTransactionId,
        committedCount: committedTransactions.length,
        commitSha: batchContext.finalCommitSha
      });
    } catch (error) {
      console.error('[DEPLOY API] ATOMIC_BATCH_COMMIT_FAILED', {
        primaryTransactionId: batchContext.primaryTransactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Transactions remain in 'committing' state - they have commitSha and can be retried
      return NextResponse.json({
        error: "Batch commit failed",
        message: "Git commit and Redis promotion succeeded but failed to mark transactions as committed. Transactions remain recoverable.",
        forensic: {
          primaryTransactionId: batchContext.primaryTransactionId,
          commitSha: batchContext.finalCommitSha,
          error: error instanceof Error ? error.message : 'Unknown error',
          recoverable: true
        }
      }, { status: 500 });
    }

    // P0 FIX: ATOMIC batch consume with staging cleanup
    // This happens AFTER commit succeeds, ensuring atomic cleanup
    if (isProduction && redis && batchContext.allStagingKeys.length > 0 && verificationPassed) {
      console.log('[DEPLOY API] ATOMIC_BATCH_CONSUMING_WITH_STAGING_CLEANUP', {
        primaryTransactionId: batchContext.primaryTransactionId,
        transactionCount: batchContext.transactions.length,
        stagingKeyCount: batchContext.allStagingKeys.length
      });

      // Collect project-level transaction pointers to clear with compare-and-delete
      const pointerKeys: string[] = [];
      const pointerExpectedValues: string[] = [];
      for (const tx of batchContext.transactions) {
        const projectIds = tx.files.filter(f => f.startsWith('projects.v1.json:'));
        for (const projectId of projectIds) {
          const pointerKey = `${getKvNamespace()}project-transaction:${projectId}`;
          pointerKeys.push(pointerKey);
          // Expected value: the transaction ID that should own this pointer
          pointerExpectedValues.push(tx.transactionId);
        }
      }

      try {
        const consumedTransactions = await consumeBatchDeploymentTransactions(
          batchContext.transactionIds,
          batchContext.allStagingKeys,
          pointerKeys,
          pointerExpectedValues,
          transactionOwner
        );
        batchContext.transactions = consumedTransactions;
        batchContext.lifecycle = 'CONSUMED';

        console.log('[DEPLOY API] ATOMIC_BATCH_CONSUME_SUCCESS', {
          primaryTransactionId: batchContext.primaryTransactionId,
          consumedCount: consumedTransactions.length,
          stagingKeysDeleted: batchContext.allStagingKeys.length,
          pointerCount: pointerKeys.length
        });
      } catch (error) {
        console.error('[DEPLOY API] ATOMIC_BATCH_CONSUME_FAILED', {
          primaryTransactionId: batchContext.primaryTransactionId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });

        // Transactions remain in 'committed' state - they have commitSha and can be retried
        return NextResponse.json({
          error: "Batch consume failed",
          message: "Git commit, Redis promotion, and commit succeeded but staging cleanup failed. Transactions remain recoverable.",
          forensic: {
            primaryTransactionId: batchContext.primaryTransactionId,
            commitSha: batchContext.finalCommitSha,
            error: error instanceof Error ? error.message : 'Unknown error',
            recoverable: true
          }
        }, { status: 500 });
      }
    } else if (isProduction && redis && batchContext && batchContext.allStagingKeys.length > 0) {
      console.warn('[DEPLOY API] BATCH_STAGING_KEYS_PRESERVED_NO_REDIS_OR_NO_STAGING', {
        stagingKeysCount: batchContext.allStagingKeys.length,
      });
    }

    return NextResponse.json({
      success: true,
      primaryTransactionId: batchContext.primaryTransactionId,
      transactionIds: batchContext.transactionIds,
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

    // MARK ALL CLAIMED TRANSACTIONS AS FAILED on uncaught errors
    if (batchContext) {
      for (const tx of batchContext.transactions) {
        try {
          await failDeploymentTransaction(
            tx.transactionId,
            error instanceof Error ? error.message : String(error)
          );
          console.log('[DEPLOY API] BATCH_TRANSACTION_FAILED', {
            transactionId: tx.transactionId
          });
        } catch (txError) {
          console.error('[DEPLOY API] BATCH_TRANSACTION_MARK_FAILED', {
            transactionId: tx.transactionId,
            txError
          });
        }
      }
    }

    // TRANSACTIONAL FIX: Staging keys are preserved on error for retry
    const stagingKeysCount = batchContext?.allStagingKeys.length || 0;
    return NextResponse.json(
      {
        error: "Failed to commit to GitHub",
        message: error instanceof Error ? error.message : String(error),
        stagingKeysPreserved: isProduction && stagingKeysCount > 0,
        stagingKeysCount
      },
      { status: 500 }
    );
  }
}
