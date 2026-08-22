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
import { encrypt, decrypt, validateEncryptionEnvelope, rotateKey, type EncryptionEnvelope } from './encryption';

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
 * Store authorization record
 */
export async function storeAuthorization(record: GoogleAuthorizationRecord): Promise<void> {
  if (!validateAuthorizationRecord(record)) {
    throw new Error('Invalid GoogleAuthorizationRecord schema');
  }
  
  try {
    const client = getRedisClient();
    await client.set(`${AUTH_PREFIX}${record.id}`, record);
    await client.expire(`${AUTH_PREFIX}${record.id}`, AUTH_TTL_SECONDS);
    
    console.log('[AUTH_STORE] Authorization stored:', record.id);
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
 * Returns the first active authorization for the given Google subject
 */
export async function findAuthorizationBySubject(googleSubject: string): Promise<GoogleAuthorizationRecord | null> {
  try {
    // This would require a secondary index in a real implementation
    // For now, we'll skip this and implement direct lookup by ID
    // P0 gap: Identity deduplication strategy deferred
    console.log('[AUTH_STORE] Subject lookup not yet implemented:', googleSubject);
    return null;
  } catch (error) {
    console.error('[AUTH_STORE] Subject lookup failed:', error);
    return null;
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
 */
export async function revokeAuthorization(id: string): Promise<void> {
  try {
    const auth = await getAuthorization(id);
    if (auth) {
      auth.status = 'revoked';
      auth.updatedAt = new Date().toISOString();
      await storeAuthorization(auth);
      console.log('[AUTH_STORE] Authorization revoked:', id);
    }
  } catch (error) {
    console.error('[AUTH_STORE] Revoke failed:', error);
    throw new Error(`Failed to revoke authorization ${id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete authorization record
 * 
 * WARNING: This destroys forensic evidence
 * Use revokeAuthorization instead for most cases
 */
export async function deleteAuthorization(id: string): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(`${AUTH_PREFIX}${id}`);
    console.log('[AUTH_STORE] Authorization deleted:', id);
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
