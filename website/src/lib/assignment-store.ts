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
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    
    console.log('[REDIS_DIAGNOSTIC] Client initialization attempt', {
      urlDetected: !!url,
      tokenDetected: !!token,
      urlLength: url?.length || 0,
      tokenLength: token?.length || 0,
    });
    
    if (!url || !token) {
      throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
    }
    
    redis = new Redis({ url, token });
    console.log('[REDIS_DIAGNOSTIC] Client initialization success');
  }
  return redis;
}

const ASSIGNMENT_PREFIX = 'service-card-assignment:';

export interface ServiceCardAssignment {
  serviceSlug: string;
  mediaId: string;
  updatedAt: string;
  source: 'workbench';
}

/**
 * Store a service card assignment
 * @param assignment - Assignment to store
 * @param requestId - Optional request ID for correlation
 */
export async function storeServiceCardAssignment(assignment: ServiceCardAssignment, requestId?: string): Promise<void> {
  const operationId = requestId || `store-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  console.log('[ASSIGNMENT_STORE] STORE_REQUEST', {
    operationId,
    serviceSlug: assignment.serviceSlug,
    mediaId: assignment.mediaId,
    key: `${ASSIGNMENT_PREFIX}${assignment.serviceSlug}`,
  });
  
  try {
    const client = getRedisClient();
    const key = `${ASSIGNMENT_PREFIX}${assignment.serviceSlug}`;
    const value = JSON.stringify(assignment);
    
    await client.set(key, value);
    
    console.log('[ASSIGNMENT_STORE] STORE_SUCCESS', {
      operationId,
      key,
      mediaId: assignment.mediaId,
    });
    
    // Readback verification
    const readback = await client.get(key);
    const readbackValue = typeof readback === 'string' ? JSON.parse(readback) : null;
    
    console.log('[ASSIGNMENT_STORE] READBACK_VERIFICATION', {
      operationId,
      key,
      writtenMediaId: assignment.mediaId,
      readbackMediaId: readbackValue?.mediaId,
      match: readbackValue?.mediaId === assignment.mediaId,
    });
    
    if (readbackValue?.mediaId !== assignment.mediaId) {
      throw new Error('Readback verification failed: written mediaId does not match readback');
    }
    
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] STORE_FAILURE', {
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
  
  console.log('[ASSIGNMENT_STORE] GET_REQUEST', {
    operationId,
    serviceSlug,
    key: `${ASSIGNMENT_PREFIX}${serviceSlug}`,
  });
  
  try {
    const client = getRedisClient();
    const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
    const value = await client.get(key);
    
    if (!value) {
      console.log('[ASSIGNMENT_STORE] GET_NOT_FOUND', {
        operationId,
        key,
        serviceSlug,
      });
      return null;
    }

    // Upstash Redis returns strings; parse JSON
    if (typeof value === 'string') {
      const assignment = JSON.parse(value) as ServiceCardAssignment;
      console.log('[ASSIGNMENT_STORE] GET_SUCCESS', {
        operationId,
        key,
        serviceSlug,
        mediaId: assignment.mediaId,
      });
      return assignment;
    } else {
      console.error('[ASSIGNMENT_STORE] GET_UNEXPECTED_TYPE', {
        operationId,
        key,
        actualType: typeof value,
      });
      return null;
    }
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] GET_FAILURE', {
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
  
  console.log('[ASSIGNMENT_STORE] DELETE_REQUEST', {
    operationId,
    serviceSlug,
    key: `${ASSIGNMENT_PREFIX}${serviceSlug}`,
  });
  
  try {
    const client = getRedisClient();
    const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
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

    const assignments: ServiceCardAssignment[] = [];

    for (const key of keys) {
      try {
        const value = await client.get(key);
        if (value && typeof value === 'string') {
          const assignment = JSON.parse(value) as ServiceCardAssignment;
          assignments.push(assignment);
        }
      } catch (error) {
        console.log('[ASSIGNMENT_STORE] Failed to load individual key:', key, error);
      }
    }

    return assignments;
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] List failed:', error);
    throw new Error(`Failed to list assignments: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}