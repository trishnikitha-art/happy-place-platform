/**
 * Drive Browser Session Repository
 *
 * Server-side storage for browser session records.
 * 
 * Constitutional authority for browser sessions:
 * - Opaque session identifiers
 * - Session-to-authorization mapping
 * - Session lifecycle management
 * - Server-side persistence (Redis KV)
 * - Separation from media authority
 * 
 * Session records are infrastructure layer, NOT media authority.
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
const SESSION_PREFIX = 'drive:session:';
const AUTH_SESSIONS_PREFIX = 'drive:auth:sessions:';

// Session TTL: 30 days (browser session lifetime)
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Browser Session Record
 * 
 * Represents a browser session linked to a Google authorization
 */
export interface BrowserSessionRecord {
  id: string; // crypto.randomUUID()
  authorizationId: string; // Link to GoogleAuthorizationRecord
  userAgent: string; // Browser identifier
  createdAt: string; // ISO timestamp
  expiresAt: string; // ISO timestamp
  lastSeenAt: string; // ISO timestamp
  revokedAt?: string; // ISO timestamp
}

/**
 * Validate BrowserSessionRecord schema
 */
function validateSessionRecord(data: unknown): data is BrowserSessionRecord {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const record = data as Record<string, unknown>;
  
  if (typeof record.id !== 'string' || record.id.trim().length === 0) {
    return false;
  }
  
  if (typeof record.authorizationId !== 'string' || record.authorizationId.trim().length === 0) {
    return false;
  }
  
  if (typeof record.userAgent !== 'string') {
    return false;
  }
  
  if (typeof record.createdAt !== 'string') {
    return false;
  }
  
  if (typeof record.expiresAt !== 'string') {
    return false;
  }
  
  if (typeof record.lastSeenAt !== 'string') {
    return false;
  }
  
  if (record.revokedAt !== undefined && typeof record.revokedAt !== 'string') {
    return false;
  }
  
  return true;
}

/**
 * Generate session ID
 * 
 * Returns opaque random session identifier
 */
export function generateSessionId(): string {
  return crypto.randomUUID();
}

/**
 * Create session record
 *
 * Registers session in authorization's session index
 */
export async function createSession(
  authorizationId: string,
  userAgent: string
): Promise<BrowserSessionRecord> {
  const sessionId = generateSessionId();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  const record: BrowserSessionRecord = {
    id: sessionId,
    authorizationId,
    userAgent,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    lastSeenAt: now.toISOString(),
  };

  try {
    const client = getRedisClient();
    await client.set(`${SESSION_PREFIX}${sessionId}`, record);
    await client.expire(`${SESSION_PREFIX}${sessionId}`, SESSION_TTL_SECONDS);

    // Register session in authorization's session index
    await client.sadd(`${AUTH_SESSIONS_PREFIX}${authorizationId}`, sessionId);
    await client.expire(`${AUTH_SESSIONS_PREFIX}${authorizationId}`, SESSION_TTL_SECONDS);

    console.log('[SESSION_STORE] Session created:', sessionId);
    return record;
  } catch (error) {
    console.error('[SESSION_STORE] Create failed:', error);
    throw new Error(`Failed to create session ${sessionId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve session record by ID
 */
export async function getSession(id: string): Promise<BrowserSessionRecord | null> {
  try {
    const client = getRedisClient();
    const record = await client.get<BrowserSessionRecord>(`${SESSION_PREFIX}${id}`);
    
    if (!record) {
      return null;
    }
    
    if (!validateSessionRecord(record)) {
      console.error('[SESSION_STORE] Invalid session record:', id);
      return null;
    }
    
    // Check if session is expired or revoked
    if (record.revokedAt || new Date(record.expiresAt) < new Date()) {
      return null;
    }
    
    return record;
  } catch (error) {
    console.error('[SESSION_STORE] Get failed:', error);
    throw new Error(`Failed to retrieve session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update session last seen timestamp
 */
export async function updateSessionLastSeen(id: string): Promise<void> {
  try {
    const record = await getSession(id);
    if (record) {
      record.lastSeenAt = new Date().toISOString();
      const client = getRedisClient();
      await client.set(`${SESSION_PREFIX}${id}`, record);
      await client.expire(`${SESSION_PREFIX}${id}`, SESSION_TTL_SECONDS);
    }
  } catch (error) {
    console.error('[SESSION_STORE] Last seen update failed:', error);
  }
}

/**
 * Revoke session
 * 
 * Marks session as revoked
 */
export async function revokeSession(id: string): Promise<void> {
  try {
    const record = await getSession(id);
    if (record) {
      record.revokedAt = new Date().toISOString();
      const client = getRedisClient();
      await client.set(`${SESSION_PREFIX}${id}`, record);
      console.log('[SESSION_STORE] Session revoked:', id);
    }
  } catch (error) {
    console.error('[SESSION_STORE] Revoke failed:', error);
    throw new Error(`Failed to revoke session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revoke all sessions for an authorization
 *
 * Marks all sessions linked to the authorization as revoked
 * Uses authorization's session index for efficient enumeration
 */
export async function revokeAllSessionsForAuthorization(authorizationId: string): Promise<void> {
  try {
    const client = getRedisClient();
    const sessionIds = await client.smembers<string>(`${AUTH_SESSIONS_PREFIX}${authorizationId}`);

    if (sessionIds.length === 0) {
      console.log('[SESSION_STORE] No sessions found for authorization:', authorizationId);
      return;
    }

    // Revoke each session
    for (const sessionId of sessionIds) {
      await revokeSession(sessionId);
    }

    // Clean up session index
    await client.del(`${AUTH_SESSIONS_PREFIX}${authorizationId}`);

    console.log('[SESSION_STORE] Revoked all sessions for authorization:', authorizationId, 'count:', sessionIds.length);
  } catch (error) {
    console.error('[SESSION_STORE] Revoke all failed:', error);
    throw new Error(`Failed to revoke all sessions for authorization ${authorizationId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete session record
 *
 * WARNING: This destroys forensic evidence
 * Use revokeSession instead for most cases
 * Removes session from authorization's session index
 */
export async function deleteSession(id: string): Promise<void> {
  try {
    const record = await getSession(id);
    if (record) {
      const client = getRedisClient();
      await client.del(`${SESSION_PREFIX}${id}`);

      // Remove from authorization's session index
      await client.srem(`${AUTH_SESSIONS_PREFIX}${record.authorizationId}`, id);

      console.log('[SESSION_STORE] Session deleted:', id);
    }
  } catch (error) {
    console.error('[SESSION_STORE] Delete failed:', error);
    throw new Error(`Failed to delete session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Renew session
 * 
 * Extends session expiration by 30 days from now
 */
export async function renewSession(id: string): Promise<void> {
  try {
    const record = await getSession(id);
    if (record) {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);
      record.expiresAt = expiresAt.toISOString();
      record.lastSeenAt = now.toISOString();
      
      const client = getRedisClient();
      await client.set(`${SESSION_PREFIX}${id}`, record);
      await client.expire(`${SESSION_PREFIX}${id}`, SESSION_TTL_SECONDS);
      
      console.log('[SESSION_STORE] Session renewed:', id);
    }
  } catch (error) {
    console.error('[SESSION_STORE] Renew failed:', error);
    throw new Error(`Failed to renew session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
