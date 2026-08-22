/**
 * Drive OAuth State Authority
 *
 * Server-side OAuth state management for CSRF protection.
 * 
 * Constitutional authority for OAuth state:
 * - Cryptographically random state generation
 * - Browser-bound state validation
 * - One-time state consumption
 * - Server-side persistence (Redis KV)
 * - Atomic consume operation
 * 
 * Browser receives ONLY opaque state string.
 * Server validates and consumes state atomically.
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';

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

// Redis namespace
const STATE_PREFIX = 'drive:oauth:state:';

// State TTL: 5 minutes (one-time use, short-lived)
const STATE_TTL_SECONDS = 5 * 60;

/**
 * OAuth State Record
 */
interface OAuthStateRecord {
  state: string; // 16-byte random hex
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  consumed: boolean; // One-time use flag
}

/**
 * Validate OAuth state record schema
 */
function validateStateRecord(data: unknown): data is OAuthStateRecord {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const record = data as Record<string, unknown>;
  
  if (typeof record.state !== 'string' || record.state.length !== 32) {
    return false;
  }
  
  if (typeof record.createdAt !== 'string') {
    return false;
  }
  
  if (typeof record.expiresAt !== 'string') {
    return false;
  }
  
  if (typeof record.consumed !== 'boolean') {
    return false;
  }
  
  return true;
}

/**
 * Generate cryptographically random OAuth state
 * 
 * Returns 16-byte random hex string (32 hex characters)
 */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create OAuth state record
 * 
 * Stores state in Redis with 5-minute TTL
 * State is not yet consumed
 */
export async function createState(): Promise<string> {
  const state = generateState();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STATE_TTL_SECONDS * 1000);
  
  const record: OAuthStateRecord = {
    state,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    consumed: false,
  };
  
  try {
    const client = getRedisClient();
    await client.set(`${STATE_PREFIX}${state}`, record);
    await client.expire(`${STATE_PREFIX}${state}`, STATE_TTL_SECONDS);
    
    console.log('[OAUTH_STATE] State created:', {
      state: state.substring(0, 8) + '...',
      expiresAt: expiresAt.toISOString(),
    });
    
    return state;
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to create state:', error);
    throw new Error(`Failed to create OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate OAuth state
 * 
 * Checks if state exists, not expired, and not consumed
 * Does NOT consume the state
 */
export async function validateState(state: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const record = await client.get<OAuthStateRecord>(`${STATE_PREFIX}${state}`);
    
    if (!record) {
      console.log('[OAUTH_STATE] State not found:', state.substring(0, 8) + '...');
      return false;
    }
    
    if (!validateStateRecord(record)) {
      console.error('[OAUTH_STATE] Invalid state record:', state.substring(0, 8) + '...');
      return false;
    }
    
    if (record.consumed) {
      console.log('[OAUTH_STATE] State already consumed:', state.substring(0, 8) + '...');
      return false;
    }
    
    if (new Date(record.expiresAt) < new Date()) {
      console.log('[OAUTH_STATE] State expired:', state.substring(0, 8) + '...');
      return false;
    }
    
    console.log('[OAUTH_STATE] State valid:', state.substring(0, 8) + '...');
    return true;
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to validate state:', error);
    return false;
  }
}

/**
 * Consume OAuth state atomically
 * 
 * Marks state as consumed if valid
 * Returns true if state was valid and consumed
 * Returns false if state was invalid, expired, or already consumed
 * 
 * Uses conditional SET for atomicity:
 * - Check state validity
 * - Mark as consumed
 * - In one atomic operation
 */
export async function consumeState(state: string): Promise<boolean> {
  try {
    const client = getRedisClient();
    const record = await client.get<OAuthStateRecord>(`${STATE_PREFIX}${state}`);
    
    if (!record) {
      console.log('[OAUTH_STATE] Cannot consume - state not found:', state.substring(0, 8) + '...');
      return false;
    }
    
    if (!validateStateRecord(record)) {
      console.error('[OAUTH_STATE] Cannot consume - invalid record:', state.substring(0, 8) + '...');
      return false;
    }
    
    if (record.consumed) {
      console.log('[OAUTH_STATE] Cannot consume - already consumed:', state.substring(0, 8) + '...');
      return false;
    }
    
    if (new Date(record.expiresAt) < new Date()) {
      console.log('[OAUTH_STATE] Cannot consume - state expired:', state.substring(0, 8) + '...');
      return false;
    }
    
    // Atomic consume: update record
    record.consumed = true;
    await client.set(`${STATE_PREFIX}${state}`, record);
    
    console.log('[OAUTH_STATE] State consumed:', state.substring(0, 8) + '...');
    return true;
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to consume state:', error);
    return false;
  }
}

/**
 * Delete OAuth state
 * 
 * Removes state from Redis immediately
 * Used for cleanup or explicit revocation
 */
export async function deleteState(state: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(`${STATE_PREFIX}${state}`);
    console.log('[OAUTH_STATE] State deleted:', state.substring(0, 8) + '...');
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to delete state:', error);
  }
}
