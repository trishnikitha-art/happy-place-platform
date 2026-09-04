/**
 * Drive Authorization Repository
 *
 * Server-side storage for Google OAuth authorization records.
 * 
 * Constitutional authority for authorization records:
 * - Encrypted access token and refresh token
 * - Provider identity (googleSubject, email)
 * - Authorization lifecycle management
 * - Server-side persistence (Redis KV)
 * - Separation from media authority
 * 
 * Authorization records are infrastructure layer, NOT media authority.
 */

import { Redis } from '@upstash/redis';
import crypto from 'crypto';
import { encrypt, decrypt, type EncryptionEnvelope } from './encryption';

// Re-export encryption utilities for oauth-manager
export { decrypt, type EncryptionEnvelope };

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
 */
function getKvNamespace(): string {
  // Check for test namespace override (integration tests)
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
 * P0 FIX: Eliminate process-global mutable state
 * Create fresh Redis client on each call to prevent identity leaks
 * and cross-request contamination
 */
function getRedisClient(): Redis {
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
  
  // Create fresh client on each call (no global cache)
  return new Redis({ url, token });
}

// Redis namespace (P1-9: Environment isolation applied)
const AUTH_PREFIX = 'drive:auth:';
const AUTH_SUBJECT_PREFIX = 'drive:auth:subject:';

// Authorization TTL: 30 days (browser session lifetime)
// This is Redis retention, NOT Google refresh token validity
const AUTH_TTL_SECONDS = 30 * 24 * 60 * 60;

/**
 * Google Authorization Record
 * 
 * Server-side encrypted credential storage
 */
export interface GoogleAuthorizationRecord {
  id: string; // crypto.randomUUID()
  provider: 'google';
  googleSubject: string; // From Google OAuth token response
  email: string; // From Google OAuth token response
  scopes: string[]; // From Google OAuth token response
  encryptedAccessToken: string; // AES-256-GCM envelope as JSON string
  accessTokenExpiresAt: string; // ISO timestamp
  encryptedRefreshToken: string; // AES-256-GCM envelope as JSON string
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  lastUsedAt: string; // ISO timestamp
  lastRefreshAt: string; // ISO timestamp
  status: 'active' | 'revoked' | 'expired';
  keyVersion: number; // Encryption key version
}

/**
 * Validate GoogleAuthorizationRecord schema
 */
function validateAuthorizationRecord(data: unknown): data is GoogleAuthorizationRecord {
  if (!data || typeof data !== 'object') {
    return false;
  }
  
  const record = data as Record<string, unknown>;
  
  if (typeof record.id !== 'string' || record.id.trim().length === 0) {
    return false;
  }
  
  if (record.provider !== 'google') {
    return false;
  }
  
  if (typeof record.googleSubject !== 'string' || record.googleSubject.trim().length === 0) {
    return false;
  }
  
  if (typeof record.email !== 'string' || record.email.trim().length === 0) {
    return false;
  }
  
  if (!Array.isArray(record.scopes)) {
    return false;
  }
  
  if (typeof record.encryptedAccessToken !== 'string' || record.encryptedAccessToken.trim().length === 0) {
    return false;
  }
  
  if (typeof record.accessTokenExpiresAt !== 'string') {
    return false;
  }
  
  if (typeof record.encryptedRefreshToken !== 'string' || record.encryptedRefreshToken.trim().length === 0) {
    return false;
  }
  
  if (typeof record.createdAt !== 'string') {
    return false;
  }
  
  if (typeof record.updatedAt !== 'string') {
    return false;
  }
  
  if (typeof record.lastUsedAt !== 'string') {
    return false;
  }
  
  if (typeof record.lastRefreshAt !== 'string') {
    return false;
  }
  
  if (!['active', 'revoked', 'expired'].includes(record.status as string)) {
    return false;
  }
  
  if (typeof record.keyVersion !== 'number' || record.keyVersion < 0) {
    return false;
  }
  
  return true;
}

/**
 * Store authorization record with atomic subject index
 *
 * Uses Redis Lua transaction for atomic authorization + subject index write
 * Ensures subject index cannot point to non-existent authorization
 */
export async function storeAuthorization(record: GoogleAuthorizationRecord): Promise<void> {
  if (!validateAuthorizationRecord(record)) {
    throw new Error('Invalid GoogleAuthorizationRecord schema');
  }

  try {
    const client = getRedisClient();

    // Redis Lua script for atomic authorization + subject index write
    const luaScript = `
      local auth_key = KEYS[1]
      local subject_key = KEYS[2]
      local auth_data = ARGV[1]
      local subject_value = ARGV[2]
      local ttl = ARGV[3]

      -- Store authorization record
      redis.call('SET', auth_key, auth_data)
      redis.call('EXPIRE', auth_key, ttl)

      -- Store subject index
      redis.call('SET', subject_key, subject_value)
      redis.call('EXPIRE', subject_key, ttl)

      return 1
    `;

    await client.eval(
      luaScript,
      [namespacedKey(`${AUTH_PREFIX}${record.id}`), namespacedKey(`${AUTH_SUBJECT_PREFIX}${record.googleSubject}`)],
      [JSON.stringify(record), record.id, AUTH_TTL_SECONDS.toString()]
    );

    console.log('[AUTH_STORE] Authorization stored atomically:', record.id);
  } catch (error) {
    console.error('[AUTH_STORE] Store failed:', error);
    throw new Error(`Failed to store authorization ${record.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Retrieve authorization record by ID
 */
export async function getAuthorization(id: string): Promise<GoogleAuthorizationRecord | null> {
  try {
    const client = getRedisClient();
    const record = await client.get<GoogleAuthorizationRecord>(namespacedKey(`${AUTH_PREFIX}${id}`));
    
    if (!record) {
      return null;
    }
    
    if (!validateAuthorizationRecord(record)) {
      console.error('[AUTH_STORE] Invalid authorization record:', id);
      return null;
    }
    
    return record;
  } catch (error) {
    console.error('[AUTH_STORE] Get failed:', error);
    throw new Error(`Failed to retrieve authorization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Find authorization by Google subject
 *
 * Returns the authorization record for the given Google subject
 * Uses subject index for efficient lookup
 */
export async function findAuthorizationBySubject(googleSubject: string): Promise<GoogleAuthorizationRecord | null> {
  try {
    const client = getRedisClient();
    const authId = await client.get<string>(namespacedKey(`${AUTH_SUBJECT_PREFIX}${googleSubject}`));

    if (!authId) {
      console.log('[AUTH_STORE] No authorization found for subject:', googleSubject.substring(0, 8) + '...');
      return null;
    }

    const auth = await getAuthorization(authId);
    if (!auth) {
      console.error('[AUTH_STORE] Subject index corrupted, authorization not found:', authId);
      // Clean up corrupted index
      await client.del(namespacedKey(`${AUTH_SUBJECT_PREFIX}${googleSubject}`));
      return null;
    }

    console.log('[AUTH_STORE] Authorization found for subject:', googleSubject.substring(0, 8) + '...');
    return auth;
  } catch (error) {
    console.error('[AUTH_STORE] Subject lookup failed:', error);
    throw new Error(`Failed to find authorization by subject: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Upsert authorization (create or update)
 *
 * Deterministic reauthorization behavior with atomic subject acquisition:
 * - If authorization exists for googleSubject, update credentials
 * - If authorization does not exist, create new authorization
 * - If existing authorization is revoked, create new authorization
 * - Ensures one authoritative authorization per googleSubject
 * 
 * Uses atomic SET NX on subject index to prevent concurrent duplicate creation
 */
export async function upsertAuthorization(
  googleSubject: string,
  email: string,
  scopes: string[],
  accessToken: string,
  accessTokenExpiresAt: number,
  refreshToken: string,
  keyVersion: number = 0
): Promise<GoogleAuthorizationRecord> {
  try {
    console.log('[AUTH_STORE] Upsert authorization called', {
      googleSubject: googleSubject.substring(0, 8) + '...',
      email,
      scopesCount: scopes.length,
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      accessTokenExpiresAt: new Date(accessTokenExpiresAt).toISOString(),
      keyVersion,
    });

    // Check if authorization exists for subject
    const existingAuth = await findAuthorizationBySubject(googleSubject);

    console.log('[AUTH_STORE] Existing authorization check', {
      hasExistingAuth: !!existingAuth,
      existingAuthId: existingAuth?.id?.substring(0, 8) + '...' || 'none',
      existingAuthStatus: existingAuth?.status || 'none',
      existingAuthLastUsed: existingAuth?.lastUsedAt || 'none',
    });

    let auth: GoogleAuthorizationRecord;

    if (existingAuth) {
      if (existingAuth.status === 'revoked') {
        // Revoked authorization: create new authorization with atomic subject acquisition
        // CRITICAL: Use atomic subject acquisition even for revoked reauthorization
        // to prevent concurrent duplicate creation after revocation
        console.log('[AUTH_STORE] Existing authorization revoked, creating new authorization with atomic subject acquisition');
        auth = await createNewAuthorizationWithAtomicSubject(
          googleSubject,
          email,
          scopes,
          accessToken,
          accessTokenExpiresAt,
          refreshToken,
          keyVersion
        );
      } else {
        // Active authorization: update credentials in place
        console.log('[AUTH_STORE] Updating existing authorization credentials', {
          authId: existingAuth.id.substring(0, 8) + '...',
          status: existingAuth.status,
        });
        existingAuth.email = email;
        existingAuth.scopes = scopes;
        existingAuth.encryptedAccessToken = JSON.stringify(encrypt(accessToken, keyVersion));
        existingAuth.accessTokenExpiresAt = new Date(accessTokenExpiresAt).toISOString();
        existingAuth.encryptedRefreshToken = JSON.stringify(encrypt(refreshToken, keyVersion));
        existingAuth.lastRefreshAt = new Date().toISOString();
        existingAuth.lastUsedAt = new Date().toISOString();
        existingAuth.updatedAt = new Date().toISOString();
        existingAuth.keyVersion = keyVersion;

        // Redis Lua script for atomic authorization update with status verification
        const luaScript = `
          local auth_key = KEYS[1]
          local updated_auth_data = ARGV[1]
          local auth_ttl = ARGV[2]
          
          -- Get current authorization data
          local current_auth_data = redis.call('GET', auth_key)
          if not current_auth_data then
            return 0  -- Authorization not found
          end
          
          local current_auth = cjson.decode(current_auth_data)
          
          -- Verify authorization is still active
          if current_auth.status ~= 'active' then
            return 0  -- Authorization not active (revoked), prevent overwriting
          end
          
          -- Authorization still active: update atomically
          redis.call('SET', auth_key, updated_auth_data)
          redis.call('EXPIRE', auth_key, auth_ttl)
          
          return 1  -- Success
        `;

        const client = getRedisClient();
        const result = await client.eval(
          luaScript,
          [namespacedKey(`${AUTH_PREFIX}${existingAuth.id}`)],
          [JSON.stringify(existingAuth), AUTH_TTL_SECONDS.toString()]
        );

        if (result === 0) {
          console.warn('[AUTH_STORE] Authorization update rejected: authorization no longer active', existingAuth.id);
          throw new Error(`Authorization ${existingAuth.id} is not active - update rejected`);
        }

        console.log('[AUTH_STORE] Authorization update succeeded', {
          authId: existingAuth.id.substring(0, 8) + '...',
        });

        auth = existingAuth;
      }
    } else {
      // No existing authorization: create new with atomic subject acquisition
      console.log('[AUTH_STORE] Creating new authorization with atomic subject acquisition');
      auth = await createNewAuthorizationWithAtomicSubject(
        googleSubject,
        email,
        scopes,
        accessToken,
        accessTokenExpiresAt,
        refreshToken,
        keyVersion
      );
    }

    console.log('[AUTH_STORE] Upsert completed', {
      authId: auth.id.substring(0, 8) + '...',
      status: auth.status,
    });

    return auth;
  } catch (error) {
    console.error('[AUTH_STORE] Upsert failed:', error);
    throw new Error(`Failed to upsert authorization: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Create new authorization record
 */
async function createNewAuthorization(
  googleSubject: string,
  email: string,
  scopes: string[],
  accessToken: string,
  accessTokenExpiresAt: number,
  refreshToken: string,
  keyVersion: number
): Promise<GoogleAuthorizationRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  const auth: GoogleAuthorizationRecord = {
    id,
    provider: 'google',
    googleSubject,
    email,
    scopes,
    encryptedAccessToken: JSON.stringify(encrypt(accessToken, keyVersion)),
    accessTokenExpiresAt: new Date(accessTokenExpiresAt).toISOString(),
    encryptedRefreshToken: JSON.stringify(encrypt(refreshToken, keyVersion)),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    lastRefreshAt: now.toISOString(),
    status: 'active',
    keyVersion,
  };

  await storeAuthorization(auth);
  return auth;
}

/**
 * Create new authorization record with atomic subject acquisition
 * 
 * Uses Redis Lua transaction for atomic authorization + subject index write
 * Ensures only one authorization can be created per googleSubject
 * Eliminates race condition between subject acquisition and authorization storage
 */
async function createNewAuthorizationWithAtomicSubject(
  googleSubject: string,
  email: string,
  scopes: string[],
  accessToken: string,
  accessTokenExpiresAt: number,
  refreshToken: string,
  keyVersion: number
): Promise<GoogleAuthorizationRecord> {
  const id = crypto.randomUUID();
  const now = new Date();

  const auth: GoogleAuthorizationRecord = {
    id,
    provider: 'google',
    googleSubject,
    email,
    scopes,
    encryptedAccessToken: JSON.stringify(encrypt(accessToken, keyVersion)),
    accessTokenExpiresAt: new Date(accessTokenExpiresAt).toISOString(),
    encryptedRefreshToken: JSON.stringify(encrypt(refreshToken, keyVersion)),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    lastUsedAt: now.toISOString(),
    lastRefreshAt: now.toISOString(),
    status: 'active',
    keyVersion,
  };

  const client = getRedisClient();
  
  // Use Lua script for atomic authorization + subject index write
  // This ensures the subject index and authorization record are written atomically
  // Eliminates race condition where subject is acquired but authorization storage fails
  const luaScript = `
    local auth_key = KEYS[1]
    local subject_key = KEYS[2]
    local auth_data = ARGV[1]
    local subject_value = ARGV[2]
    local ttl = ARGV[3]

    -- Check if subject index already exists (concurrent check)
    local existing_subject = redis.call('GET', subject_key)
    if existing_subject then
      return 0  -- Subject already taken by another process
    end

    -- Store authorization record
    redis.call('SET', auth_key, auth_data)
    redis.call('EXPIRE', auth_key, ttl)

    -- Store subject index atomically
    redis.call('SET', subject_key, subject_value)
    redis.call('EXPIRE', subject_key, ttl)

    return 1  -- Success
  `;

  const result = await client.eval(
    luaScript,
    [namespacedKey(`${AUTH_PREFIX}${id}`), namespacedKey(`${AUTH_SUBJECT_PREFIX}${googleSubject}`)],
    [JSON.stringify(auth), id, AUTH_TTL_SECONDS.toString()]
  );

  if (result === 0) {
    // Subject already taken by another process, retry from the beginning
    console.log('[AUTH_STORE] Subject already taken, retrying');
    return upsertAuthorization(googleSubject, email, scopes, accessToken, accessTokenExpiresAt, refreshToken, keyVersion);
  }
  
  console.log('[AUTH_STORE] Authorization created with atomic subject acquisition');
  return auth;
}

/**
 * Update authorization after token refresh
 * 
 * P0 FIX: Make refresh conditional on status === 'active' to prevent overwriting revocation
 * Uses Redis Lua script to prevent race where:
 * - Request A: getAuthorization(active)
 * - Request B: revokeAuthorization() (sets status = revoked, deletes subject index)
 * - Request A: updateAuthorizationAfterRefresh() overwrites revocation
 *
 * Encrypts new access token and optionally new refresh token
 * Persists with updated timestamps
 */
export async function updateAuthorizationAfterRefresh(
  authId: string,
  accessToken: string,
  accessTokenExpiresAt: number,
  newRefreshToken?: string
): Promise<void> {
  try {
    const auth = await getAuthorization(authId);
    if (!auth) {
      throw new Error('Authorization not found');
    }
    
    // Encrypt access token
    const accessTokenEnvelope = encrypt(accessToken, auth.keyVersion);
    
    // Encrypt refresh token (preserve existing if not provided)
    let refreshTokenEnvelope: EncryptionEnvelope;
    if (newRefreshToken) {
      refreshTokenEnvelope = encrypt(newRefreshToken, auth.keyVersion);
    } else {
      // Decrypt existing refresh token
      const existingEnvelope = JSON.parse(auth.encryptedRefreshToken) as EncryptionEnvelope;
      refreshTokenEnvelope = existingEnvelope;
    }
    
    const now = new Date();
    const updatedAuth = {
      ...auth,
      encryptedAccessToken: JSON.stringify(accessTokenEnvelope),
      accessTokenExpiresAt: new Date(accessTokenExpiresAt).toISOString(),
      encryptedRefreshToken: JSON.stringify(refreshTokenEnvelope),
      lastRefreshAt: now.toISOString(),
      lastUsedAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    
    // Redis Lua script for atomic authorization update with status verification
    const luaScript = `
      local auth_key = KEYS[1]
      local updated_auth_data = ARGV[1]
      local auth_ttl = ARGV[2]
      
      -- Get current authorization data
      local current_auth_data = redis.call('GET', auth_key)
      if not current_auth_data then
        return 0  -- Authorization not found
      end
      
      local current_auth = cjson.decode(current_auth_data)
      
      -- Verify authorization is still active
      if current_auth.status ~= 'active' then
        return 0  -- Authorization not active (revoked), prevent overwriting
      end
      
      -- Authorization still active: update atomically
      redis.call('SET', auth_key, updated_auth_data)
      redis.call('EXPIRE', auth_key, auth_ttl)
      
      return 1  -- Success
    `;

    const client = getRedisClient();
    const result = await client.eval(
      luaScript,
      [namespacedKey(`${AUTH_PREFIX}${authId}`)],
      [JSON.stringify(updatedAuth), AUTH_TTL_SECONDS.toString()]
    );

    if (result === 0) {
      console.warn('[AUTH_STORE] Authorization refresh rejected: authorization no longer active', authId);
      throw new Error(`Authorization ${authId} is not active - refresh rejected`);
    }
    
    console.log('[AUTH_STORE] Authorization updated after refresh with status verification:', authId);
  } catch (error) {
    console.error('[AUTH_STORE] Update failed:', error);
    throw new Error(`Failed to update authorization ${authId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revoke authorization
 *
 * Marks authorization as revoked
 * Does NOT delete the record (preserves forensic evidence)
 * Cleans up subject index to prevent reauthorization of revoked identity
 *
 * P0 FIX: Make revocation atomic to prevent subject index resurrection
 * Uses Redis Lua script to prevent gap where:
 * - authorization revoked
 * - subject index temporarily points to revoked auth
 * - concurrent subject acquisition could resurrect
 *
 * NOTE: Session revocation should be called separately via revokeAllSessionsForAuthorization
 * This avoids circular dependency between auth and session modules
 */
export async function revokeAuthorization(id: string): Promise<void> {
  try {
    // First get the authorization to extract googleSubject (non-atomic read)
    const auth = await getAuthorization(id);
    if (!auth) {
      console.warn('[AUTH_STORE] Authorization not found for revocation:', id);
      return;
    }

    const client = getRedisClient();
    
    // Redis Lua script for atomic authorization revocation + subject index deletion
    const luaScript = `
      local auth_key = KEYS[1]
      local subject_index_key = KEYS[2]
      local auth_ttl = ARGV[1]
      
      -- Get current authorization data
      local auth_data = redis.call('GET', auth_key)
      if not auth_data then
        return 0  -- Authorization not found
      end
      
      local auth = cjson.decode(auth_data)
      
      -- Set authorization status to revoked
      auth.status = 'revoked'
      auth.updatedAt = redis.call('TIME')[1]
      redis.call('SET', auth_key, cjson.encode(auth))
      redis.call('EXPIRE', auth_key, auth_ttl)
      
      -- Delete subject index atomically (prevents subject resurrection)
      redis.call('DEL', subject_index_key)
      
      return 1  -- Success
    `;

    const result = await client.eval(
      luaScript,
      [namespacedKey(`drive:auth:${id}`), namespacedKey(`${AUTH_SUBJECT_PREFIX}${auth.googleSubject}`)],
      [AUTH_TTL_SECONDS.toString()]
    );

    if (result === 0) {
      console.warn('[AUTH_STORE] Authorization revocation rejected: authorization not found', id);
      return;
    }

    console.log('[AUTH_STORE] Authorization revoked atomically:', id);
  } catch (error) {
    console.error('[AUTH_STORE] Revoke failed:', error);
    throw new Error(`Failed to revoke authorization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revoke authorization and all associated sessions
 *
 * P0 FIX: Make revocation one atomic Redis transaction to prevent race conditions
 * Uses Redis Lua script to prevent gap where:
 * - authorization revoked
 * - sessions still exist (gap between operations)
 * - stale refresh could resurrect
 *
 * Atomic boundary:
 * 1. Set authorization status = revoked
 * 2. Delete subject index
 * 3. Delete session index
 * 4. Delete all session records
 * 
 * All in one transaction - no gap for resurrection
 */
export async function revokeAuthorizationWithSessions(id: string): Promise<void> {
  try {
    // First get the authorization to extract googleSubject (non-atomic read)
    const auth = await getAuthorization(id);
    if (!auth) {
      console.warn('[AUTH_STORE] Authorization not found for revocation:', id);
      return;
    }

    const client = getRedisClient();
    
    // Redis Lua script for atomic authorization + session revocation
    const luaScript = `
      local auth_key = KEYS[1]
      local subject_index_key = KEYS[2]
      local session_index_key = KEYS[3]
      local session_prefix = ARGV[1]
      local auth_ttl = ARGV[2]
      
      -- Get current authorization data
      local auth_data = redis.call('GET', auth_key)
      if not auth_data then
        return 0  -- Authorization not found
      end
      
      local auth = cjson.decode(auth_data)
      
      -- Set authorization status to revoked
      auth.status = 'revoked'
      auth.updatedAt = redis.call('TIME')[1]
      redis.call('SET', auth_key, cjson.encode(auth))
      redis.call('EXPIRE', auth_key, auth_ttl)
      
      -- Delete subject index (prevents reauthorization)
      redis.call('DEL', subject_index_key)
      
      -- Get all session IDs from session index
      local session_ids = redis.call('SMEMBERS', session_index_key)
      
      -- Delete session index
      redis.call('DEL', session_index_key)
      
      -- Delete all session records
      for i, session_id in ipairs(session_ids) do
        local session_key = session_prefix .. session_id
        redis.call('DEL', session_key)
      end
      
      -- Return count of revoked sessions
      return #session_ids
    `;

    const result = await client.eval(
      luaScript,
      [namespacedKey(`drive:auth:${id}`), namespacedKey(`${AUTH_SUBJECT_PREFIX}${auth.googleSubject}`), namespacedKey(`drive:auth:sessions:${id}`)],
      [namespacedKey(`drive:session:`), AUTH_TTL_SECONDS.toString()]
    );

    const revokedCount = result as number;
    console.log('[AUTH_STORE] Authorization and sessions revoked atomically:', id, 'sessions:', revokedCount);
  } catch (error) {
    console.error('[AUTH_STORE] Revoke with sessions failed:', error);
    throw new Error(`Failed to revoke authorization with sessions ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete authorization record
 *
 * WARNING: This destroys forensic evidence
 * Use revokeAuthorization instead for most cases
 * Cleans up subject index and session index when deleting
 */
export async function deleteAuthorization(id: string): Promise<void> {
  try {
    const auth = await getAuthorization(id);
    if (auth) {
      const client = getRedisClient();
      await client.del(namespacedKey(`${AUTH_PREFIX}${id}`));
      await client.del(namespacedKey(`${AUTH_SUBJECT_PREFIX}${auth.googleSubject}`));

      // Clean up session index
      await client.del(namespacedKey(`drive:auth:sessions:${id}`));

      console.log('[AUTH_STORE] Authorization deleted:', id);
    }
  } catch (error) {
    console.error('[AUTH_STORE] Delete failed:', error);
    throw new Error(`Failed to delete authorization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract access token from encrypted storage
 */
export async function getAccessToken(authId: string): Promise<string | null> {
  try {
    const auth = await getAuthorization(authId);
    if (!auth || auth.status !== 'active') {
      return null;
    }
    
    // Decrypt access token
    const envelope = JSON.parse(auth.encryptedAccessToken) as EncryptionEnvelope;
    const accessToken = decrypt(envelope);
    
    return accessToken;
  } catch (error) {
    console.error('[AUTH_STORE] Access token decryption failed:', error);
    return null;
  }
}

/**
 * Extract refresh token from encrypted storage
 */
export async function getRefreshToken(authId: string): Promise<string | null> {
  try {
    const auth = await getAuthorization(authId);
    if (!auth || auth.status !== 'active') {
      return null;
    }
    
    // Decrypt refresh token
    const envelope = JSON.parse(auth.encryptedRefreshToken) as EncryptionEnvelope;
    const refreshToken = decrypt(envelope);
    
    return refreshToken;
  } catch (error) {
    console.error('[AUTH_STORE] Refresh token decryption failed:', error);
    return null;
  }
}

/**
 * Check if access token is expired
 */
export async function isAccessTokenExpired(authId: string): Promise<boolean> {
  try {
    const auth = await getAuthorization(authId);
    if (!auth) {
      return true;
    }
    
    const expiresAt = new Date(auth.accessTokenExpiresAt);
    // Add 60 second buffer for clock skew
    return new Date() >= new Date(expiresAt.getTime() - 60000);
  } catch (error) {
    console.error('[AUTH_STORE] Expiry check failed:', error);
    return true;
  }
}

/**
 * Update last used timestamp
 * 
 * P0 FIX: Make atomic against authorization revocation to prevent subject index resurrection
 * Uses Redis Lua script to prevent race where:
 * - Request A: getAuthorization(active)
 * - Request B: revokeAuthorization() (sets status=revoked, deletes subject index)
 * - Request A: updateLastUsed() re-establishes subject index via storeAuthorization()
 */
export async function updateLastUsed(authId: string): Promise<void> {
  try {
    const client = getRedisClient();
    const now = new Date().toISOString();

    // Redis Lua script for atomic last used update with status verification
    const luaScript = `
      local auth_key = KEYS[1]
      local new_last_used = ARGV[1]
      local auth_ttl = ARGV[2]
      
      -- Get current authorization data
      local auth_data = redis.call('GET', auth_key)
      if not auth_data then
        return 0  -- Authorization not found
      end
      
      local auth = cjson.decode(auth_data)
      
      -- Verify authorization is still active
      if auth.status ~= 'active' then
        return 0  -- Authorization not active (revoked), prevent update
      end
      
      -- Authorization still active: update last used atomically
      auth.lastUsedAt = new_last_used
      redis.call('SET', auth_key, cjson.encode(auth))
      redis.call('EXPIRE', auth_key, auth_ttl)
      
      return 1  -- Success
    `;

    const result = await client.eval(
      luaScript,
      [namespacedKey(`${AUTH_PREFIX}${authId}`)],
      [now, AUTH_TTL_SECONDS.toString()]
    );

    if (result === 0) {
      console.warn('[AUTH_STORE] Last used update rejected: authorization no longer active', authId);
      return;
    }

    console.log('[AUTH_STORE] Last used updated atomically:', authId);
  } catch (error) {
    console.error('[AUTH_STORE] Last used update failed:', error);
    throw new Error(`Failed to update last used for authorization ${authId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
