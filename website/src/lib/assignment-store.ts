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
    
    if (!url || !token) {
      throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
    }
    
    redis = new Redis({ url, token });
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
 */
export async function storeServiceCardAssignment(assignment: ServiceCardAssignment): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `${ASSIGNMENT_PREFIX}${assignment.serviceSlug}`;
    await client.set(key, JSON.stringify(assignment));
    console.log('[ASSIGNMENT_STORE] Stored assignment:', assignment.serviceSlug, assignment.mediaId);
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] Store failed:', error);
    throw new Error(`Failed to store assignment for ${assignment.serviceSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve a service card assignment
 * @param serviceSlug - Service slug
 * @returns Assignment or null
 */
export async function getServiceCardAssignment(serviceSlug: string): Promise<ServiceCardAssignment | null> {
  try {
    const client = getRedisClient();
    const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
    const value = await client.get(key);
    if (!value) return null;

    // Upstash Redis returns strings; parse JSON
    if (typeof value === 'string') {
      return JSON.parse(value) as ServiceCardAssignment;
    } else {
      console.error('[ASSIGNMENT_STORE] Unexpected value type:', typeof value);
      return null;
    }
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] Get failed:', error);
    throw new Error(`Failed to retrieve assignment for ${serviceSlug}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a service card assignment
 * @param serviceSlug - Service slug
 */
export async function deleteServiceCardAssignment(serviceSlug: string): Promise<void> {
  try {
    const client = getRedisClient();
    const key = `${ASSIGNMENT_PREFIX}${serviceSlug}`;
    await client.del(key);
    console.log('[ASSIGNMENT_STORE] Deleted assignment:', serviceSlug);
  } catch (error) {
    console.error('[ASSIGNMENT_STORE] Delete failed:', error);
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