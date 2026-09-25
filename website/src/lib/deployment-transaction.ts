/**
 * Deployment Transaction State Machine
 *
 * Provides authoritative transaction state management for Workbench deployments.
 * Enforces legal state transitions, idempotency, and concurrent deployment safety.
 *
 * TRANSACTION STATES:
 * - prepared: Transaction is ready to be claimed for deployment, staging keys can be added
 * - committing: Transaction is actively being deployed (exactly one owner), no new mutations allowed
 * - committed: Git commit SHA recorded and immutable
 * - consumed: Staging cleanup allowed, transaction is complete
 * - failed: Retry/recovery policy applies
 *
 * LEGAL TRANSITIONS:
 * - prepared → committing (claim transaction)
 * - committing → committed (Git commit succeeded)
 * - committing → failed (Git commit failed, retryable)
 * - committed → consumed (staging cleanup complete)
 * - failed → prepared (retry attempt)
 *
 * STAGING KEY AGGREGATION:
 * - Multiple assignments can share one transaction ID
 * - Each assignment contributes its staging key to the transaction
 * - Staging keys are atomically merged with deduplication
 * - Staging keys can only be added in 'prepared' state
 * - Once in 'committing' or later, no new mutations allowed
 *
 * ILLEGAL TRANSITIONS (rejected):
 * - Any state → committing (must go through prepared first)
 * - committed → committing (cannot replay committed transaction)
 * - consumed → any state (terminal state)
 * - committing → prepared (must fail first)
 * - Adding staging keys to non-prepared transaction
 *
 * IDEMPOTENCY:
 * - Duplicate transaction submission returns existing authoritative state
 * - Duplicate staging key registration is idempotent (no-op)
 * - Exactly one Git commit per transaction ID
 * - Idempotent replay returns original commit SHA
 */

import { Redis } from '@upstash/redis';
import { getEnvironment, getKvNamespace } from '@/lib/environment';

/**
 * P0 FIX: Eliminate process-global mutable state
 * Create fresh Redis client on each call to prevent identity leaks
 */
function getRedisClient(): Redis {
  let url = process.env.KV_REST_API_URL;
  let token = process.env.KV_REST_API_TOKEN;
  
  const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
  const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;
  
  if (!url && integrationUrl) url = integrationUrl;
  if (!token && integrationToken) token = integrationToken;
  
  if (!url || !token) {
    throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
  }
  
  // Create fresh client on each call (no global cache)
  return new Redis({ url, token });
}

// Export Redis client getter for use in gallery route
export { getRedisClient };

/**
 * P0 FIX: Normalize Redis Lua error codes at repository boundary
 * Upstash Redis returns errors wrapped as "Command failed: ERROR_CODE"
 * Callers expect stable machine-readable error codes, not wrapped messages
 */
function normalizeRedisError(error: string): string {
  return error.replace(/^Command failed: /, '');
}

export type TransactionState = 'prepared' | 'committing' | 'committed' | 'consumed' | 'failed';

export interface DeploymentTransaction {
  transactionId: string;
  state: TransactionState;
  owner?: string; // Claim token for committing state
  commitSha?: string; // Git commit SHA (immutable once set)
  commitUrl?: string;
  parentCommitSha?: string; // Expected parent for concurrent safety
  stagingKeys: string[];
  files: string[]; // Authority files in this transaction
  reason?: string;
  createdAt: string;
  claimedAt?: string;
  committedAt?: string;
  consumedAt?: string;
  failedAt?: string;
  failureReason?: string;
  retryCount?: number;
}

/**
 * P0 FIX: Unified batch deployment context
 *
 * This represents the authoritative lifecycle state for a batch deployment.
 * All phases of the deployment operate on this single immutable context object,
 * eliminating variable shadowing and ensuring consistent state tracking.
 *
 * The context flows through the entire deployment pipeline:
 * BATCH_VALIDATED → BATCH_CLAIMED → GIT_BASE_PINNED → SEMANTIC_PATCHED →
 * GIT_COMMITTED → REDIS_PROMOTED → CONSUMED
 *
 * Critical invariants:
 * - baseGitSha is pinned at the beginning and never changes
 * - All transactions in the batch share the same commitSha after Git succeeds
 * - All staging keys from all transactions are promoted atomically
 * - No partial consumption if promotion fails
 */
export interface BatchDeploymentContext {
  // Batch identity
  primaryTransactionId: string;
  transactionIds: string[];
  owner: string;
  createdAt: string;

  // Git authority
  baseGitSha: string; // Pinned at the beginning, immutable
  finalCommitSha?: string; // Set after Git commit succeeds
  finalCommitUrl?: string;

  // Transaction lifecycle
  transactions: DeploymentTransaction[]; // All transactions in the batch
  lifecycle: 'VALIDATED' | 'CLAIMED' | 'GIT_BASE_PINNED' | 'SEMANTIC_PATCHED' | 'GIT_COMMITTED' | 'REDIS_PROMOTED' | 'CONSUMED' | 'FAILED';

  // Staging state
  allStagingKeys: string[]; // Union of all staging keys from all transactions

  // Error state
  failureReason?: string;
  failedAt?: string;
}

/**
 * Create a new batch deployment context
 * @param transactionIds - Transaction IDs in the batch
 * @param transactions - Transaction records
 * @param baseGitSha - Pinned Git base SHA
 * @param owner - Batch owner token
 * @returns New batch deployment context
 */
export function createBatchDeploymentContext(
  transactionIds: string[],
  transactions: DeploymentTransaction[],
  baseGitSha: string,
  owner: string
): BatchDeploymentContext {
  const allStagingKeys = transactions.flatMap(tx => tx.stagingKeys);

  return {
    primaryTransactionId: transactionIds[0],
    transactionIds,
    owner,
    createdAt: new Date().toISOString(),
    baseGitSha,
    transactions,
    lifecycle: 'VALIDATED',
    allStagingKeys,
  };
}

const TRANSACTION_PREFIX = 'deployment-transaction:';

/**
 * P0 FIX: Authoritative decoder for deployment transaction Redis values
 * Upstash Redis can return either JSON strings or already-deserialized objects
 * This boundary normalizes both to consistent DeploymentTransaction type
 *
 * Pattern from commit 135a20a5: parseStagingValue() for the same Upstash contract issue
 */
export function parseTransactionValue(value: unknown): DeploymentTransaction {
  if (typeof value === 'string') {
    return JSON.parse(value) as DeploymentTransaction;
  }

  if (value && typeof value === 'object') {
    return value as DeploymentTransaction;
  }

  throw new Error(
    `Invalid deployment transaction Redis value type: ${typeof value}`
  );
}

/**
 * Atomic Lua script for multi-assignment promotion
 * Validates all expected revisions, then atomically writes all assignments
 * Prevents partial promotion failures
 *
 * KEYS[1]: transactionKey - deployment transaction key
 * KEYS[2..N]: assignmentKeys - assignment keys to validate and write
 *
 * ARGV[1]: assignmentsData - JSON string of assignments to promote
 * ARGV[2]: deploymentTransactionId - transaction ID for validation
 * ARGV[3]: expectedOwner - owner to verify (optional)
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK', count] on success
 * ['ERR', errorCode, details] on failure
 *
 * P0 FIX: Uses KEYS array per Redis contract instead of dynamically constructed keys
 */
const ATOMIC_PROMOTION_SCRIPT = `
  local transactionKey = KEYS[1]
  local assignmentsData = cjson.decode(ARGV[1])
  local deploymentTransactionId = ARGV[2]
  local expectedOwner = ARGV[3]

  -- Validate transaction state before promotion
  local transaction = redis.call('GET', transactionKey)

  if not transaction then
    return {'ERR', 'TRANSACTION_NOT_FOUND', deploymentTransactionId}
  end

  local parsed = cjson.decode(transaction)

  -- Transaction must be in committing state for promotion
  if parsed.state ~= 'committing' then
    return {'ERR', 'INVALID_TRANSACTION_STATE', parsed.state}
  end

  -- Verify transaction ownership
  if expectedOwner and expectedOwner ~= '' then
    if parsed.owner ~= expectedOwner then
      return {'ERR', 'OWNER_MISMATCH', parsed.owner}
    end
  end

  -- Phase 1: Validate all expected revisions
  -- Assignment keys start at KEYS[2]
  for i, assignment in ipairs(assignmentsData) do
    local assignmentKey = KEYS[i + 1] -- KEYS[2] onwards are assignment keys
    local current = redis.call('GET', assignmentKey)

    if current then
      local parsed = cjson.decode(current)
      local expectedRevision = assignment.expectedRevision

      -- Check if current revision matches expected
      if parsed.revision ~= expectedRevision then
        return {'ERR', 'CAS_FAILURE', assignment.serviceSlug}
      end
    else
      -- Assignment doesn't exist, expectedRevision must be 0 for create
      if assignment.expectedRevision ~= 0 then
        return {'ERR', 'CAS_FAILURE_MISSING', assignment.serviceSlug}
      end
    end
  end

  -- Phase 2: Atomically write all assignments
  for i, assignment in ipairs(assignmentsData) do
    local assignmentKey = KEYS[i + 1]
    -- Increment revision for write
    assignment.revision = assignment.expectedRevision + 1
    local assignmentValue = cjson.encode(assignment)

    redis.call('SET', assignmentKey, assignmentValue)
  end

  return {'OK', #assignmentsData}
`;

/**
 * Atomic multi-assignment promotion
 * Validates all expected revisions, then atomically writes all assignments
 * Prevents partial promotion failures
 *
 * P0 FIX: Passes namespace from getKvNamespace() to Lua script to ensure
 * atomic promotion writes to the same namespaced keyspace as the authoritative
 * assignment store. This prevents namespace isolation failure where promotion
 * writes to unnamespaced keys while normal operations use namespaced keys.
 */
export async function atomicPromoteAssignments(
  assignments: Array<{ serviceSlug: string; mediaId: string; expectedRevision: number; updatedAt: string; source: string }>,
  deploymentTransactionId: string,
  owner?: string
): Promise<{ success: boolean; count: number; error?: string; failedServiceSlug?: string }> {
  try {
    const redis = getRedisClient();
    const namespace = getKvNamespace();
    const assignmentsData = JSON.stringify(assignments);

    // Build KEYS array: transaction key + all assignment keys
    const transactionKey = `${namespace}deployment-transaction:${deploymentTransactionId}`;
    const assignmentKeys = assignments.map(a => `${namespace}service-card-assignment:${a.serviceSlug}`);
    const keys = [transactionKey, ...assignmentKeys];

    const result = await redis.eval(
      ATOMIC_PROMOTION_SCRIPT,
      keys, // KEYS array
      [assignmentsData, deploymentTransactionId, owner || ''] // ARGV array
    );

    // Parse indexed array return format: ['OK', count] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 2) {
      console.error('[ATOMIC_PROMOTION] INVALID_RETURN', {
        deploymentTransactionId,
        result,
        reason: 'Lua script did not return indexed array'
      });
      return {
        success: false,
        count: 0,
        error: 'INVALID_LUA_RETURN',
      };
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const details = result[2];
      console.error('[ATOMIC_PROMOTION] FAILED', {
        deploymentTransactionId,
        errorCode,
        details,
      });

      return {
        success: false,
        count: 0,
        error: errorCode,
        failedServiceSlug: typeof details === 'string' ? details : undefined,
      };
    }

    // Success: ['OK', count]
    const count = result[1];
    console.log('[ATOMIC_PROMOTION] SUCCESS', {
      deploymentTransactionId,
      count,
    });

    return {
      success: true,
      count: count || 0,
    };
  } catch (error) {
    console.error('[ATOMIC_PROMOTION] ERROR', {
      deploymentTransactionId,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get namespaced transaction key
 */
function getTransactionKey(transactionId: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${TRANSACTION_PREFIX}${transactionId}`;
}

/**
 * P0 FIX: Lua script for conditional project transaction pointer cleanup
 *
 * This script atomically:
 * 1. Checks if the project pointer points to the transaction being consumed
 * 2. Only deletes the pointer if it matches (prevents race conditions)
 * 3. Leaves the pointer alone if it now points to a different transaction
 *
 * KEYS[1]: projectStagingKey - project-level current transaction pointer
 * ARGV[1]: transactionId - the transaction being consumed
 *
 * Returns: 'DELETED' if pointer was deleted, 'SKIPPED' if pointer pointed to different transaction
 */
const CONDITIONAL_POINTER_CLEANUP_SCRIPT = `
  local projectStagingKey = KEYS[1]
  local transactionId = ARGV[1]
  
  local currentPointer = redis.call('GET', projectStagingKey)
  
  -- Only delete if pointer still points to the transaction being consumed
  if currentPointer == transactionId then
    redis.call('DEL', projectStagingKey)
    return 'DELETED'
  else
    return 'SKIPPED'
  end
`;

/**
 * P0 FIX: Runtime Lua script for atomic gallery CAS with runtime authority
 *
 * This script atomically:
 * 1. Reads runtime authority (effective gallery + revision) - ONLY source of truth
 * 2. FAILS CLOSED if runtime authority doesn't exist (no filesystem fallback)
 * 3. Compares expectedRevision with current runtime revision
 * 4. If match, writes new gallery with incremented revision
 * 5. Updates runtime authority atomically
 * 6. Updates project-level transaction pointer
 * 7. Writes staging record for deployment
 * 8. Returns the new revision
 *
 * CRITICAL INVARIANT: Runtime authority is the ONLY CAS authority
 * - Staged state is pending deployment material ONLY
 * - Staged state may be used for previousGallery but NEVER for currentRevision
 * - Filesystem is deployed projection/fallback ONLY (for GET, not CAS)
 * - CAS FAILS CLOSED if runtime authority doesn't exist
 *
 * KEYS[1]: runtimeGalleryKey - effective gallery/revision authority (ONLY source of truth)
 * KEYS[2]: projectStagingKey - project-level current transaction pointer
 * KEYS[3]: specificStagingKey - new transaction's gallery staging key
 *
 * ARGV[1]: expectedRevision - the revision the client expects
 * ARGV[2]: newGalleryJson - JSON string of the new gallery array
 * ARGV[3]: transactionId - the new transaction ID
 * ARGV[4]: mutationTimestamp - ISO timestamp for the mutation
 *
 * Returns indexed array for proper RESP2 serialization:
 * [status, newRevision, transactionId, actualRevision] on success
 * ['ERR', errorCode, expectedRevision, actualRevision] on failure
 */
const ATOMIC_GALLERY_CAS_SCRIPT = `
  local runtimeGalleryKey = KEYS[1]
  local projectStagingKey = KEYS[2]
  local specificStagingKey = KEYS[3]
  
  local expectedRevision = tonumber(ARGV[1])
  local newGalleryJson = ARGV[2]
  local transactionId = ARGV[3]
  local mutationTimestamp = ARGV[4]
  
  -- P0 FIX: Read runtime authority ONLY (this is the sole CAS authority)
  local runtimeData = redis.call('GET', runtimeGalleryKey)
  
  -- P0 FIX: FAIL CLOSED if runtime authority doesn't exist
  -- No filesystem fallback in production CAS
  if not runtimeData then
    return {'ERR', 'RUNTIME_AUTHORITY_NOT_INITIALIZED', expectedRevision, 0}
  end
  
  local currentGallery = nil
  local currentRevision = 0
  
  -- Upstash may return object or string
  local parsed
  if type(runtimeData) == 'string' then
    parsed = cjson.decode(runtimeData)
  elseif type(runtimeData) == 'table' then
    parsed = runtimeData
  else
    -- Invalid data type, CAS fails
    return {'ERR', 'INVALID_RUNTIME_DATA_TYPE', expectedRevision, 0}
  end
  
  if parsed then
    currentGallery = parsed.gallery
    currentRevision = tonumber(parsed.currentRevision) or 0
  else
    -- Invalid runtime data, CAS fails
    return {'ERR', 'INVALID_RUNTIME_DATA_STRUCTURE', expectedRevision, 0}
  end
  
  -- P0 FIX: CRITICAL - Staged state is NOT used for CAS revision comparison
  -- Staged state is pending deployment material ONLY
  -- It can be used for previousGallery but NEVER becomes the source of currentRevision
  -- This eliminates the competing authority path where staged state could overwrite runtime
  
  -- CAS: Compare current revision with expected revision
  if currentRevision ~= expectedRevision then
    return {'ERR', 'CAS_FAILURE', expectedRevision, currentRevision}
  end
  
  -- Write new gallery with incremented revision
  local newGallery = cjson.decode(newGalleryJson)
  local newRevision = currentRevision + 1
  local galleryPayload = {
    gallery = newGallery,
    currentRevision = newRevision,
    previousGallery = currentGallery or {},
    mutationTimestamp = mutationTimestamp
  }
  
  -- Write the specific staging key
  redis.call('SET', specificStagingKey, cjson.encode(galleryPayload))
  
  -- Update the project-level transaction pointer
  redis.call('SET', projectStagingKey, transactionId)
  
  -- P0 FIX: Atomically update runtime authority (this is the live authority)
  local runtimePayload = {
    gallery = newGallery,
    currentRevision = newRevision,
    lastMutationTimestamp = mutationTimestamp,
    lastTransactionId = transactionId
  }
  redis.call('SET', runtimeGalleryKey, cjson.encode(runtimePayload))
  
  -- Return indexed array for proper RESP2 serialization
  return {'OK', newRevision, transactionId, currentRevision}
`;

// Export production Lua scripts for use in gallery route and integration tests
export { ATOMIC_GALLERY_CAS_SCRIPT, CONDITIONAL_POINTER_CLEANUP_SCRIPT };

/**
 * P0 FIX: Atomic Lua script for complete gallery mutation (CAS + transaction + staging + runtime)
 *
 * This script atomically performs the entire mutation in ONE Redis operation:
 * 1. Reads runtime authority (effective gallery + revision) - ONLY source of truth
 * 2. FAILS CLOSED if runtime authority doesn't exist (no filesystem fallback)
 * 3. Compares expectedRevision with current runtime revision
 * 4. If match, creates/updates deployment transaction with staging keys
 * 5. Writes new gallery with incremented revision to staging
 * 6. Updates runtime authority atomically
 * 7. Updates project-level transaction pointer
 * 8. Returns the new revision and transaction ID
 *
 * CRITICAL INVARIANT: This is ONE atomic Redis operation
 * - No split-brain window between CAS and transaction creation
 * - Transaction only exists if CAS succeeds
 * - Runtime authority only advances if entire operation succeeds
 *
 * KEYS[1]: runtimeGalleryKey - effective gallery/revision authority (ONLY source of truth)
 * KEYS[2]: projectStagingKey - project-level current transaction pointer
 * KEYS[3]: specificStagingKey - new transaction's gallery staging key
 * KEYS[4]: transactionKey - deployment transaction record
 *
 * ARGV[1]: expectedRevision - the revision the client expects
 * ARGV[2]: newGalleryJson - JSON string of the new gallery array
 * ARGV[3]: transactionId - the new transaction ID (server-generated)
 * ARGV[4]: mutationTimestamp - ISO timestamp for the mutation
 * ARGV[5]: transactionData - JSON string of the transaction record
 *
 * Returns indexed array for proper RESP2 serialization:
 * [status, newRevision, transactionId, actualRevision] on success
 * ['ERR', errorCode, expectedRevision, actualRevision] on failure
 */
const ATOMIC_GALLERY_MUTATION_SCRIPT = `
  local runtimeGalleryKey = KEYS[1]
  local projectStagingKey = KEYS[2]
  local specificStagingKey = KEYS[3]
  local transactionKey = KEYS[4]
  
  local expectedRevision = tonumber(ARGV[1])
  local newGalleryJson = ARGV[2]
  local transactionId = ARGV[3]
  local mutationTimestamp = ARGV[4]
  local transactionData = ARGV[5]
  
  -- P0 FIX: Read runtime authority ONLY (this is the sole CAS authority)
  local runtimeData = redis.call('GET', runtimeGalleryKey)
  
  -- P0 FIX: FAIL CLOSED if runtime authority doesn't exist
  -- No filesystem fallback in production CAS
  if not runtimeData then
    return {'ERR', 'RUNTIME_AUTHORITY_NOT_INITIALIZED', expectedRevision, 0}
  end
  
  local currentGallery = nil
  local currentRevision = 0
  
  -- Upstash may return object or string
  local parsed
  if type(runtimeData) == 'string' then
    parsed = cjson.decode(runtimeData)
  elseif type(runtimeData) == 'table' then
    parsed = runtimeData
  else
    -- Invalid data type, CAS fails
    return {'ERR', 'INVALID_RUNTIME_DATA_TYPE', expectedRevision, 0}
  end
  
  if parsed then
    currentGallery = parsed.gallery
    currentRevision = tonumber(parsed.currentRevision) or 0
  else
    -- Invalid runtime data, CAS fails
    return {'ERR', 'INVALID_RUNTIME_DATA_STRUCTURE', expectedRevision, 0}
  end
  
  -- CAS: Compare current revision with expected revision
  if currentRevision ~= expectedRevision then
    return {'ERR', 'CAS_FAILURE', expectedRevision, currentRevision}
  end
  
  -- Write new gallery with incremented revision
  local newGallery = cjson.decode(newGalleryJson)
  local newRevision = currentRevision + 1
  local galleryPayload = {
    gallery = newGallery,
    currentRevision = newRevision,
    previousGallery = currentGallery or {},
    mutationTimestamp = mutationTimestamp
  }
  
  -- Write the specific staging key with 24-hour TTL
  redis.call('SET', specificStagingKey, cjson.encode(galleryPayload))
  redis.call('EXPIRE', specificStagingKey, 86400)
  
  -- Create/update deployment transaction with 24-hour TTL
  redis.call('SET', transactionKey, transactionData)
  redis.call('EXPIRE', transactionKey, 86400)
  
  -- Update the project-level transaction pointer with 24-hour TTL
  redis.call('SET', projectStagingKey, transactionId)
  redis.call('EXPIRE', projectStagingKey, 86400)
  
  -- Atomically update runtime authority (this is the live authority)
  local runtimePayload = {
    gallery = newGallery,
    currentRevision = newRevision,
    lastMutationTimestamp = mutationTimestamp,
    lastTransactionId = transactionId
  }
  redis.call('SET', runtimeGalleryKey, cjson.encode(runtimePayload))
  
  -- Return indexed array for proper RESP2 serialization
  return {'OK', newRevision, transactionId, currentRevision}
`;

// Export the atomic mutation script for use in gallery route
export { ATOMIC_GALLERY_MUTATION_SCRIPT };

/**
 * Atomic Lua script for transaction creation with staging key aggregation
 * Creates new transaction if absent, atomically merges staging keys if exists
 * This supports bulk assignments: multiple assignments share one transaction ID
 * but each contributes its own staging key to the transaction record
 */
const CREATE_TRANSACTION_SCRIPT = `
  local key = KEYS[1]
  local transactionData = ARGV[1]
  local newStagingKeys = cjson.decode(ARGV[2])
  
  local current = redis.call('GET', key)
  
  -- If transaction already exists, atomically merge staging keys
  if current then
    local parsed = cjson.decode(current)
    
    -- Only merge if transaction is in 'prepared' state
    -- Once committing/committed/failed, no new mutations allowed
    if parsed.state ~= 'prepared' then
      return {err = 'TRANSACTION_NOT_PREPARED: Cannot add staging keys to ' .. parsed.state .. ' transaction'}
    end
    
    -- Build merged staging keys with deduplication
    local existingKeys = parsed.stagingKeys or {}
    local mergedKeys = {}
    local keySet = {}
    
    -- Add existing keys to set
    for i, existingKey in ipairs(existingKeys) do
      keySet[existingKey] = true
      table.insert(mergedKeys, existingKey)
    end
    
    -- Add new keys if not already present
    for i, newKey in ipairs(newStagingKeys) do
      if not keySet[newKey] then
        keySet[newKey] = true
        table.insert(mergedKeys, newKey)
      end
    end
    
    -- Update transaction with merged staging keys
    parsed.stagingKeys = mergedKeys
    redis.call('SET', key, cjson.encode(parsed))
    
    -- Return the updated transaction data for caller to use
    -- Use indexed array format for consistent RESP2 serialization
    return {'OK', cjson.encode(parsed), #mergedKeys}
  end
  
  -- Create new transaction atomically
  redis.call('SET', key, transactionData)
  redis.call('EXPIRE', key, 86400) -- 24 hour TTL
  -- Return indexed array format for consistency with merge case
  return {'OK', transactionData, #newStagingKeys}
`;

/**
 * Atomic Lua script for metadata update (no state transition)
 * Updates transaction metadata while preserving current state
 * Used for setGitCommitSha to persist commit SHA before Redis promotion
 *
 * CRITICAL: This is NOT a state transition - it only updates metadata
 *
 * Security guarantees:
 * - Transaction must exist
 * - Transaction ID must match
 * - Current state must be the expected state (e.g., committing)
 * - Owner must match (unless owner is empty/not set)
 * - Idempotent: allows same commitSha to be set multiple times
 * - Rejects conflicting commitSha (CAS semantics)
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK'] on success
 * ['ERR', errorCode, details] on failure
 */
const METADATA_UPDATE_SCRIPT = `
  local key = KEYS[1]
  local transactionId = ARGV[1]
  local expectedState = ARGV[2]
  local owner = ARGV[3]
  local commitSha = ARGV[4]
  local commitUrl = ARGV[5]
  local transactionData = ARGV[6]

  local current = redis.call('GET', key)

  -- REJECT if transaction doesn't exist
  if not current then
    return {'ERR', 'TRANSACTION_NOT_FOUND'}
  end

  local parsed = cjson.decode(current)
  local currentState = parsed.state

  -- CRITICAL: Validate transaction ID identity
  if parsed.transactionId ~= transactionId then
    return {'ERR', 'TRANSACTION_ID_MISMATCH'}
  end

  -- REJECT if current state is not the expected state
  if currentState ~= expectedState then
    return {'ERR', 'INVALID_STATE', currentState}
  end

  -- OWNER VERIFICATION: Only the owner can update metadata
  if parsed.owner and parsed.owner ~= '' then
    if owner and owner ~= '' and owner ~= parsed.owner then
      return {'ERR', 'OWNER_MISMATCH', parsed.owner}
    end
  end

  -- CAS SEMANTICS: Reject if commitSha already exists and differs from new value
  if parsed.commitSha and parsed.commitSha ~= '' and parsed.commitSha ~= commitSha then
    return {'ERR', 'CAS_FAILURE', parsed.commitSha}
  end

  -- Update metadata while preserving state
  local newParsed = cjson.decode(transactionData)
  newParsed.state = currentState -- Preserve current state
  newParsed.commitSha = commitSha
  newParsed.commitUrl = commitUrl

  redis.call('SET', key, cjson.encode(newParsed))
  return {'OK'}
`;

/**
 * P0 FIX: Atomic Lua script for batch Git commit SHA assignment
 *
 * This script atomically assigns the same Git commit SHA to multiple transactions
 * in ONE Redis operation, ensuring:
 * - ALL transactions exist
 * - ALL are in 'committing' state
 * - ALL have the same owner
 * - NONE have conflicting commitSha
 * - ALL receive the same commitSha atomically
 *
 * CRITICAL: This eliminates partial SHA persistence where some transactions
 * get the SHA while others fail, which would leave the batch in an inconsistent state.
 *
 * KEYS[1..N]: Transaction keys for all transactions in the batch
 *
 * ARGV[1]: commitSha - Git commit SHA to assign to all transactions
 * ARGV[2]: commitUrl - Git commit URL
 * ARGV[3]: owner - Owner token for verification
 * ARGV[4]: transactionIdsJson - JSON array of transaction IDs for validation
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK', count] on success
 * ['ERR', errorCode, failedTransactionId, details] on failure
 */
const ATOMIC_BATCH_SET_COMMIT_SHA_SCRIPT = `
  local commitSha = ARGV[1]
  local commitUrl = ARGV[2]
  local owner = ARGV[3]
  local transactionIdsJson = ARGV[4]
  local transactionIds = cjson.decode(transactionIdsJson)
  local keyCount = #KEYS

  -- Validate that we have the right number of keys
  if keyCount ~= #transactionIds then
    return {'ERR', 'KEY_COUNT_MISMATCH', transactionIds[1], 'Expected ' .. #transactionIds .. ' keys, got ' .. keyCount}
  end

  -- Phase 1: Validate ALL transactions exist and are eligible for SHA assignment
  for i = 1, keyCount do
    local key = KEYS[i]
    local transactionId = transactionIds[i]
    local current = redis.call('GET', key)

    if not current then
      return {'ERR', 'TRANSACTION_NOT_FOUND', transactionId, 'Transaction does not exist'}
    end

    local parsed = cjson.decode(current)

    -- Validate transaction ID identity
    if parsed.transactionId ~= transactionId then
      return {'ERR', 'TRANSACTION_ID_MISMATCH', transactionId, 'Transaction ID mismatch'}
    end

    -- Verify transaction is in committing state
    if parsed.state ~= 'committing' then
      return {'ERR', 'INVALID_STATE', transactionId, 'Transaction is in ' .. parsed.state .. ' state, expected committing'}
    end

    -- Verify ownership
    if parsed.owner and parsed.owner ~= '' then
      if owner and owner ~= '' and owner ~= parsed.owner then
        return {'ERR', 'OWNER_MISMATCH', transactionId, 'Transaction owned by ' .. parsed.owner}
      end
    end

    -- CAS SEMANTICS: Reject if commitSha already exists and differs
    if parsed.commitSha and parsed.commitSha ~= '' and parsed.commitSha ~= commitSha then
      return {'ERR', 'CAS_FAILURE', transactionId, 'Transaction already has commitSha ' .. parsed.commitSha}
    end
  end

  -- Phase 2: Atomically assign commitSha to ALL transactions
  for i = 1, keyCount do
    local key = KEYS[i]
    local current = redis.call('GET', key)
    local parsed = cjson.decode(current)

    -- Update metadata while preserving state
    parsed.commitSha = commitSha
    parsed.commitUrl = commitUrl

    redis.call('SET', key, cjson.encode(parsed))
  end

  return {'OK', keyCount}
`;

/**
 * P0 FIX: Atomic Lua script for batch transaction commit
 *
 * This script atomically commits multiple transactions in ONE Redis operation,
 * ensuring:
 * - ALL transactions exist
 * - ALL are in 'committing' state
 * - ALL have the same owner
 * - ALL have the same commitSha set
 * - ALL transition to 'committed' together
 *
 * CRITICAL: This eliminates partial commit scenarios where some transactions
 * transition while others fail, which would leave the batch in an inconsistent state.
 *
 * KEYS[1..N]: Transaction keys for all transactions in the batch
 *
 * ARGV[1]: commitSha - Expected commit SHA that all transactions must have
 * ARGV[2]: owner - Owner token for verification
 * ARGV[3]: transactionIdsJson - JSON array of transaction IDs for validation
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK', count] on success
 * ['ERR', errorCode, failedTransactionId, details] on failure
 */
const ATOMIC_BATCH_COMMIT_SCRIPT = `
  local expectedCommitSha = ARGV[1]
  local owner = ARGV[2]
  local transactionIdsJson = ARGV[3]
  local transactionIds = cjson.decode(transactionIdsJson)
  local keyCount = #KEYS

  -- Validate that we have the right number of keys
  if keyCount ~= #transactionIds then
    return {'ERR', 'KEY_COUNT_MISMATCH', transactionIds[1], 'Expected ' .. #transactionIds .. ' keys, got ' .. keyCount}
  end

  -- Phase 1: Validate ALL transactions exist and are eligible for commit
  for i = 1, keyCount do
    local key = KEYS[i]
    local transactionId = transactionIds[i]
    local current = redis.call('GET', key)

    if not current then
      return {'ERR', 'TRANSACTION_NOT_FOUND', transactionId, 'Transaction does not exist'}
    end

    local parsed = cjson.decode(current)

    -- Validate transaction ID identity
    if parsed.transactionId ~= transactionId then
      return {'ERR', 'TRANSACTION_ID_MISMATCH', transactionId, 'Transaction ID mismatch'}
    end

    -- Verify transaction is in committing state
    if parsed.state ~= 'committing' then
      return {'ERR', 'INVALID_STATE', transactionId, 'Transaction is in ' .. parsed.state .. ' state, expected committing'}
    end

    -- Verify ownership
    if parsed.owner and parsed.owner ~= '' then
      if owner and owner ~= '' and owner ~= parsed.owner then
        return {'ERR', 'OWNER_MISMATCH', transactionId, 'Transaction owned by ' .. parsed.owner}
      end
    end

    -- Verify commitSha is set and matches expected
    if not parsed.commitSha or parsed.commitSha == '' then
      return {'ERR', 'MISSING_COMMIT_SHA', transactionId, 'Transaction does not have commitSha set'}
    end

    if parsed.commitSha ~= expectedCommitSha then
      return {'ERR', 'COMMIT_SHA_MISMATCH', transactionId, 'Transaction has commitSha ' .. parsed.commitSha .. ', expected ' .. expectedCommitSha}
    end
  end

  -- Phase 2: Atomically commit ALL transactions
  for i = 1, keyCount do
    local key = KEYS[i]
    local current = redis.call('GET', key)
    local parsed = cjson.decode(current)

    -- Transition to committed state
    parsed.state = 'committed'
    parsed.committedAt = os.time()

    redis.call('SET', key, cjson.encode(parsed))
  end

  return {'OK', keyCount}
`;

/**
 * P0 FIX: Atomic Lua script for batch staging promotion
 *
 * This script atomically promotes ALL staging keys from ALL transactions
 * in ONE Redis operation, ensuring:
 * - ALL transactions exist and are in committing state
 * - ALL transactions have the same owner
 * - ALL transactions have the same commit SHA
 * - ALL expected revisions match current runtime state
 * - ALL assignments are promoted atomically
 * - NO partial promotion where some succeed and others fail
 *
 * P0 FIX: Validate EVERY transaction before ANY mutation
 *
 * KEYS[1..N]: Transaction keys for all transactions in the batch
 * KEYS[N+1..M]: Assignment keys to promote
 *
 * ARGV[1]: transactionCount - Number of transaction keys
 * ARGV[2]: transactionIdsJson - JSON array of transaction IDs for validation
 * ARGV[3]: expectedCommitSha - Expected commit SHA that all transactions must have
 * ARGV[4]: expectedOwner - Owner to verify (optional)
 * ARGV[5]: assignmentsData - JSON string of all assignments to promote
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK', count] on success
 * ['ERR', errorCode, failedTransactionId, details] on failure
 */
const ATOMIC_BATCH_PROMOTE_SCRIPT = `
  local transactionCount = tonumber(ARGV[1]) or 0
  local transactionIdsJson = ARGV[2]
  local expectedCommitSha = ARGV[3]
  local expectedOwner = ARGV[4]
  local assignmentsData = cjson.decode(ARGV[5])
  local transactionIds = cjson.decode(transactionIdsJson)

  -- Validate that we have the right number of transaction keys
  if transactionCount ~= #transactionIds then
    return {'ERR', 'KEY_COUNT_MISMATCH', transactionIds[1], 'Expected ' .. #transactionIds .. ' transaction keys, got ' .. transactionCount}
  end

  -- Phase 1: Validate ALL transactions exist and are eligible for promotion
  for i = 1, transactionCount do
    local key = KEYS[i]
    local transactionId = transactionIds[i]
    local current = redis.call('GET', key)

    if not current then
      return {'ERR', 'TRANSACTION_NOT_FOUND', transactionId, 'Transaction does not exist'}
    end

    local parsed = cjson.decode(current)

    -- Validate transaction ID identity
    if parsed.transactionId ~= transactionId then
      return {'ERR', 'TRANSACTION_ID_MISMATCH', transactionId, 'Transaction ID mismatch'}
    end

    -- Verify transaction is in committing state
    if parsed.state ~= 'committing' then
      return {'ERR', 'INVALID_STATE', transactionId, 'Transaction is in ' .. parsed.state .. ' state, expected committing'}
    end

    -- Verify ownership
    if expectedOwner and expectedOwner ~= '' then
      if parsed.owner and parsed.owner ~= '' and parsed.owner ~= expectedOwner then
        return {'ERR', 'OWNER_MISMATCH', transactionId, 'Transaction owned by ' .. parsed.owner}
      end
    end

    -- Verify commitSha is set and matches expected
    if not parsed.commitSha or parsed.commitSha == '' then
      return {'ERR', 'MISSING_COMMIT_SHA', transactionId, 'Transaction does not have commitSha set'}
    end

    if parsed.commitSha ~= expectedCommitSha then
      return {'ERR', 'COMMIT_SHA_MISMATCH', transactionId, 'Transaction has commitSha ' .. parsed.commitSha .. ', expected ' .. expectedCommitSha}
    end
  end

  -- Phase 2: Validate all expected revisions
  -- Assignment keys start at KEYS[transactionCount + 1]
  for i, assignment in ipairs(assignmentsData) do
    local assignmentKey = KEYS[transactionCount + i]
    local current = redis.call('GET', assignmentKey)

    if current then
      local parsed = cjson.decode(current)
      local expectedRevision = assignment.expectedRevision

      -- Check if current revision matches expected
      if parsed.revision ~= expectedRevision then
        return {'ERR', 'CAS_FAILURE', transactionIds[1], assignment.serviceSlug}
      end
    else
      -- Assignment doesn't exist, expectedRevision must be 0 for create
      if assignment.expectedRevision ~= 0 then
        return {'ERR', 'CAS_FAILURE_MISSING', transactionIds[1], assignment.serviceSlug}
      end
    end
  end

  -- Phase 3: Atomically write all assignments
  for i, assignment in ipairs(assignmentsData) do
    local assignmentKey = KEYS[transactionCount + i]
    -- Increment revision for write
    assignment.revision = assignment.expectedRevision + 1
    local assignmentValue = cjson.encode(assignment)

    redis.call('SET', assignmentKey, assignmentValue)
  end

  return {'OK', #assignmentsData}
`;

/**
 * P0 FIX: Atomic Lua script for batch transaction consumption with staging cleanup
 *
 * This script atomically:
 * 1. Validates ALL transactions are in 'committed' state
 * 2. Transitions ALL to 'consumed' state
 * 3. Deletes ALL staging keys atomically
 * 4. Clears ALL project-level transaction pointers conditionally
 *
 * CRITICAL: This eliminates partial consumption where some transactions
 * are consumed while others fail, and ensures staging cleanup is atomic
 * with the state transition.
 *
 * KEYS[1..N]: Transaction keys for all transactions in the batch
 * KEYS[N+1..M]: Staging keys to delete (optional)
 * KEYS[M+1..O]: Project-level transaction pointers to clear (optional)
 *
 * ARGV[1]: owner - Owner token for verification
 * ARGV[2]: transactionIdsJson - JSON array of transaction IDs for validation
 * ARGV[3]: stagingKeyCount - Number of staging keys that follow
 * ARGV[4]: pointerKeyCount - Number of pointer keys that follow
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK', transactionCount, stagingKeyCount, pointerKeyCount] on success
 * ['ERR', errorCode, failedTransactionId, details] on failure
 */
const ATOMIC_BATCH_CONSUME_SCRIPT = `
  local owner = ARGV[1]
  local transactionIdsJson = ARGV[2]
  local stagingKeyCount = tonumber(ARGV[3]) or 0
  local pointerKeyCount = tonumber(ARGV[4]) or 0
  local transactionIds = cjson.decode(transactionIdsJson)
  local transactionKeyCount = tonumber(ARGV[5]) or #transactionIds
  local pointerExpectedValuesJson = ARGV[6] or '[]'
  local pointerExpectedValues = cjson.decode(pointerExpectedValuesJson)

  -- Validate that we have the right number of keys
  local expectedKeyCount = transactionKeyCount + stagingKeyCount + pointerKeyCount
  if #KEYS ~= expectedKeyCount then
    return {'ERR', 'KEY_COUNT_MISMATCH', transactionIds[1], 'Expected ' .. expectedKeyCount .. ' keys, got ' .. #KEYS}
  end

  -- Phase 1: Validate ALL transactions exist and are eligible for consumption
  for i = 1, transactionKeyCount do
    local key = KEYS[i]
    local transactionId = transactionIds[i]
    local current = redis.call('GET', key)

    if not current then
      return {'ERR', 'TRANSACTION_NOT_FOUND', transactionId, 'Transaction does not exist'}
    end

    local parsed = cjson.decode(current)

    -- Validate transaction ID identity
    if parsed.transactionId ~= transactionId then
      return {'ERR', 'TRANSACTION_ID_MISMATCH', transactionId, 'Transaction ID mismatch'}
    end

    -- Verify transaction is in committed state
    if parsed.state ~= 'committed' then
      return {'ERR', 'INVALID_STATE', transactionId, 'Transaction is in ' .. parsed.state .. ' state, expected committed'}
    end

    -- Verify ownership
    if parsed.owner and parsed.owner ~= '' then
      if owner and owner ~= '' and owner ~= parsed.owner then
        return {'ERR', 'OWNER_MISMATCH', transactionId, 'Transaction owned by ' .. parsed.owner}
      end
    end
  end

  -- Phase 2: Atomically consume ALL transactions
  for i = 1, transactionKeyCount do
    local key = KEYS[i]
    local current = redis.call('GET', key)
    local parsed = cjson.decode(current)

    -- Transition to consumed state
    parsed.state = 'consumed'
    parsed.consumedAt = os.time()

    redis.call('SET', key, cjson.encode(parsed))
  end

  -- Phase 3: Delete ALL staging keys atomically
  local stagingKeysDeleted = 0
  for i = transactionKeyCount + 1, transactionKeyCount + stagingKeyCount do
    local key = KEYS[i]
    redis.call('DEL', key)
    stagingKeysDeleted = stagingKeysDeleted + 1
  end

  -- Phase 4: Clear ALL project-level transaction pointers conditionally (compare-and-delete)
  local pointersCleared = 0
  local pointersSkipped = 0
  for i = transactionKeyCount + stagingKeyCount + 1, #KEYS do
    local key = KEYS[i]
    local pointerIndex = i - transactionKeyCount - stagingKeyCount
    local expectedValue = pointerExpectedValues[pointerIndex]

    -- Only delete if the pointer still references the expected value
    if expectedValue then
      local currentValue = redis.call('GET', key)
      if currentValue == expectedValue then
        redis.call('DEL', key)
        pointersCleared = pointersCleared + 1
      else
        pointersSkipped = pointersSkipped + 1
      end
    else
      -- No expected value provided, skip this pointer
      pointersSkipped = pointersSkipped + 1
    end
  end

  return {'OK', transactionKeyCount, stagingKeysDeleted, pointersCleared, pointersSkipped}
`;

/**
 * P0 FIX: Atomic Lua script for batch transaction claiming
 *
 * This script atomically claims multiple transactions in ONE Redis operation:
 * 1. Validates ALL transactions exist
 * 2. Verifies ALL are in 'prepared' state
 * 3. Claims ALL with the same owner token
 * 4. Returns success only if ALL succeed
 *
 * CRITICAL: This eliminates partial claim scenarios where some transactions
 * are claimed while others fail, which would leave the batch in an inconsistent state.
 *
 * KEYS[1..N]: Transaction keys for all transactions in the batch
 *
 * ARGV[1]: owner - Claim token for the entire batch
 * ARGV[2]: transactionIdsJson - JSON array of transaction IDs for validation
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK', claimedCount] on success
 * ['ERR', errorCode, failedTransactionId, details] on failure
 */
const ATOMIC_BATCH_CLAIM_SCRIPT = `
  local owner = ARGV[1]
  local transactionIdsJson = ARGV[2]
  local transactionIds = cjson.decode(transactionIdsJson)
  local keyCount = #KEYS

  -- Validate that we have the right number of keys
  if keyCount ~= #transactionIds then
    return {'ERR', 'KEY_COUNT_MISMATCH', transactionIds[1], 'Expected ' .. #transactionIds .. ' keys, got ' .. keyCount}
  end

  -- Phase 1: Validate ALL transactions exist and are claimable
  for i = 1, keyCount do
    local key = KEYS[i]
    local transactionId = transactionIds[i]
    local current = redis.call('GET', key)

    if not current then
      return {'ERR', 'TRANSACTION_NOT_FOUND', transactionId, 'Transaction does not exist'}
    end

    local parsed = cjson.decode(current)

    -- Validate transaction ID identity
    if parsed.transactionId ~= transactionId then
      return {'ERR', 'TRANSACTION_ID_MISMATCH', transactionId, 'Transaction ID mismatch'}
    end

    -- Verify transaction is in prepared state
    if parsed.state ~= 'prepared' then
      return {'ERR', 'INVALID_STATE', transactionId, 'Transaction is in ' .. parsed.state .. ' state, expected prepared'}
    end

    -- Verify no other owner has claimed this transaction
    if parsed.owner and parsed.owner ~= '' then
      return {'ERR', 'ALREADY_CLAIMED', transactionId, 'Transaction already claimed by ' .. parsed.owner}
    end
  end

  -- Phase 2: Atomically claim ALL transactions
  for i = 1, keyCount do
    local key = KEYS[i]
    local current = redis.call('GET', key)
    local parsed = cjson.decode(current)

    -- Update to committing state with owner
    parsed.state = 'committing'
    parsed.owner = owner
    parsed.claimedAt = os.time()

    redis.call('SET', key, cjson.encode(parsed))
  end

  return {'OK', keyCount}
`;

/**
 * Atomic Lua script for state transition enforcement
 * Only operates on existing transactions - rejects if transaction doesn't exist
 * Prevents illegal transitions and concurrent claims
 *
 * CRITICAL: Atomically validates transaction identity before state transition
 *
 * Returns indexed array for proper RESP2 serialization:
 * ['OK'] on success
 * ['ERR', errorCode, details] on failure
 */
const STATE_TRANSITION_SCRIPT = `
  local key = KEYS[1]
  local transactionId = ARGV[1]
  local newState = ARGV[2]
  local owner = ARGV[3]
  local expectedParent = ARGV[4]
  local transactionData = ARGV[5]

  local current = redis.call('GET', key)

  -- REJECT if transaction doesn't exist (creation is separate)
  if not current then
    return {'ERR', 'TRANSACTION_NOT_FOUND'}
  end

  local parsed = cjson.decode(current)
  local currentState = parsed.state

  -- CRITICAL: Validate transaction ID identity
  if parsed.transactionId ~= transactionId then
    return {'ERR', 'TRANSACTION_ID_MISMATCH'}
  end

  -- Legal transition matrix
  local legalTransitions = {
    prepared = { committing = true },
    committing = { committed = true, failed = true },
    committed = { consumed = true },
    failed = { prepared = true },
    consumed = {}
  }

  -- Check if transition is legal
  if not legalTransitions[currentState] or not legalTransitions[currentState][newState] then
    return {'ERR', 'ILLEGAL_TRANSITION', currentState .. ' -> ' .. newState}
  end

  -- OWNER VERIFICATION: Only the owner who claimed can perform subsequent transitions
  if parsed.owner and parsed.owner ~= '' then
    if newState == 'committing' or newState == 'committed' or newState == 'consumed' then
      if owner ~= parsed.owner then
        return {'ERR', 'OWNER_MISMATCH', parsed.owner}
      end
    end
  end

  -- PARENT COMMIT VERIFICATION: Prevent committing against stale branch head
  -- Only enforce for committing → committed transition
  if currentState == 'committing' and newState == 'committed' then
    if expectedParent and expectedParent ~= '' then
      local currentParent = parsed.parentCommitSha or ''
      if currentParent ~= expectedParent then
        return {'ERR', 'PARENT_COMMIT_MISMATCH', currentParent}
      end
    end
  end

  -- prepared → committing: atomic claim check
  if currentState == 'prepared' and newState == 'committing' then
    if parsed.owner and parsed.owner ~= owner then
      return {'ERR', 'ALREADY_CLAIMED', parsed.owner}
    end
  end

  -- committing → committed: verify commit SHA is set
  if currentState == 'committing' and newState == 'committed' then
    local newParsed = cjson.decode(transactionData)
    if not newParsed.commitSha then
      return {'ERR', 'MISSING_COMMIT_SHA'}
    end
  end

  -- committing → failed: record failure reason and increment retryCount
  if currentState == 'committing' and newState == 'failed' then
    local newParsed = cjson.decode(transactionData)
    if not newParsed.failureReason then
      return {'ERR', 'MISSING_FAILURE_REASON'}
    end
    newParsed.retryCount = (parsed.retryCount or 0) + 1
    transactionData = cjson.encode(newParsed)
  end

  -- failed → prepared: increment retryCount for retry attempt
  if currentState == 'failed' and newState == 'prepared' then
    local newParsed = cjson.decode(transactionData)
    newParsed.retryCount = (parsed.retryCount or 0) + 1
    transactionData = cjson.encode(newParsed)
  end

  -- Update transaction
  redis.call('SET', key, transactionData)
  return {'OK'}
`;

/**
 * Create a new deployment transaction in prepared state (atomic create-or-merge)
 * Creates new transaction if absent, atomically merges staging keys if exists
 * This supports bulk assignments: multiple assignments share one transaction ID
 * @param transactionId - Unique transaction ID
 * @param stagingKeys - Staging keys to merge into transaction
 * @param files - Authority files in this transaction (immutable after creation)
 * @param reason - Deployment reason (immutable after creation)
 * @param parentCommitSha - Expected parent commit for concurrent safety
 * @returns Created or merged transaction
 */
export async function createDeploymentTransaction(
  transactionId: string,
  stagingKeys: string[],
  files: string[],
  reason?: string,
  parentCommitSha?: string
): Promise<DeploymentTransaction> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();

  const transaction: DeploymentTransaction = {
    transactionId,
    state: 'prepared',
    stagingKeys,
    files,
    reason,
    parentCommitSha,
    createdAt: new Date().toISOString(),
  };

  console.log('[DEPLOYMENT_TRANSACTION] CREATING_OR_MERGING', { transactionId, stagingKeysCount: stagingKeys.length, files });

  try {
    const result = await client.eval(
      CREATE_TRANSACTION_SCRIPT,
      [key],
      [JSON.stringify(transaction), JSON.stringify(stagingKeys)]
    );

    // Handle legacy error format (object with 'err' field)
    if (result && typeof result === 'object' && 'err' in result) {
      throw new Error(`Failed to create/merge transaction: ${normalizeRedisError((result as any).err)}`);
    }

    // Handle indexed array return format: ['OK', transactionData, count] or ['ERR', errorCode, details]
    if (Array.isArray(result) && result.length >= 1) {
      const status = result[0];
      
      if (status === 'OK') {
        // Transaction was created or merged successfully
        if (result.length >= 2) {
          const transactionData = result[1];
          const stagingKeysCount = result[2];
          
          // P0 FIX: Use authoritative decoder for Redis object/string contract
          const parsed = parseTransactionValue(transactionData);
          console.log('[DEPLOYMENT_TRANSACTION] CREATED_OR_MERGED', {
            transactionId,
            state: parsed.state,
            totalStagingKeys: stagingKeysCount,
            newKeysAdded: stagingKeys.length
          });
          return parsed;
        }
        
        // Simple creation (no merge)
        console.log('[DEPLOYMENT_TRANSACTION] CREATED', { transactionId, stagingKeysCount: stagingKeys.length });
        return transaction;
      }
      
      if (status === 'ERR') {
        const errorCode = result[1];
        throw new Error(`Failed to create/merge transaction: ${errorCode}`);
      }
    }

    // Legacy format (should not occur with new script)
    if (result && typeof result === 'object' && 'ok' in result && (result as any).ok === 'CREATED') {
      console.log('[DEPLOYMENT_TRANSACTION] CREATED (legacy)', { transactionId, stagingKeysCount: stagingKeys.length });
      return transaction;
    }

    if (result && typeof result === 'object' && 'ok' in result && (result as any).ok === 'MERGED') {
      // P0 FIX: Use authoritative decoder for Redis object/string contract
      const merged = parseTransactionValue((result as any).data);
      const stagingKeysCount = (result as any).stagingKeysCount;
      console.log('[DEPLOYMENT_TRANSACTION] MERGED_STAGING_KEYS (legacy)', {
        transactionId,
        state: merged.state,
        totalStagingKeys: stagingKeysCount,
        newKeysAdded: stagingKeys.length
      });
      return merged;
    }

    if (result && typeof result === 'object' && 'ok' in result && (result as any).ok === 'EXISTS') {
      // P0 FIX: Use authoritative decoder for Redis object/string contract
      const existing = parseTransactionValue((result as any).data);
      console.log('[DEPLOYMENT_TRANSACTION] RETURNED_EXISTING (legacy)', { transactionId, state: existing.state });
      return existing;
    }

    console.log('[DEPLOYMENT_TRANSACTION] CREATED (fallback)', { transactionId });
    return transaction;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] CREATE_OR_MERGE_FAILED', { transactionId, error });
    throw error;
  }
}

/**
 * Claim a transaction for deployment (prepared → committing)
 * @param transactionId - Transaction ID
 * @param owner - Claim token (e.g., session ID or request ID)
 * @returns Updated transaction
 */
export async function claimDeploymentTransaction(
  transactionId: string,
  owner: string
): Promise<DeploymentTransaction> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();
  
  console.log('[DEPLOYMENT_TRANSACTION] CLAIMING', { transactionId, owner });
  
  try {
    const current = await client.get<DeploymentTransaction>(key);
    if (!current) {
      throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
    }
    
    const updated: DeploymentTransaction = {
      ...current,
      state: 'committing',
      owner,
      claimedAt: new Date().toISOString(),
    };
    
    const result = await client.eval(
      STATE_TRANSITION_SCRIPT,
      [key],
      [
        transactionId,
        'committing',
        owner,
        current.parentCommitSha || '',
        JSON.stringify(updated),
      ]
    );

    // Parse indexed array return format: ['OK'] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 1) {
      throw new Error('Invalid response from state transition script');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const details = result[2];

      if (errorCode === 'ALREADY_CLAIMED') {
        throw new Error(`Transaction already claimed by another process: ${transactionId}`);
      }
      if (errorCode === 'TRANSACTION_NOT_FOUND') {
        throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
      }
      throw new Error(`Failed to claim transaction: ${errorCode}`);
    }

    console.log('[DEPLOYMENT_TRANSACTION] CLAIMED', { transactionId, owner });
    return updated;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] CLAIM_FAILED', { transactionId, owner, error });
    throw error;
  }
}

/**
 * P0 FIX: Persist Git commit SHA BEFORE Redis promotion
 * This enables Git/Redis split-brain recovery: if Redis promotion fails,
 * the transaction already has commitSha and can retry Redis promotion
 * against the same Git commit without creating a new commit.
 * 
 * This is an idempotent metadata update within the committing state.
 * Uses dedicated METADATA_UPDATE_SCRIPT to avoid illegal transition error.
 * 
 * Security guarantees:
 * - Transaction must exist and be in committing state
 * - Owner must match (if owner is set)
 * - Idempotent: allows same commitSha to be set multiple times
 * - CAS semantics: rejects conflicting commitSha
 * - State remains unchanged (no transition)
 * 
 * @param transactionId - Transaction ID
 * @param commitSha - Git commit SHA
 * @param commitUrl - Git commit URL
 * @param owner - Transaction owner (for ownership verification)
 * @returns Updated transaction with commitSha persisted
 */
export async function setGitCommitSha(
  transactionId: string,
  commitSha: string,
  commitUrl: string,
  owner?: string
): Promise<DeploymentTransaction> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();
  
  console.log('[DEPLOYMENT_TRANSACTION] PERSISTING_COMMIT_SHA', { transactionId, commitSha, owner });
  
  try {
    const current = await client.get<DeploymentTransaction>(key);
    if (!current) {
      throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
    }
    
    // Must be in committing state to persist commitSha
    if (current.state !== 'committing') {
      throw new Error(`Transaction must be in committing state to persist commitSha. Current state: ${current.state}`);
    }
    
    // Use current owner if not provided (for backward compatibility)
    const effectiveOwner = owner || current.owner;
    
    const updated: DeploymentTransaction = {
      ...current,
      commitSha,
      commitUrl,
      // State remains committing - no transition
    };
    
    const result = await client.eval(
      METADATA_UPDATE_SCRIPT,
      [key],
      [
        transactionId,
        'committing', // Expected current state
        effectiveOwner || '',
        commitSha,
        commitUrl,
        JSON.stringify(updated),
      ]
    );

    // Parse indexed array return format: ['OK'] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 1) {
      throw new Error('Invalid response from metadata update script');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const details = result[2];

      if (errorCode === 'OWNER_MISMATCH') {
        throw new Error(`Ownership verification failed: ${details}`);
      }
      if (errorCode === 'TRANSACTION_NOT_FOUND') {
        throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
      }
      if (errorCode === 'INVALID_STATE') {
        throw new Error(`Invalid state for metadata update: ${details}`);
      }
      if (errorCode === 'CAS_FAILURE') {
        throw new Error(`CAS failure: ${details}`);
      }
      throw new Error(`Failed to persist commitSha: ${errorCode}`);
    }

    console.log('[DEPLOYMENT_TRANSACTION] COMMIT_SHA_PERSISTED', { transactionId, commitSha });
    return updated;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] PERSIST_COMMIT_SHA_FAILED', { transactionId, error });
    throw error;
  }
}

/**
 * Mark transaction as committed (committing → committed)
 * commitSha must already be set via setGitCommitSha()
 * @param transactionId - Transaction ID
 * @param owner - Owner token for ownership verification
 * @returns Updated transaction
 */
export async function commitDeploymentTransaction(
  transactionId: string,
  owner?: string
): Promise<DeploymentTransaction> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();
  
  console.log('[DEPLOYMENT_TRANSACTION] COMMITTING', { transactionId, owner });
  
  try {
    const current = await client.get<DeploymentTransaction>(key);
    if (!current) {
      throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
    }
    
    // P0 FIX: commitSha must already be set via setGitCommitSha()
    if (!current.commitSha) {
      throw new Error(`Transaction must have commitSha set before committing. Call setGitCommitSha() first.`);
    }
    
    // Use current owner if not provided (for backward compatibility)
    const effectiveOwner = owner || current.owner;
    
    const updated: DeploymentTransaction = {
      ...current,
      state: 'committed',
      committedAt: new Date().toISOString(),
      // commitSha and commitUrl are already set
    };
    
    const result = await client.eval(
      STATE_TRANSITION_SCRIPT,
      [key],
      [
        transactionId,
        'committed',
        effectiveOwner || '',
        current.parentCommitSha || '',
        JSON.stringify(updated),
      ]
    );

    // Parse indexed array return format: ['OK'] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 1) {
      throw new Error('Invalid response from state transition script');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const details = result[2];

      if (errorCode === 'OWNER_MISMATCH') {
        throw new Error(`Ownership verification failed: ${details}`);
      }
      if (errorCode === 'TRANSACTION_NOT_FOUND') {
        throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
      }
      if (errorCode === 'ILLEGAL_TRANSITION') {
        throw new Error(`Invalid state transition: ${details}`);
      }
      if (errorCode === 'MISSING_COMMIT_SHA') {
        throw new Error(`commitSha must be set before committing`);
      }
      throw new Error(`Failed to commit transaction: ${errorCode}`);
    }
    
    console.log('[DEPLOYMENT_TRANSACTION] COMMITTED', { transactionId, commitSha: current.commitSha, owner: effectiveOwner });
    return updated;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] COMMIT_FAILED', { transactionId, error });
    throw error;
  }
}

/**
 * P0 FIX: Atomic batch transaction claiming
 *
 * Claims multiple transactions in ONE Redis operation, ensuring:
 * - ALL transactions exist
 * - ALL are in 'prepared' state
 * - ALL are claimed with the same owner
 * - NO partial claims if any transaction fails validation
 *
 * This eliminates the race condition where some transactions are claimed
 * while others fail, which would leave the batch in an inconsistent state.
 *
 * @param transactionIds - Array of transaction IDs to claim
 * @param owner - Claim token for the entire batch
 * @returns Array of claimed transactions
 * @throws Error if any transaction fails validation
 */
export async function claimBatchDeploymentTransactions(
  transactionIds: string[],
  owner: string
): Promise<DeploymentTransaction[]> {
  const client = getRedisClient();
  const namespace = getKvNamespace();

  console.log('[DEPLOYMENT_TRANSACTION] ATOMIC_BATCH_CLAIMING', { 
    transactionIds, 
    transactionCount: transactionIds.length,
    owner,
    namespace
  });

  // Build KEYS array: all transaction keys
  const transactionKeys = transactionIds.map(id => `${namespace}${TRANSACTION_PREFIX}${id}`);

  console.log('[DEPLOYMENT_TRANSACTION] TRANSACTION_KEYS', {
    transactionKeys,
    keyCount: transactionKeys.length,
    expectedKeyCount: transactionIds.length
  });

  // P0 FIX: Forensic - check transaction states before claiming
  for (const transactionId of transactionIds) {
    const key = `${namespace}${TRANSACTION_PREFIX}${transactionId}`;
    try {
      const current = await client.get(key);
      console.log('[DEPLOYMENT_TRANSACTION] TRANSACTION_STATE_CHECK', {
        transactionId,
        key,
        exists: !!current,
        dataType: typeof current,
        parsed: current ? (typeof current === 'string' ? JSON.parse(current) : current) : null
      });
    } catch (error) {
      console.error('[DEPLOYMENT_TRANSACTION] TRANSACTION_STATE_CHECK_ERROR', {
        transactionId,
        key,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  try {
    const result = await client.eval(
      ATOMIC_BATCH_CLAIM_SCRIPT,
      transactionKeys, // KEYS array
      [owner, JSON.stringify(transactionIds)] // ARGV array
    );

    console.log('[DEPLOYMENT_TRANSACTION] LUA_RESULT', {
      result,
      resultType: typeof result,
      isArray: Array.isArray(result),
      resultLength: Array.isArray(result) ? result.length : 'N/A'
    });

    // Parse indexed array return format: ['OK', count] or ['ERR', errorCode, failedTransactionId, details]
    if (!Array.isArray(result) || result.length < 2) {
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_CLAIM_INVALID_RETURN', {
        transactionIds,
        result,
        reason: 'Lua script did not return indexed array'
      });
      throw new Error('Invalid Lua script return format for batch claim');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const failedTransactionId = result[2];
      const details = result[3];
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_CLAIM_FAILED', {
        transactionIds,
        errorCode,
        failedTransactionId,
        details,
        result
      });
      throw new Error(`Batch claim failed: ${errorCode} for transaction ${failedTransactionId}: ${details}`);
    }

    // Success: ['OK', count]
    const claimedCount = result[1];
    console.log('[DEPLOYMENT_TRANSACTION] BATCH_CLAIM_SUCCESS', {
      transactionIds,
      claimedCount
    });

    // Fetch all claimed transactions to return them
    const claimedTransactions: DeploymentTransaction[] = [];
    for (const transactionId of transactionIds) {
      const key = getTransactionKey(transactionId);
      const current = await client.get<DeploymentTransaction>(key);
      if (current) {
        claimedTransactions.push(parseTransactionValue(current));
      }
    }

    return claimedTransactions;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] BATCH_CLAIM_ERROR', {
      transactionIds,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * P0 FIX: Atomic batch Git commit SHA assignment
 *
 * Assigns the same Git commit SHA to multiple transactions in ONE Redis operation.
 * This ensures all transactions participating in a batch deployment have identical
 * provenance information.
 *
 * @param transactionIds - Array of transaction IDs to update
 * @param commitSha - Git commit SHA
 * @param commitUrl - Git commit URL
 * @param owner - Transaction owner (for ownership verification)
 * @returns Array of updated transactions
 */
export async function setBatchGitCommitSha(
  transactionIds: string[],
  commitSha: string,
  commitUrl: string,
  owner?: string
): Promise<DeploymentTransaction[]> {
  const client = getRedisClient();
  const namespace = getKvNamespace();

  console.log('[DEPLOYMENT_TRANSACTION] ATOMIC_BATCH_PERSISTING_COMMIT_SHA', { 
    transactionIds, 
    commitSha, 
    owner 
  });

  // Build KEYS array: all transaction keys
  const transactionKeys = transactionIds.map(id => `${namespace}${TRANSACTION_PREFIX}${id}`);

  try {
    const result = await client.eval(
      ATOMIC_BATCH_SET_COMMIT_SHA_SCRIPT,
      transactionKeys, // KEYS array
      [commitSha, commitUrl, owner || '', JSON.stringify(transactionIds)] // ARGV array
    );

    // Parse indexed array return format: ['OK', count] or ['ERR', errorCode, failedTransactionId, details]
    if (!Array.isArray(result) || result.length < 2) {
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_SHA_INVALID_RETURN', {
        transactionIds,
        result,
        reason: 'Lua script did not return indexed array'
      });
      throw new Error('Invalid Lua script return format for batch SHA assignment');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const failedTransactionId = result[2];
      const details = result[3];
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_SHA_FAILED', {
        transactionIds,
        errorCode,
        failedTransactionId,
        details
      });
      throw new Error(`Batch SHA assignment failed: ${errorCode} for transaction ${failedTransactionId}: ${details}`);
    }

    // Success: ['OK', count]
    const assignedCount = result[1];
    console.log('[DEPLOYMENT_TRANSACTION] BATCH_SHA_PERSISTED', {
      transactionIds,
      commitSha,
      assignedCount
    });

    // Fetch all updated transactions to return them
    const updatedTransactions: DeploymentTransaction[] = [];
    for (const transactionId of transactionIds) {
      const key = getTransactionKey(transactionId);
      const current = await client.get<DeploymentTransaction>(key);
      if (current) {
        updatedTransactions.push(parseTransactionValue(current));
      }
    }

    return updatedTransactions;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] BATCH_SHA_ERROR', {
      transactionIds,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * P0 FIX: Atomic batch transaction commit
 *
 * Marks multiple transactions as committed in ONE Redis operation, ensuring:
 * - ALL transactions exist
 * - ALL are in 'committing' state
 * - ALL have the same commitSha
 * - ALL transition to 'committed' together
 *
 * @param transactionIds - Array of transaction IDs to commit
 * @param commitSha - Expected commit SHA that all transactions must have
 * @param owner - Owner token for ownership verification
 * @returns Array of committed transactions
 */
export async function commitBatchDeploymentTransactions(
  transactionIds: string[],
  commitSha: string,
  owner?: string
): Promise<DeploymentTransaction[]> {
  const client = getRedisClient();
  const namespace = getKvNamespace();

  console.log('[DEPLOYMENT_TRANSACTION] ATOMIC_BATCH_COMMITTING', { 
    transactionIds, 
    commitSha,
    owner 
  });

  // Build KEYS array: all transaction keys
  const transactionKeys = transactionIds.map(id => `${namespace}${TRANSACTION_PREFIX}${id}`);

  try {
    const result = await client.eval(
      ATOMIC_BATCH_COMMIT_SCRIPT,
      transactionKeys, // KEYS array
      [commitSha, owner || '', JSON.stringify(transactionIds)] // ARGV array
    );

    // Parse indexed array return format: ['OK', count] or ['ERR', errorCode, failedTransactionId, details]
    if (!Array.isArray(result) || result.length < 2) {
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_COMMIT_INVALID_RETURN', {
        transactionIds,
        result,
        reason: 'Lua script did not return indexed array'
      });
      throw new Error('Invalid Lua script return format for batch commit');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const failedTransactionId = result[2];
      const details = result[3];
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_COMMIT_FAILED', {
        transactionIds,
        errorCode,
        failedTransactionId,
        details
      });
      throw new Error(`Batch commit failed: ${errorCode} for transaction ${failedTransactionId}: ${details}`);
    }

    // Success: ['OK', count]
    const committedCount = result[1];
    console.log('[DEPLOYMENT_TRANSACTION] BATCH_COMMITTED', {
      transactionIds,
      commitSha,
      committedCount
    });

    // Fetch all committed transactions to return them
    const committedTransactions: DeploymentTransaction[] = [];
    for (const transactionId of transactionIds) {
      const key = getTransactionKey(transactionId);
      const current = await client.get<DeploymentTransaction>(key);
      if (current) {
        committedTransactions.push(parseTransactionValue(current));
      }
    }

    return committedTransactions;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] BATCH_COMMIT_ERROR', {
      transactionIds,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * P0 FIX: Atomic batch staging promotion
 *
 * Promotes ALL staging keys from ALL transactions in ONE Redis operation,
 * ensuring:
 * - ALL transactions exist and are in committing state
 * - ALL transactions have the same owner
 * - ALL transactions have the same commit SHA
 * - ALL expected revisions match current runtime state
 * - ALL assignments are promoted atomically
 * - NO partial promotion where some succeed and others fail
 *
 * @param assignments - Array of assignments to promote
 * @param transactionIds - Array of transaction IDs for validation
 * @param expectedCommitSha - Expected commit SHA that all transactions must have
 * @param owner - Owner token for verification
 * @returns Promotion result with count
 */
export async function promoteBatchDeployment(
  assignments: Array<{ serviceSlug: string; mediaId: string; expectedRevision: number; updatedAt: string; source: string }>,
  transactionIds: string[],
  expectedCommitSha: string,
  owner?: string
): Promise<{ success: boolean; count: number; error?: string; failedServiceSlug?: string }> {
  const client = getRedisClient();
  const namespace = getKvNamespace();

  console.log('[DEPLOYMENT_TRANSACTION] ATOMIC_BATCH_PROMOTING', {
    transactionIds,
    assignmentCount: assignments.length,
    expectedCommitSha,
    owner
  });

  // Build KEYS array: transaction keys + all assignment keys
  const transactionKeys = transactionIds.map(id => `${namespace}${TRANSACTION_PREFIX}${id}`);
  const assignmentKeys = assignments.map(a => `${namespace}service-card-assignment:${a.serviceSlug}`);
  const keys = [...transactionKeys, ...assignmentKeys];

  try {
    const result = await client.eval(
      ATOMIC_BATCH_PROMOTE_SCRIPT,
      keys, // KEYS array
      [String(transactionIds.length), JSON.stringify(transactionIds), expectedCommitSha, owner || '', JSON.stringify(assignments)] // ARGV array
    );

    // Parse indexed array return format: ['OK', count] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 2) {
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_PROMOTE_INVALID_RETURN', {
        transactionIds,
        result,
        reason: 'Lua script did not return indexed array'
      });
      return {
        success: false,
        count: 0,
        error: 'INVALID_LUA_RETURN',
      };
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const failedTransactionId = result[2];
      const details = result[3];
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_PROMOTE_FAILED', {
        transactionIds,
        errorCode,
        failedTransactionId,
        details
      });

      return {
        success: false,
        count: 0,
        error: errorCode,
        failedServiceSlug: typeof details === 'string' ? details : undefined,
      };
    }

    // Success: ['OK', count]
    const count = result[1];
    console.log('[DEPLOYMENT_TRANSACTION] BATCH_PROMOTE_SUCCESS', {
      transactionIds,
      count
    });

    return {
      success: true,
      count: count || 0,
    };
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] BATCH_PROMOTE_ERROR', {
      transactionIds,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      count: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * P0 FIX: Atomic batch transaction consume with staging cleanup
 *
 * Marks multiple transactions as consumed and deletes ALL staging keys
 * in ONE Redis operation, ensuring:
 * - ALL transactions exist and are in 'committed' state
 * - ALL transition to 'consumed' together
 * - ALL staging keys are deleted atomically
 * - ALL project-level pointers are cleared atomically
 *
 * @param transactionIds - Array of transaction IDs to consume
 * @param stagingKeys - All staging keys to delete
 * @param pointerKeys - All project-level transaction pointers to clear
 * @param owner - Owner token for ownership verification
 * @returns Array of consumed transactions
 */
export async function consumeBatchDeploymentTransactions(
  transactionIds: string[],
  stagingKeys: string[],
  pointerKeys: string[],
  pointerExpectedValues: string[],
  owner?: string
): Promise<DeploymentTransaction[]> {
  const client = getRedisClient();
  const namespace = getKvNamespace();

  console.log('[DEPLOYMENT_TRANSACTION] ATOMIC_BATCH_CONSUMING', { 
    transactionIds, 
    stagingKeyCount: stagingKeys.length,
    pointerKeyCount: pointerKeys.length,
    owner
  });

  // Build KEYS array: transaction keys + staging keys + pointer keys
  const transactionKeys = transactionIds.map(id => `${namespace}${TRANSACTION_PREFIX}${id}`);
  const stagingKeyKeys = stagingKeys.map(key => {
    // Staging keys are already namespaced, use as-is
    return key;
  });
  const pointerKeyKeys = pointerKeys.map(key => {
    // Pointer keys are already namespaced, use as-is
    return key;
  });
  const keys = [...transactionKeys, ...stagingKeyKeys, ...pointerKeyKeys];

  try {
    const result = await client.eval(
      ATOMIC_BATCH_CONSUME_SCRIPT,
      keys, // KEYS array
      [owner || '', JSON.stringify(transactionIds), String(stagingKeys.length), String(pointerKeys.length), String(transactionIds.length), JSON.stringify(pointerExpectedValues)] // ARGV array
    );

    // Parse indexed array return format: ['OK', transactionCount, stagingKeyCount, pointerKeyCount, pointersSkipped] or ['ERR', errorCode, failedTransactionId, details]
    if (!Array.isArray(result) || result.length < 2) {
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_CONSUME_INVALID_RETURN', {
        transactionIds,
        result,
        reason: 'Lua script did not return indexed array'
      });
      throw new Error('Invalid Lua script return format for batch consume');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const failedTransactionId = result[2];
      const details = result[3];
      console.error('[DEPLOYMENT_TRANSACTION] BATCH_CONSUME_FAILED', {
        transactionIds,
        errorCode,
        failedTransactionId,
        details
      });
      throw new Error(`Batch consume failed: ${errorCode} for transaction ${failedTransactionId}: ${details}`);
    }

    // Success: ['OK', transactionCount, stagingKeyCount, pointerKeyCount]
    const consumedCount = result[1];
    const stagingKeysDeleted = result[2];
    const pointersCleared = result[3];
    console.log('[DEPLOYMENT_TRANSACTION] BATCH_CONSUMED', {
      transactionIds,
      consumedCount,
      stagingKeysDeleted,
      pointersCleared
    });

    // Fetch all consumed transactions to return them
    const consumedTransactions: DeploymentTransaction[] = [];
    for (const transactionId of transactionIds) {
      const key = getTransactionKey(transactionId);
      const current = await client.get<DeploymentTransaction>(key);
      if (current) {
        consumedTransactions.push(parseTransactionValue(current));
      }
    }

    return consumedTransactions;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] BATCH_CONSUME_ERROR', {
      transactionIds,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Mark transaction as consumed after staging cleanup (committed → consumed)
 * @param transactionId - Transaction ID
 * @param owner - Owner token for ownership verification
 * @param projectId - Optional project ID to clear project-level transaction pointer
 * @returns Updated transaction
 */
export async function consumeDeploymentTransaction(
  transactionId: string,
  owner?: string,
  projectId?: string
): Promise<DeploymentTransaction> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();
  
  console.log('[DEPLOYMENT_TRANSACTION] CONSUMING', { transactionId, owner, projectId });
  
  try {
    const current = await client.get<DeploymentTransaction>(key);
    if (!current) {
      throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
    }
    
    // Use current owner if not provided (for backward compatibility)
    const effectiveOwner = owner || current.owner;
    
    const updated: DeploymentTransaction = {
      ...current,
      state: 'consumed',
      consumedAt: new Date().toISOString(),
    };
    
    const result = await client.eval(
      STATE_TRANSITION_SCRIPT,
      [key],
      [
        transactionId,
        'consumed',
        effectiveOwner || '',
        current.parentCommitSha || '',
        JSON.stringify(updated),
      ]
    );

    // Parse indexed array return format: ['OK'] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 1) {
      throw new Error('Invalid response from state transition script');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const details = result[2];

      if (errorCode === 'OWNER_MISMATCH') {
        throw new Error(`Ownership verification failed: ${details}`);
      }
      if (errorCode === 'TRANSACTION_NOT_FOUND') {
        throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
      }
      throw new Error(`Failed to consume transaction: ${errorCode}`);
    }

    console.log('[DEPLOYMENT_TRANSACTION] CONSUMED', { transactionId, owner: effectiveOwner });
    
    // P0 FIX: Conditional atomic cleanup of project-level transaction pointer
    // This prevents race conditions where consuming transaction A deletes the pointer
    // while transaction B has already become the current transaction
    if (projectId && client) {
      const namespace = getKvNamespace();
      const projectStagingKey = `${namespace}workbench-staging:project:${projectId}:current-transaction`;
      
      console.log('[DEPLOYMENT_TRANSACTION] CONDITIONAL_POINTER_CLEANUP', {
        projectId,
        projectStagingKey,
        currentTransactionId: transactionId,
      });
      
      const cleanupResult = await client.eval(
        CONDITIONAL_POINTER_CLEANUP_SCRIPT,
        [projectStagingKey],
        [transactionId]
      );
      
      console.log('[DEPLOYMENT_TRANSACTION] POINTER_CLEANUP_RESULT', {
        projectId,
        result: cleanupResult,
      });
    }
    
    return updated;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] CONSUME_FAILED', { transactionId, error });
    throw error;
  }
}

/**
 * Mark transaction as failed (committing → failed)
 * @param transactionId - Transaction ID
 * @param failureReason - Reason for failure
 * @returns Updated transaction
 */
export async function failDeploymentTransaction(
  transactionId: string,
  failureReason: string
): Promise<DeploymentTransaction> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();
  
  console.log('[DEPLOYMENT_TRANSACTION] FAILING', { transactionId, failureReason });
  
  try {
    const current = await client.get<DeploymentTransaction>(key);
    if (!current) {
      console.warn('[DEPLOYMENT_TRANSACTION] FAIL_TRANSACTION_NOT_FOUND', { transactionId, failureReason });
      // If transaction doesn't exist, we can't fail it - this is acceptable for cleanup scenarios
      throw new Error(`Transaction not found: ${transactionId}. Cannot fail non-existent transaction.`);
    }
    
    // P0 FIX: Let Lua script be the single authoritative increment point for retryCount
    // The STATE_TRANSITION_SCRIPT increments retryCount for committing → failed
    // Do NOT increment here to avoid double increment
    const updated: DeploymentTransaction = {
      ...current,
      state: 'failed',
      failureReason,
      failedAt: new Date().toISOString(),
    };
    
    const result = await client.eval(
      STATE_TRANSITION_SCRIPT,
      [key],
      [
        transactionId,
        'failed',
        current.owner || '',
        current.parentCommitSha || '',
        JSON.stringify(updated),
      ]
    );

    // Parse indexed array return format: ['OK'] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 1) {
      throw new Error('Invalid response from state transition script');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const details = result[2];

      if (errorCode === 'TRANSACTION_NOT_FOUND') {
        throw new Error(`Transaction not found: ${transactionId}. Use createDeploymentTransaction first.`);
      }
      throw new Error(`Failed to fail transaction: ${errorCode}`);
    }

    // P0 FIX: Read back transaction to get actual Lua-incremented retryCount
    // Lua script increments retryCount, so we must read it back from Redis
    const finalTransaction = await client.get<DeploymentTransaction>(key);
    console.log('[DEPLOYMENT_TRANSACTION] FAILED', { transactionId, failureReason, retryCount: finalTransaction?.retryCount });
    return finalTransaction || updated;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] FAIL_OPERATION_FAILED', { transactionId, error });
    throw error;
  }
}

/**
 * Retry a failed transaction (failed → prepared)
 * Allows recovery from Git/Redis split-brain failures
 * @param transactionId - Transaction ID
 * @returns Updated transaction in prepared state
 */
export async function retryDeploymentTransaction(transactionId: string): Promise<DeploymentTransaction> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();

  console.log('[DEPLOYMENT_TRANSACTION] RETRYING', { transactionId });

  try {
    let current = await client.get<DeploymentTransaction>(key);
    if (!current) {
      throw new Error(`Transaction not found: ${transactionId}. Cannot retry non-existent transaction.`);
    }
    
    // P0 FIX: Add crash recovery for stale committing transactions
    // If a transaction has been in committing state for too long (> 5 minutes),
    // it likely crashed after promotion but before Git commit
    const COMMITTING_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    if (current.state === 'committing') {
      const claimedAt = current.claimedAt ? new Date(current.claimedAt).getTime() : 0;
      const now = Date.now();
      const timeInCommitting = now - claimedAt;
      
      if (timeInCommitting > COMMITTING_TIMEOUT_MS) {
        console.warn('[DEPLOYMENT_TRANSACTION] STALE_COMMITTING_TRANSACTION_DETECTED', {
          transactionId,
          timeInCommitting,
          claimedAt: current.claimedAt,
          owner: current.owner,
        });
        
        // P0 FIX: Fail stale committing transactions to allow recovery
        // This prevents permanent wedging from crashes after promotion
        const failed: DeploymentTransaction = {
          ...current,
          state: 'failed',
          failedAt: new Date().toISOString(),
          failureReason: 'STALE_COMMITTING_TIMEOUT: Transaction in committing state for too long, likely crashed after promotion',
        };
        
        await client.set(key, failed);
        console.log('[DEPLOYMENT_TRANSACTION] STALE_COMMITTING_FAILED', { transactionId });

        // P0 FIX: Re-read transaction from Redis to get authoritative state after transition
        // The in-memory 'current' object is stale after we write the failed state
        current = await client.get<DeploymentTransaction>(key);
        if (!current) {
          throw new Error(`Transaction disappeared after stale committing recovery: ${transactionId}`);
        }

        // Continue to retry path now that it's in failed state
      } else {
        throw new Error(`Transaction is in committing state but not yet timed out (${timeInCommitting}ms < ${COMMITTING_TIMEOUT_MS}ms). Cannot retry actively committing transaction.`);
      }
    }

    // Check if retry is allowed
    if (current.state !== 'failed') {
      throw new Error(`Transaction must be in failed state to retry. Current state: ${current.state}`);
    }
    
    // Check if max retries exceeded
    const MAX_RETRIES = 3;
    if ((current.retryCount || 0) >= MAX_RETRIES) {
      throw new Error(`Transaction has exceeded maximum retry count (${MAX_RETRIES}). Terminal failure.`);
    }
    
    // Reset to prepared state, preserving all other fields
    // P0 FIX: Lua script now handles retryCount increment for failed → prepared
    // Do NOT increment here to avoid double increment
    const updated: DeploymentTransaction = {
      ...current,
      state: 'prepared',
      owner: undefined, // Clear owner so deploy can claim it again
      failureReason: undefined, // Clear previous failure reason
      failedAt: undefined,
    };
    
    const result = await client.eval(
      STATE_TRANSITION_SCRIPT,
      [key],
      [
        transactionId,
        'prepared',
        '', // No owner for prepared state
        current.parentCommitSha || '',
        JSON.stringify(updated),
      ]
    );

    // Parse indexed array return format: ['OK'] or ['ERR', errorCode, details]
    if (!Array.isArray(result) || result.length < 1) {
      throw new Error('Invalid response from state transition script');
    }

    const status = result[0];
    if (status === 'ERR') {
      const errorCode = result[1];
      const details = result[2];

      if (errorCode === 'ILLEGAL_TRANSITION') {
        throw new Error(`Cannot retry transaction: ${details}`);
      }
      throw new Error(`Failed to retry transaction: ${errorCode}`);
    }

    // P0 FIX: Read back transaction to get actual Lua-incremented retryCount
    // Lua script increments retryCount for failed → prepared
    const finalTransaction = await client.get<DeploymentTransaction>(key);
    console.log('[DEPLOYMENT_TRANSACTION] RETRIED', {
      transactionId, 
      retryCount: finalTransaction?.retryCount,
      stagingKeysCount: finalTransaction?.stagingKeys.length 
    });
    return finalTransaction || updated;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] RETRY_FAILED', { transactionId, error });
    throw error;
  }
}

/**
 * Get deployment transaction by ID (idempotent read)
 * @param transactionId - Transaction ID
 * @returns Transaction or null
 */
export async function getDeploymentTransaction(transactionId: string): Promise<DeploymentTransaction | null> {
  const key = getTransactionKey(transactionId);
  const client = getRedisClient();
  
  try {
    const transaction = await client.get<DeploymentTransaction>(key);
    return transaction;
  } catch (error) {
    console.error('[DEPLOYMENT_TRANSACTION] GET_FAILED', { transactionId, error });
    throw error;
  }
}

/**
 * Check if transaction is in a terminal state (committed, consumed, or failed with max retries)
 * @param transactionId - Transaction ID
 * @returns True if terminal
 */
export async function isTransactionTerminal(transactionId: string): Promise<boolean> {
  const transaction = await getDeploymentTransaction(transactionId);
  if (!transaction) return false;
  
  if (transaction.state === 'committed' || transaction.state === 'consumed') {
    return true;
  }
  
  if (transaction.state === 'failed' && (transaction.retryCount || 0) >= 3) {
    return true;
  }
  
  return false;
}

/**
 * Clean up old transactions (maintenance operation)
 * @param olderThanHours - Delete transactions older than this many hours
 * @returns Count of deleted transactions
 */
export async function cleanupOldTransactions(olderThanHours: number = 24): Promise<number> {
  const client = getRedisClient();
  const keys: string[] = [];
  let cursor = '0';
  
  do {
    const namespace = getKvNamespace();
    const result = await client.scan(cursor, { match: `${namespace}${TRANSACTION_PREFIX}*`, count: 100 });
    cursor = result[0];
    keys.push(...result[1]);
  } while (cursor !== '0');
  
  const cutoff = Date.now() - (olderThanHours * 60 * 60 * 1000);
  let deletedCount = 0;
  
  for (const key of keys) {
    try {
      const transaction = await client.get<DeploymentTransaction>(key);
      if (!transaction) continue;
      
      const createdAt = new Date(transaction.createdAt).getTime();
      if (createdAt < cutoff && (transaction.state === 'consumed' || transaction.state === 'failed')) {
        await client.del(key);
        deletedCount++;
      }
    } catch (error) {
      console.error('[DEPLOYMENT_TRANSACTION] CLEANUP_ERROR', { key, error });
    }
  }
  
  console.log('[DEPLOYMENT_TRANSACTION] CLEANUP_COMPLETE', { deletedCount, cutoff });
  return deletedCount;
}
