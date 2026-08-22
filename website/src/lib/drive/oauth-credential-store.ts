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
      [`${AUTH_PREFIX}${record.id}`, `${AUTH_SUBJECT_PREFIX}${record.googleSubject}`],
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
    const record = await client.get<GoogleAuthorizationRecord>(`${AUTH_PREFIX}${id}`);
    
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
    const authId = await client.get<string>(`${AUTH_SUBJECT_PREFIX}${googleSubject}`);

    if (!authId) {
      console.log('[AUTH_STORE] No authorization found for subject:', googleSubject.substring(0, 8) + '...');
      return null;
    }

    const auth = await getAuthorization(authId);
    if (!auth) {
      console.error('[AUTH_STORE] Subject index corrupted, authorization not found:', authId);
      // Clean up corrupted index
      await client.del(`${AUTH_SUBJECT_PREFIX}${googleSubject}`);
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
    // Check if authorization exists for subject
    const existingAuth = await findAuthorizationBySubject(googleSubject);

    let auth: GoogleAuthorizationRecord;

    if (existingAuth) {
      if (existingAuth.status === 'revoked') {
        // Revoked authorization: create new authorization
        console.log('[AUTH_STORE] Existing authorization revoked, creating new authorization');
        auth = await createNewAuthorization(
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
        console.log('[AUTH_STORE] Updating existing authorization credentials');
        existingAuth.email = email;
        existingAuth.scopes = scopes;
        existingAuth.encryptedAccessToken = JSON.stringify(encrypt(accessToken, keyVersion));
        existingAuth.accessTokenExpiresAt = new Date(accessTokenExpiresAt).toISOString();
        existingAuth.encryptedRefreshToken = JSON.stringify(encrypt(refreshToken, keyVersion));
        existingAuth.lastRefreshAt = new Date().toISOString();
        existingAuth.lastUsedAt = new Date().toISOString();
        existingAuth.updatedAt = new Date().toISOString();
        existingAuth.keyVersion = keyVersion;

        // Update directly without recreating index (subject index already points to this ID)
        const client = getRedisClient();
        await client.set(`${AUTH_PREFIX}${existingAuth.id}`, existingAuth);
        await client.expire(`${AUTH_PREFIX}${existingAuth.id}`, AUTH_TTL_SECONDS);

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
 * Uses atomic SET NX on subject index to prevent concurrent duplicate creation
 * Ensures only one authorization can be created per googleSubject
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
  
  // Atomic subject acquisition: SET NX on subject index
  // If this succeeds, we have the lock on this googleSubject
  const subjectAcquired = await client.set(`${AUTH_SUBJECT_PREFIX}${googleSubject}`, id, {
    nx: true,
    ex: AUTH_TTL_SECONDS,
  });

  if (!subjectAcquired) {
    // Another process acquired the subject, retry from the beginning
    console.log('[AUTH_STORE] Subject acquisition failed, retrying');
    return upsertAuthorization(googleSubject, email, scopes, accessToken, accessTokenExpiresAt, refreshToken, keyVersion);
  }

  // Subject acquired, store authorization record
  try {
    await client.set(`${AUTH_PREFIX}${id}`, auth);
    await client.expire(`${AUTH_PREFIX}${id}`, AUTH_TTL_SECONDS);
    
    console.log('[AUTH_STORE] Authorization created with atomic subject acquisition');
    return auth;
  } catch (error) {
    // Authorization storage failed, clean up subject index
    await client.del(`${AUTH_SUBJECT_PREFIX}${googleSubject}`);
    console.error('[AUTH_STORE] Authorization storage failed, cleaned up subject index:', error);
    throw new Error(`Failed to store authorization after subject acquisition: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update authorization after token refresh
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
    
    // Update record
    auth.encryptedAccessToken = JSON.stringify(accessTokenEnvelope);
    auth.accessTokenExpiresAt = new Date(accessTokenExpiresAt).toISOString();
    auth.encryptedRefreshToken = JSON.stringify(refreshTokenEnvelope);
    auth.lastRefreshAt = new Date().toISOString();
    auth.lastUsedAt = new Date().toISOString();
    auth.updatedAt = new Date().toISOString();
    
    await storeAuthorization(auth);
    console.log('[AUTH_STORE] Authorization updated after refresh:', authId);
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
 * NOTE: Session revocation should be called separately via revokeAllSessionsForAuthorization
 * This avoids circular dependency between auth and session modules
 */
export async function revokeAuthorization(id: string): Promise<void> {
  try {
    const auth = await getAuthorization(id);
    if (auth) {
      auth.status = 'revoked';
      auth.updatedAt = new Date().toISOString();
      await storeAuthorization(auth);

      // Clean up subject index to prevent reauthorization
      const client = getRedisClient();
      await client.del(`${AUTH_SUBJECT_PREFIX}${auth.googleSubject}`);

      console.log('[AUTH_STORE] Authorization revoked:', id);
    }
  } catch (error) {
    console.error('[AUTH_STORE] Revoke failed:', error);
    throw new Error(`Failed to revoke authorization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Revoke authorization and all associated sessions
 *
 * Combined operation for authorization-wide revocation
 * Calls revokeAuthorization and revokeAllSessionsForAuthorization
 */
export async function revokeAuthorizationWithSessions(id: string): Promise<void> {
  try {
    // Revoke authorization
    await revokeAuthorization(id);

    // Revoke all associated sessions
    const { revokeAllSessionsForAuthorization } = await import('./session-store');
    await revokeAllSessionsForAuthorization(id);

    console.log('[AUTH_STORE] Authorization and sessions revoked:', id);
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
      await client.del(`${AUTH_PREFIX}${id}`);
      await client.del(`${AUTH_SUBJECT_PREFIX}${auth.googleSubject}`);

      // Clean up session index
      await client.del(`drive:auth:sessions:${id}`);

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
 */
export async function updateLastUsed(authId: string): Promise<void> {
  try {
    const auth = await getAuthorization(authId);
    if (auth) {
      auth.lastUsedAt = new Date().toISOString();
      await storeAuthorization(auth);
    }
  } catch (error) {
    console.error('[AUTH_STORE] Last used update failed:', error);
  }
}
