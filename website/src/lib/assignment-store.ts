/**
 * Service Card Assignment Store
 *
 * Provides persistent storage for service card media assignments.
 * Stores assignments independently of static services.v1.json configuration.
 * Uses Upstash Redis for durable runtime storage.
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    // Credential source investigation
    const credentialSource = {
      urlVariable: 'KV_REST_API_URL',
      tokenVariable: 'KV_REST_API_TOKEN',
    };
    
    // Manual credentials, with fallback to Upstash Vercel-integration names.
    // Previously the integration names were logged but never used, so deployments
    // relying on the integration (KV_REST_API__* prefix) hit "Missing required
    // environment variables" and every assignment route 500'd. Fail-closed:
    // still throws if BOTH sources are absent.
    let url = process.env.KV_REST_API_URL;
    let token = process.env.KV_REST_API_TOKEN;
    
    // Check integration-generated variables (used as fallback below)
    const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
    const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;
    const readOnlyToken = process.env.KV_REST_API__KV_REST_API_READ_ONLY_TOKEN;
    
    if (!url && integrationUrl) url = integrationUrl;
    if (!token && integrationToken) token = integrationToken;
    
    // Generate safe fingerprints
    const urlFingerprint = url ? createHash(url) : 'none';
    const tokenFingerprint = token ? createHash(token) : 'none';
    const integrationUrlFingerprint = integrationUrl ? createHash(integrationUrl) : 'none';
    const integrationTokenFingerprint = integrationToken ? createHash(integrationToken) : 'none';
    const readOnlyTokenFingerprint = readOnlyToken ? createHash(readOnlyToken) : 'none';
    
    const urlHost = url ? new URL(url).hostname : 'none';
    const integrationUrlHost = integrationUrl ? new URL(integrationUrl).hostname : 'none';
    
    // Determine token type
    let tokenType = 'unknown';
    if (token === readOnlyToken) {
      tokenType = 'read-only';
    } else if (token === integrationToken) {
      tokenType = 'integration-read-write';
    } else if (token) {
      tokenType = 'manual-read-write';
    }
    
    console.log('[CREDENTIAL_INVESTIGATION]', {
      credentialSource,
      urlHost,
      integrationUrlHost,
      urlFingerprint,
      tokenFingerprint,
      integrationUrlFingerprint,
      integrationTokenFingerprint,
      readOnlyTokenFingerprint,
      tokenType,
      integrationUrlPresent: !!integrationUrl,
      integrationTokenPresent: !!integrationToken,
      readOnlyTokenPresent: !!readOnlyToken,
      selectedCredentialFingerprint: urlFingerprint,
      allRedisVars: Object.keys(process.env).filter(key => 
        key.includes('KV') || key.includes('REDIS') || key.includes('UPSTASH')
      ).map(key => ({ key, hasValue: !!process.env[key] })),
    });
    
    if (!url || !token) {
      throw new Error(`Missing required environment variables: ${credentialSource.urlVariable} and ${credentialSource.tokenVariable}`);
    }
    
    redis = new Redis({ url, token });
    console.log('[REDIS_CONFIG] Client initialization success', {
      urlHost,
      tokenType,
    });
  }
  return redis;
}

function createHash(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex').substring(0, 16);
}

const ASSIGNMENT_PREFIX = 'service-card-assignment:';
const ASSIGNMENT_QUARANTINE_PREFIX = 'service-card-assignment-quarantine:';

export interface ServiceCardAssignment {
  serviceSlug: string;
  mediaId: string;
  updatedAt: string;
  source: 'workbench';
  revision?: number;
}

/**
 * Validate ServiceCardAssignment schema at runtime
 * @param data - Data to validate
 * @returns True if valid, false otherwise
 */
function validateServiceCardAssignment(data: unknown): data is ServiceCardAssignment {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const candidate = data as Record<string, unknown>;
  
  // Domain validation for serviceSlug (non-empty, normalized)
  if (typeof candidate.serviceSlug !== 'string' || candidate.serviceSlug.trim().length === 0) {
    return false;
  }
  
  // Domain validation for mediaId (non-empty, valid format)
  if (typeof candidate.mediaId !== 'string' || candidate.mediaId.trim().length === 0) {
    return false;
  }
  
  // Domain validation for updatedAt (valid ISO timestamp)
  if (typeof candidate.updatedAt !== 'string' || !isValidISODate(candidate.updatedAt)) {
    return false;
  }
  
  // Domain validation for source (must be 'workbench')
  if (candidate.source !== 'workbench') {
    return false;
  }
  
  // Revision is optional but must be number if present
  if (candidate.revision !== undefined && typeof candidate.revision !== 'number') {
    return false;
  }
  
  return true;
}

/**
 * Validate ISO 8601 timestamp format
 */
function isValidISODate(dateString: string): boolean {
  try {
    const date = new Date(dateString);
    return !isNaN(date.getTime()) && date.toISOString() === dateString;
  } catch {
    return false;
  }
}

/**
 * Store a service card assignment
 * @param assignment - Assignment to store
 * @param requestId - Optional request ID for correlation
 */
export async function storeServiceCardAssignment(assignment: ServiceCardAssignment, requestId?: string): Promise<void> {
  const operationId = requestId || `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const key = `${ASSIGNMENT_PREFIX}${assignment.serviceSlug}`;
  
  // Runtime schema validation
  if (!validateServiceCardAssignment(assignment)) {
    const serviceSlug = (assignment as Record<string, unknown>)?.serviceSlug as string || 'unknown';
    console.error('[ASSIGNMENT_WRITE] SCHEMA_VALIDATION_FAILED', {
      operationId,
      assignment,
      validationError: 'Invalid ServiceCardAssignment schema',
    });
    throw new Error(`Invalid assignment schema for ${serviceSlug}`);
  }
  
  console.log('[ASSIGNMENT_WRITE]', {
    operationId,
    serviceSlug: assignment.serviceSlug,
    mediaId: assignment.mediaId,
    key,
  });
  
  try {
    const client = getRedisClient();
    
    // Get current assignment for optimistic concurrency
    const currentAssignment = await client.get<ServiceCardAssignment>(key);
    const currentRevision = currentAssignment?.revision || 0;
    
    // Increment revision
    const newRevision = currentRevision + 1;
    const assignmentWithRevision = {
      ...assignment,
      revision: newRevision,
    };
    
    // Log Redis host and credential fingerprint
    const redisUrl = process.env.KV_REST_API_URL;
    const redisHost = redisUrl ? new URL(redisUrl).hostname : 'none';
    const credentialFingerprint = process.env.KV_REST_API_TOKEN ? crypto.createHash('sha256').update(process.env.KV_REST_API_TOKEN).digest('hex').substring(0, 16) : 'none';
    
    console.log('[ASSIGNMENT_WRITE] SELECTED_REDIS', {
      operationId,
      redisHost,
      credentialFingerprint,
      currentRevision,
      newRevision,
    });
    
    // Use typed object API - @upstash/redis handles serialization
    await client.set<ServiceCardAssignment>(key, assignmentWithRevision);
    
    console.log('[ASSIGNMENT_WRITE] SET_SUCCESS', {
      operationId,
      key,
      mediaId: assignment.mediaId,
      revision: newRevision,
    });
    
    // Removed expensive read-after-write verification
    // Redis operations are atomic; if set succeeded, the data is stored
    // Concurrency handling: last-write-wins with revision tracking
    // Future enhancement: add expectedRevision parameter for strict concurrency control
    
  } catch (error) {
    console.error('[ASSIGNMENT_WRITE] FAILURE', {
      operationId,
      serviceSlug: assignment.serviceSlug,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to store assignment for ${assignment.serviceSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve a service card assignment
 * @param serviceSlug - Service slug
 * @param requestId - Optional request ID for correlation
 * @returns Assignment or null
 */
export async function getServiceCardAssignment(serviceSlug: string, requestId?: string): Promise<ServiceCardAssignment | null> {
  const operationId = requestId || `get-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
  
  console.log('[ASSIGNMENT_READ]', {
    operationId,
    serviceSlug,
    key,
  });
  
  try {
    const client = getRedisClient();
    
    // Use typed object API - @upstash/redis handles deserialization
    const assignment = await client.get<ServiceCardAssignment>(key);
    
    if (!assignment) {
      console.log('[ASSIGNMENT_READ] NOT_FOUND', {
        operationId,
        key,
        serviceSlug,
      });
      return null;
    }

    // Validate readback schema
    if (!validateServiceCardAssignment(assignment)) {
      console.error('[ASSIGNMENT_READ] SCHEMA_VALIDATION_FAILED', {
        operationId,
        key,
        serviceSlug,
        assignment,
        validationError: 'Readback failed schema validation',
      });
      // Quarantine corrupted data using separate namespace
      const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${serviceSlug}:${Date.now()}`;
      await client.set(quarantineKey, assignment);
      console.log('[ASSIGNMENT_READ] CORRUPTED_DATA_QUARANTINED', { operationId, key, quarantineKey });
      return null;
    }

    console.log('[ASSIGNMENT_READ] SUCCESS', {
      operationId,
      key,
      serviceSlug,
      mediaId: assignment.mediaId,
    });
    
    return assignment;
  } catch (error) {
    console.error('[ASSIGNMENT_READ] FAILURE', {
      operationId,
      serviceSlug,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to retrieve assignment for ${serviceSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a service card assignment
 * @param serviceSlug - Service slug
 * @param requestId - Optional request ID for correlation
 */
export async function deleteServiceCardAssignment(serviceSlug: string, requestId?: string): Promise<void> {
  const operationId = requestId || `delete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
  
  console.log('[ASSIGNMENT_STORE] DELETE_REQUEST', {
    operationId,
    serviceSlug,
    key,
  });
  
  try {
    const client = getRedisClient();
    await client.del(key);
    
    console.log('[ASSIGNMENT_STORE] DELETE_SUCCESS', {
      operationId,
      key,
      serviceSlug,
    });
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] DELETE_FAILURE', {
      operationId,
      serviceSlug,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw new Error(`Failed to delete assignment for ${serviceSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all service card assignments
 * @returns Array of all assignments
 */
export async function getAllServiceCardAssignments(): Promise<ServiceCardAssignment[]> {
  try {
    const client = getRedisClient();
    // Use scan to find all keys with the assignment prefix
    const keys: string[] = [];
    let cursor = '0';
    do {
      const result = await client.scan(cursor, { match: `${ASSIGNMENT_PREFIX}*`, count: 100 });
      cursor = result[0];
      keys.push(...result[1]);
    } while (cursor !== '0');

    // Use Promise.all for parallel reads instead of sequential loop
    const assignments: ServiceCardAssignment[] = [];
    const readPromises = keys.map(async (key) => {
      try {
        // Use typed object API - @upstash/redis handles deserialization
        const assignment = await client.get<ServiceCardAssignment>(key);
        if (assignment && validateServiceCardAssignment(assignment)) {
          return assignment;
        } else if (assignment) {
          console.log('[ASSIGNMENT_STORE] Quarantining invalid assignment:', key);
          // Quarantine corrupted data using separate namespace
          const serviceSlug = key.replace(ASSIGNMENT_PREFIX, '');
          const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${serviceSlug}:${Date.now()}`;
          await client.set(quarantineKey, assignment);
          return null;
        }
        return null;
      } catch (error) {
        console.log('[ASSIGNMENT_STORE] Failed to load individual key:', key, error);
        return null;
      }
    });

    const results = await Promise.all(readPromises);
    assignments.push(...results.filter((a): a is ServiceCardAssignment => a !== null));

    return assignments;
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] List failed:', error);
    throw new Error(`Failed to list assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}