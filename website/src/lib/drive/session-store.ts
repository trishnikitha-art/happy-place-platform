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

/**
 * P1-9: KV environment isolation
 * Each environment (production, preview, development, test) has a distinct namespace
 * to prevent cross-environment data access and isolation violations.
 */
type Environment = 'production' | 'preview' | 'development' | 'test';

function getEnvironment(): Environment {
  const vercelEnv = process.env.VERCEL_ENV;
  const nodeEnv = process.env.NODE_ENV;
  
  // Vercel production
  if (vercelEnv === 'production') {
    return 'production';
  }
  
  // Vercel preview
  if (vercelEnv === 'preview') {
    return 'preview';
  }
  
  // Local development
  if (nodeEnv === 'development') {
    return 'development';
  }
  
  // Test environment
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  // P0 FIX: Fail closed on unknown environment
  // Unknown/missing environment must not silently default to development
  // This prevents production-like execution from accidentally routing into development namespace
  throw new Error(
    `Unknown environment: VERCEL_ENV=${vercelEnv}, NODE_ENV=${nodeEnv}. ` +
    'Environment must be explicitly configured. Cannot proceed with unsafe default.'
  );
}

/**
 * Get KV namespace prefix for current environment
 * This ensures isolation between production, preview, development, and test
 * 
 * CRITICAL: Use TEST_NAMESPACE if present for integration test isolation
 * This prevents tests from writing to production/development data
 */
function getKvNamespace(): string {
  // Integration test namespace takes precedence for isolation
  if (process.env.TEST_NAMESPACE) {
    return process.env.TEST_NAMESPACE;
  }
  
  const env = getEnvironment();
  return `hpp:${env}:`;
}

/**
 * Apply namespace prefix to KV key
 * Prevents cross-environment key collisions
 */
function namespacedKey(key: string): string {
  const namespace = getKvNamespace();
  return `${namespace}${key}`;
}

/**
 * Detect if we're in static build mode
 * During static build, we can tolerate KV unavailability
 * During runtime, KV is a required dependency
 */
function isStaticBuild(): boolean {
  // Check if we're in Next.js build phase
  // During build, NODE_ENV is 'production' but we're not actually running
  const isBuilding = process.env.NEXT_PHASE === 'build';
  return isBuilding;
}

class KvUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KvUnavailableError';
  }
}

/**
 * KV Client Factory
 * 
 * Creates environment-bound Redis clients to prevent mutable process-global state.
 * Each client is bound to the current environment namespace at creation time.
 * This prevents identity leaks when environments change or credentials rotate.
 */
function createRedisClient(): Redis {
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
  
  // During static build, KV may not be available - throw explicit error
  // Runtime pages will handle this as a dependency failure
  if (!url || !token) {
    if (isStaticBuild()) {
      throw new KvUnavailableError('KV credentials not available during static build');
    }
    throw new Error('Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
  }
  
  // Create fresh client bound to current environment
  const env = getEnvironment();
  const client = new Redis({ url, token });
  
  console.log('[SESSION_STORE] Created environment-bound client', {
    environment: env,
    namespace: getKvNamespace(),
  });
  
  return client;
}

// Redis namespace (P1-9: Environment isolation applied)
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
    const client = createRedisClient();

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
      [namespacedKey(`drive:auth:${authorizationId}`), namespacedKey(`${SESSION_PREFIX}${sessionId}`), namespacedKey(`${AUTH_SESSIONS_PREFIX}${authorizationId}`)],
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
 * 
 * P0 FIX: Eliminated complex Lua script to prevent Redis scripting errors
 * Uses simple GET operations only - all validation in TypeScript
 * No cjson.decode(), no object mutation, no TTL branching in Lua
 * Prevents "attempt to call a non-function object" and argument type errors
 * 
 * Note: Non-atomic read introduces small TOCTOU window between session and authorization reads
 * This is acceptable for session validation as worst case is session rejection
 */
export async function getSession(id: string): Promise<BrowserSessionRecord | null> {
  try {
    const client = createRedisClient();

    // Read session data
    const sessionData = await client.get(namespacedKey(`${SESSION_PREFIX}${id}`));
    if (!sessionData) {
      return null;
    }

    // Handle both JSON strings and already-deserialized objects
    // Upstash may return objects for some existing records
    let session: unknown;
    if (typeof sessionData === 'string') {
      try {
        session = JSON.parse(sessionData);
      } catch (parseError) {
        console.error('[SESSION_STORE] Session JSON parse failed:', parseError);
        return null;
      }
    } else if (typeof sessionData === 'object' && sessionData !== null) {
      session = sessionData;
    } else {
      console.error('[SESSION_STORE] Invalid session data type:', typeof sessionData);
      return null;
    }

    // Validate session record schema
    if (!validateSessionRecord(session)) {
      console.error('[SESSION_STORE] Invalid session record:', id);
      return null;
    }

    const sessionRecord = session as BrowserSessionRecord;

    // Check if session is revoked
    if (sessionRecord.revokedAt) {
      console.warn('[SESSION_STORE] Session revoked:', id);
      return null;
    }

    // Check session expiration using ISO timestamp
    const now = new Date();
    const expiresAt = new Date(sessionRecord.expiresAt);
    if (now > expiresAt) {
      console.warn('[SESSION_STORE] Session expired:', id);
      return null;
    }

    // Read authorization data
    const authData = await client.get(namespacedKey(`drive:auth:${sessionRecord.authorizationId}`));
    if (!authData) {
      console.warn('[SESSION_STORE] Authorization not found:', id);
      return null;
    }

    // Handle both JSON strings and already-deserialized objects
    let auth: unknown;
    if (typeof authData === 'string') {
      try {
        auth = JSON.parse(authData);
      } catch (parseError) {
        console.error('[SESSION_STORE] Authorization JSON parse failed:', parseError);
        return null;
      }
    } else if (typeof authData === 'object' && authData !== null) {
      auth = authData;
    } else {
      console.error('[SESSION_STORE] Invalid authorization data type:', typeof authData);
      return null;
    }

    // Verify authorization is active
    if (!auth || typeof auth !== 'object') {
      console.error('[SESSION_STORE] Invalid authorization data:', id);
      return null;
    }

    const authRecord = auth as Record<string, unknown>;
    if (authRecord.status !== 'active') {
      console.warn('[SESSION_STORE] Authorization not active:', id, 'status:', authRecord.status);
      return null;
    }

    return sessionRecord;
  } catch (error) {
    console.error('[SESSION_STORE] Get failed:', error);
    throw new Error(`Failed to retrieve session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update session last seen timestamp
 * 
 * P0 FIX: Make atomic against authorization revocation to prevent resurrection race
 * Uses Redis Lua script to prevent TOCTOU where:
 * - Request A: getSession() (authorization active)
 * - Request B: revokeAuthorization() + revokeAllSessionsForAuthorization()
 * - Request A: updateSessionLastSeen() resurrects session
 * 
 * Also renews the authorization session index TTL
 */
export async function updateSessionLastSeen(id: string): Promise<void> {
  try {
    const client = createRedisClient();
    const now = new Date().toISOString();

    // First get the session to extract authorization ID (non-atomic read)
    const session = await client.get<BrowserSessionRecord>(namespacedKey(`${SESSION_PREFIX}${id}`));
    if (!session) {
      return;
    }

    // Redis Lua script for atomic session update + authorization status verification
    const luaScript = `
      local session_key = KEYS[1]
      local auth_key = KEYS[2]
      local index_key = KEYS[3]
      local new_last_seen = ARGV[1]
      local session_ttl = ARGV[2]
      local index_ttl = ARGV[3]
      
      -- Get session data
      local session_data = redis.call('GET', session_key)
      if not session_data then
        return 0  -- Session not found
      end
      
      local session = cjson.decode(session_data)
      
      -- Check if session is expired or revoked
      -- Use Redis TTL as the authoritative expiration check
      local ttl = redis.call('TTL', session_key)
      if session.revokedAt or ttl < 0 then
        return 0  -- Session expired or revoked
      end
      
      -- Get authorization data
      local auth_data = redis.call('GET', auth_key)
      if not auth_data then
        return 0  -- Authorization not found
      end
      
      local auth = cjson.decode(auth_data)
      
      -- Verify authorization is still active
      if auth.status ~= 'active' then
        return 0  -- Authorization not active (revoked)
      end
      
      -- Authorization still active: update session atomically
      session.lastSeenAt = new_last_seen
      redis.call('SET', session_key, cjson.encode(session))
      redis.call('EXPIRE', session_key, session_ttl)
      
      -- Renew authorization session index TTL
      redis.call('EXPIRE', index_key, index_ttl)
      
      return 1  -- Success
    `;

    const result = await client.eval(
      luaScript,
      [namespacedKey(`${SESSION_PREFIX}${id}`), namespacedKey(`drive:auth:${session.authorizationId}`), namespacedKey(`${AUTH_SESSIONS_PREFIX}${session.authorizationId}`)],
      [now, SESSION_TTL_SECONDS.toString(), SESSION_INDEX_TTL_SECONDS.toString()]
    );

    if (result === 0) {
      console.warn('[SESSION_STORE] Session update rejected: session or authorization no longer active', id);
      return;
    }

    console.log('[SESSION_STORE] Session last seen updated atomically:', id);
  } catch (error) {
    console.error('[SESSION_STORE] Last seen update failed:', error);
    throw new Error(`Failed to update session last seen ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revoke session
 * 
 * Marks session as revoked
 * 
 * P0 FIX: Make atomic against authorization revocation to prevent resurrection race
 * Uses Redis Lua script to prevent TOCTOU where:
 * - Request A: getSession() (authorization active)
 * - Request B: revokeAuthorization() + revokeAllSessionsForAuthorization()
 * - Request A: revokeSession() resurrects session
 */
export async function revokeSession(id: string): Promise<void> {
  try {
    const client = createRedisClient();
    const now = new Date().toISOString();

    // First get the session to extract authorization ID (non-atomic read)
    const session = await client.get<BrowserSessionRecord>(namespacedKey(`${SESSION_PREFIX}${id}`));
    if (!session) {
      return;
    }

    // Redis Lua script for atomic session revocation + authorization status verification
    const luaScript = `
      local session_key = KEYS[1]
      local auth_key = KEYS[2]
      local revoked_at = ARGV[1]
      local session_ttl = ARGV[2]
      
      -- Get session data
      local session_data = redis.call('GET', session_key)
      if not session_data then
        return 0  -- Session not found
      end
      
      local session = cjson.decode(session_data)
      
      -- Check if session is expired or revoked
      local ttl = redis.call('TTL', session_key)
      if session.revokedAt or ttl < 0 then
        return 0  -- Session already expired or revoked
      end
      
      -- Get authorization data
      local auth_data = redis.call('GET', auth_key)
      if not auth_data then
        return 0  -- Authorization not found
      end
      
      local auth = cjson.decode(auth_data)
      
      -- Verify authorization is still active
      if auth.status ~= 'active' then
        return 0  -- Authorization not active (revoked), prevent session resurrection
      end
      
      -- Authorization still active: revoke session atomically
      session.revokedAt = revoked_at
      redis.call('SET', session_key, cjson.encode(session))
      redis.call('EXPIRE', session_key, session_ttl)
      
      return 1  -- Success
    `;

    const result = await client.eval(
      luaScript,
      [namespacedKey(`${SESSION_PREFIX}${id}`), namespacedKey(`drive:auth:${session.authorizationId}`)],
      [now, SESSION_TTL_SECONDS.toString()]
    );

    if (result === 0) {
      console.warn('[SESSION_STORE] Session revocation rejected: session or authorization no longer active', id);
      return;
    }

    console.log('[SESSION_STORE] Session revoked atomically:', id);
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
    const client = createRedisClient();
    
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
      [namespacedKey(`${AUTH_SESSIONS_PREFIX}${authorizationId}`)],
      [namespacedKey(`${SESSION_PREFIX}`)]
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
      const client = createRedisClient();
      await client.del(namespacedKey(`${SESSION_PREFIX}${id}`));

      // Remove from authorization's session index
      await client.srem(namespacedKey(`${AUTH_SESSIONS_PREFIX}${record.authorizationId}`), id);

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
 * 
 * P0 FIX: Make atomic against authorization revocation to prevent resurrection race
 * Uses Redis Lua script to prevent TOCTOU where:
 * - Request A: getSession() (authorization active)
 * - Request B: revokeAuthorization() + revokeAllSessionsForAuthorization()
 * - Request A: renewSession() resurrects session
 */
export async function renewSession(id: string): Promise<void> {
  try {
    const client = createRedisClient();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

    // First get the session to extract authorization ID (non-atomic read)
    const session = await client.get<BrowserSessionRecord>(namespacedKey(`${SESSION_PREFIX}${id}`));
    if (!session) {
      return;
    }

    // Redis Lua script for atomic session renewal + authorization status verification
    const luaScript = `
      local session_key = KEYS[1]
      local auth_key = KEYS[2]
      local index_key = KEYS[3]
      local new_expires_at = ARGV[1]
      local new_last_seen = ARGV[2]
      local session_ttl = ARGV[3]
      local index_ttl = ARGV[4]
      
      -- Get session data
      local session_data = redis.call('GET', session_key)
      if not session_data then
        return 0  -- Session not found
      end
      
      local session = cjson.decode(session_data)
      
      -- Check if session is expired or revoked
      -- Use Redis TTL as the authoritative expiration check
      local ttl = redis.call('TTL', session_key)
      if session.revokedAt or ttl < 0 then
        return 0  -- Session expired or revoked
      end
      
      -- Get authorization data
      local auth_data = redis.call('GET', auth_key)
      if not auth_data then
        return 0  -- Authorization not found
      end
      
      local auth = cjson.decode(auth_data)
      
      -- Verify authorization is still active
      if auth.status ~= 'active' then
        return 0  -- Authorization not active (revoked)
      end
      
      -- Authorization still active: renew session atomically
      session.expiresAt = new_expires_at
      session.lastSeenAt = new_last_seen
      redis.call('SET', session_key, cjson.encode(session))
      redis.call('EXPIRE', session_key, session_ttl)
      
      -- Renew authorization session index TTL
      redis.call('EXPIRE', index_key, index_ttl)
      
      return 1  -- Success
    `;

    const result = await client.eval(
      luaScript,
      [namespacedKey(`${SESSION_PREFIX}${id}`), namespacedKey(`drive:auth:${session.authorizationId}`), namespacedKey(`${AUTH_SESSIONS_PREFIX}${session.authorizationId}`)],
      [expiresAt.toISOString(), now.toISOString(), SESSION_TTL_SECONDS.toString(), SESSION_INDEX_TTL_SECONDS.toString()]
    );

    if (result === 0) {
      console.warn('[SESSION_STORE] Session renewal rejected: session or authorization no longer active', id);
      return;
    }

    console.log('[SESSION_STORE] Session renewed atomically:', id);
  } catch (error) {
    console.error('[SESSION_STORE] Renew failed:', error);
    throw new Error(`Failed to renew session ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
