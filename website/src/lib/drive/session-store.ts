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

// Redis namespace
const SESSION_PREFIX = 'drive:session:';
const AUTH_SESSIONS_PREFIX = 'drive:auth:sessions:';

// Session TTL: 30 days (browser session lifetime)
const SESSION_TTL_SECONDS = 30 * 24 * 60 * 60;

// Session index safety TTL: 60 days (longer than session TTL to allow renewal)
const SESSION_INDEX_TTL_SECONDS = 60 * 24 * 60 * 60;

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
 * Create session record with atomic authorization verification
 *
 * CRITICAL: Atomically verifies authorization exists and is active before creating session
 * Prevents resurrection race where session could be created for just-revoked authorization
 * 
 * Uses Redis Lua transaction for atomic authorization verification + session + index write
 * 
 * Transaction boundary:
 * 1. Verify authorization exists
 * 2. Verify authorization.status === 'active'
 * 3. Create session record
 * 4. Register in authorization's session index
 * 
 * If authorization is missing or revoked, session creation fails atomically
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

    // Redis Lua script for atomic authorization verification + session + index write
    const luaScript = `
      local auth_key = KEYS[1]
      local session_key = KEYS[2]
      local index_key = KEYS[3]
      local session_data = ARGV[1]
      local session_id = ARGV[2]
      local session_ttl = ARGV[3]
      local index_ttl = ARGV[4]

      -- Verify authorization exists
      local auth_data = redis.call('GET', auth_key)
      if not auth_data then
        return 0  -- Authorization not found
      end

      -- Verify authorization is active
      local auth = cjson.decode(auth_data)
      if auth.status ~= 'active' then
        return 0  -- Authorization not active (revoked or other non-active state)
      end

      -- Authorization is active: create session atomically
      redis.call('SET', session_key, session_data)
      redis.call('EXPIRE', session_key, session_ttl)

      -- Register in authorization's session index with longer TTL
      redis.call('SADD', index_key, session_id)
      redis.call('EXPIRE', index_key, index_ttl)

      return 1  -- Success
    `;

    const result = await client.eval(
      luaScript,
      [`drive:auth:${authorizationId}`, `${SESSION_PREFIX}${sessionId}`, `${AUTH_SESSIONS_PREFIX}${authorizationId}`],
      [JSON.stringify(record), sessionId, SESSION_TTL_SECONDS.toString(), SESSION_INDEX_TTL_SECONDS.toString()]
    );

    if (result === 0) {
      throw new Error(`Authorization ${authorizationId} not found or not active - session creation rejected`);
    }

    console.log('[SESSION_STORE] Session created with atomic authorization verification:', sessionId);
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
 * 
 * Also renews the authorization session index TTL
 */
export async function updateSessionLastSeen(id: string): Promise<void> {
  try {
    const record = await getSession(id);
    if (record) {
      record.lastSeenAt = new Date().toISOString();
      const client = getRedisClient();
      await client.set(`${SESSION_PREFIX}${id}`, record);
      await client.expire(`${SESSION_PREFIX}${id}`, SESSION_TTL_SECONDS);
      
      // Renew authorization session index TTL to safety TTL
      await client.expire(`${AUTH_SESSIONS_PREFIX}${record.authorizationId}`, SESSION_INDEX_TTL_SECONDS);
    }
  } catch (error) {
    console.error('[SESSION_STORE] Last seen update failed:', error);
    throw new Error(`Failed to update session last seen ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
 * 
 * ARCHITECTURAL CORRECTION:
 * - Uses Redis Lua script for atomic revocation
 * - Session index deleted FIRST as atomic barrier (prevents new session creation)
 * - Then individual sessions revoked
 * - Prevents race condition where concurrent session creation resurrects access during revocation
 */
export async function revokeAllSessionsForAuthorization(authorizationId: string): Promise<void> {
  try {
    const client = getRedisClient();
    
    // Redis Lua script for atomic session revocation with index barrier
    // Delete session index FIRST (atomic barrier), then revoke individual sessions
    const luaScript = `
      local session_index_key = KEYS[1]
      local session_prefix = ARGV[1]
      
      -- Get all session IDs from index atomically
      local session_ids = redis.call('SMEMBERS', session_index_key)
      
      -- Delete session index FIRST (atomic barrier prevents new session creation)
      redis.call('DEL', session_index_key)
      
      -- Revoke each session atomically
      for i, session_id in ipairs(session_ids) do
        local session_key = session_prefix .. session_id
        redis.call('DEL', session_key)
      end
      
      -- Return count of revoked sessions
      return #session_ids
    `;

    const result = await client.eval(
      luaScript,
      [`${AUTH_SESSIONS_PREFIX}${authorizationId}`],
      [`${SESSION_PREFIX}`]
    );

    const revokedCount = result as number;
    console.log('[SESSION_STORE] Revoked all sessions for authorization:', authorizationId, 'count:', revokedCount);
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
 * Also renews the authorization session index TTL to match
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
      
      // Renew session record TTL
      await client.set(`${SESSION_PREFIX}${id}`, record);
      await client.expire(`${SESSION_PREFIX}${id}`, SESSION_TTL_SECONDS);
      
      // Renew authorization session index TTL to safety TTL (longer than session TTL)
      await client.expire(`${AUTH_SESSIONS_PREFIX}${record.authorizationId}`, SESSION_INDEX_TTL_SECONDS);
      
      console.log('[SESSION_STORE] Session renewed with index TTL:', id);
    }
  } catch (error) {
    console.error('[SESSION_STORE] Renew failed:', error);
    throw new Error(`Failed to renew session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
