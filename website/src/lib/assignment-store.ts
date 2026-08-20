/**
 * Service Card Assignment Store
 *
 * Provides persistent storage for service card media assignments.
 * Stores assignments independently of static services.v1.json configuration.
 * Uses Upstash Redis for durable runtime storage.
 */

import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

function getRedisClient(): Redis {
  if (!redis) {
    let url = process.env.KV_REST_API_URL;
    let token = process.env.KV_REST_API_TOKEN;
    
    // Check integration-generated variables
    const integrationUrl = process.env.KV_REST_API__KV_REST_API_URL || process.env.KV_REST_API__REDIS_URL || process.env.KV_REST_API__KV_URL;
    const integrationToken = process.env.KV_REST_API__KV_REST_API_TOKEN;
    const readOnlyToken = process.env.KV_REST_API__KV_REST_API_READ_ONLY_TOKEN;
    
    // Use integration credentials if primary not set
    if (!url && integrationUrl) {
      url = integrationUrl;
    }
    if (!token && integrationToken) {
      token = integrationToken;
    }
    
    if (!url || !token) {
      throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
    }
    
    redis = new Redis({ url, token });
  }
  return redis;
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
  
  // REJECT: drive-prefixed IDs at write time (Drive references cannot become public assignments)
  // drive- and drive-ref- prefixes are reserved for DriveReference only
  if (assignment.mediaId.startsWith('drive-') || assignment.mediaId.startsWith('drive-ref-')) {
    console.error('[ASSIGNMENT_WRITE] REJECTED: drive-prefixed mediaId at write time', {
      operationId,
      serviceSlug: assignment.serviceSlug,
      mediaId: assignment.mediaId,
      validationError: 'Drive-prefixed IDs cannot be assigned to public presentation',
    });
    throw new Error(`Drive-prefixed IDs cannot be assigned to public presentation: ${assignment.mediaId}`);
  }
  
  // VALIDATE: mediaId must resolve to a valid PublishedMediaAsset before assignment can become active
  // This enforces the contract at write time instead of discovery at read time
  try {
    const { resolvePublicMedia } = await import('./media');
    const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
    
    if (!resolvedMedia) {
      console.error('[ASSIGNMENT_WRITE] REJECTED: mediaId does not resolve to valid PublishedMediaAsset', {
        operationId,
        serviceSlug: assignment.serviceSlug,
        mediaId: assignment.mediaId,
        validationError: 'Media ID must resolve to a valid PublishedMediaAsset before assignment',
      });
      throw new Error(`Media ID does not resolve to a valid PublishedMediaAsset: ${assignment.mediaId}`);
    }
    
    console.log('[ASSIGNMENT_WRITE] MEDIA_VALIDATION_PASSED', {
      operationId,
      serviceSlug: assignment.serviceSlug,
      mediaId: assignment.mediaId,
      resolvedMediaId: resolvedMedia.id,
    });
  } catch (validationError) {
    // If validation fails, do not store the assignment
    console.error('[ASSIGNMENT_WRITE] MEDIA_VALIDATION_FAILED', {
      operationId,
      serviceSlug: assignment.serviceSlug,
      mediaId: assignment.mediaId,
      error: validationError instanceof Error ? validationError.message : 'Unknown error',
    });
    throw validationError;
  }
  
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
          // SEMANTIC VALIDATION: Check if mediaId still resolves to PublishedMediaAsset
          try {
            const { resolvePublicMedia } = await import('./media');
            const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
            
            if (!resolvedMedia) {
              console.log('[ASSIGNMENT_READ] SEMANTIC_VALIDATION_FAILED: Assignment media no longer resolves to PublishedMediaAsset', {
                serviceSlug: assignment.serviceSlug,
                mediaId: assignment.mediaId,
              });
              // Quarantine and remove semantically invalid assignment
              const serviceSlug = key.replace(ASSIGNMENT_PREFIX, '');
              const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${serviceSlug}:${Date.now()}`;
              await client.set(quarantineKey, assignment);
              await client.del(key);
              return null;
            }
            
            return assignment;
          } catch (validationError) {
            console.log('[ASSIGNMENT_READ] SEMANTIC_VALIDATION_ERROR', {
              serviceSlug: assignment.serviceSlug,
              mediaId: assignment.mediaId,
              error: validationError instanceof Error ? validationError.message : 'Unknown error',
            });
            // Quarantine if validation fails
            const serviceSlug = key.replace(ASSIGNMENT_PREFIX, '');
            const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${serviceSlug}:${Date.now()}`;
            await client.set(quarantineKey, assignment);
            await client.del(key);
            return null;
          }
        } else if (assignment) {
          console.log('[ASSIGNMENT_STORE] Quarantining invalid assignment:', key);
          // Quarantine corrupted data using separate namespace
          const serviceSlug = key.replace(ASSIGNMENT_PREFIX, '');
          const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${serviceSlug}:${Date.now()}`;
          await client.set(quarantineKey, assignment);
          // Remove from active namespace to prevent recurring validation failures
          await client.del(key);
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

/**
 * Quarantine and remove poison assignments from active namespace
 * 
 * This fixes the recurring-error machine where quarantine copies don't remove the original.
 * The new lifecycle is:
 * ACTIVE -> validation failure -> QUARANTINED -> original removed from active namespace
 * 
 * @returns Object with counts of quarantined, removed, and errors
 */
export async function quarantinePoisonAssignments(): Promise<{
  quarantined: number;
  removed: number;
  errors: number;
}> {
  try {
    const client = getRedisClient();
    const allAssignments = await getAllServiceCardAssignments();
    
    let quarantined = 0;
    let removed = 0;
    let errors = 0;
    
    for (const assignment of allAssignments) {
      try {
        // Check if assignment is poison (drive-prefixed or doesn't resolve to PublishedMediaAsset)
        let isPoison = false;
        let poisonReason = '';
        
        // Check for drive-prefixed IDs
        if (assignment.mediaId.startsWith('drive-')) {
          isPoison = true;
          poisonReason = 'drive-prefixed ID';
        } else {
          // Check if media resolves to PublishedMediaAsset
          try {
            const { resolvePublicMedia } = await import('./media');
            const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
            if (!resolvedMedia) {
              isPoison = true;
              poisonReason = 'does not resolve to PublishedMediaAsset';
            }
          } catch (error) {
            isPoison = true;
            poisonReason = 'validation error';
          }
        }
        
        if (isPoison) {
          // Quarantine the assignment
          const key = `${ASSIGNMENT_PREFIX}${assignment.serviceSlug}`;
          const quarantineKey = `${ASSIGNMENT_QUARANTINE_PREFIX}${assignment.serviceSlug}:${Date.now()}`;
          
          await client.set(quarantineKey, assignment);
          await client.del(key);
          
          quarantined++;
          removed++;
          console.log('[ASSIGNMENT_QUARANTINE] Poison assignment quarantined and removed:', {
            serviceSlug: assignment.serviceSlug,
            mediaId: assignment.mediaId,
            poisonReason,
            quarantineKey,
          });
        }
      } catch (error) {
        errors++;
        console.error('[ASSIGNMENT_QUARANTINE] Error processing assignment:', assignment.serviceSlug, error);
      }
    }
    
    console.log('[ASSIGNMENT_QUARANTINE] Complete:', { quarantined, removed, errors });
    return { quarantined, removed, errors };
  } catch (error) {
    console.error('[ASSIGNMENT_QUARANTINE] Failed:', error);
    throw new Error(`Failed to quarantine poison assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}