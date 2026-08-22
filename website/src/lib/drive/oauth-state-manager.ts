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
  browserBinding: string; // Browser session/nonce for CSRF protection
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

  if (typeof record.browserBinding !== 'string' || record.browserBinding.length === 0) {
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
 * Generate browser binding nonce
 *
 * Returns 16-byte random hex string for browser session binding
 */
export function generateBrowserBinding(): string {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Create OAuth state record with browser binding
 *
 * Stores state in Redis with 5-minute TTL
 * State is not yet consumed
 *
 * @param browserBinding - Optional browser session/nonce for CSRF protection (generated if not provided)
 */
export async function createState(browserBinding?: string): Promise<string> {
  const state = generateState();
  const actualBrowserBinding = browserBinding || generateBrowserBinding();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STATE_TTL_SECONDS * 1000);

  const record: OAuthStateRecord = {
    state,
    browserBinding: actualBrowserBinding,
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
      browserBinding: actualBrowserBinding.substring(0, 8) + '...',
      expiresAt: expiresAt.toISOString(),
    });

    return state;
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to create state:', error);
    throw new Error(`Failed to create OAuth state: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate OAuth state with browser binding
 *
 * Checks if state exists, not expired, not consumed, and browser binding matches
 * Does NOT consume the state
 *
 * @param state - OAuth state string
 * @param browserBinding - Browser session/nonce to validate against (optional for backward compatibility)
 */
export async function validateState(state: string, browserBinding?: string): Promise<boolean> {
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

    if (browserBinding && record.browserBinding !== browserBinding) {
      console.log('[OAUTH_STATE] Browser binding mismatch:', state.substring(0, 8) + '...');
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
 * Consume OAuth state atomically using Redis Lua
 *
 * Marks state as consumed if valid in a single atomic operation
 * Returns true if state was valid and consumed
 * Returns false if state was invalid, expired, already consumed, or browser binding mismatch
 *
 * Uses Redis Lua script for true atomicity:
 * - Check state exists
 * - Check not expired
 * - Check not consumed
 * - Check browser binding matches
 * - Mark as consumed
 * - All in one atomic operation
 *
 * Under concurrent requests, exactly one consumer will succeed
 *
 * @param state - OAuth state string
 * @param browserBinding - Browser session/nonce to validate against
 */
export async function consumeState(state: string, browserBinding: string): Promise<boolean> {
  try {
    const client = getRedisClient();

    // Redis Lua script for atomic state consumption (Upstash-compatible)
    // Note: We skip timestamp expiry check in Lua for Upstash compatibility
    // Expiry is enforced by Redis TTL at the storage layer
    const luaScript = `
      local key = KEYS[1]
      local state_arg = ARGV[1]
      local browser_binding_arg = ARGV[2]

      local record = redis.call('GET', key)
      if not record then
        return 0
      end

      local decoded = cjson.decode(record)

      -- Check if already consumed
      if decoded.consumed == true then
        return 0
      end

      -- Check browser binding
      if decoded.browserBinding ~= browser_binding_arg then
        return 0
      end

      -- Mark as consumed atomically
      decoded.consumed = true
      redis.call('SET', key, cjson.encode(decoded))

      return 1
    `;

    const result = await client.eval(
      luaScript,
      [`${STATE_PREFIX}${state}`],
      [state, browserBinding]
    );

    if (result === 1) {
      console.log('[OAUTH_STATE] State consumed atomically:', state.substring(0, 8) + '...');
      return true;
    } else {
      console.log('[OAUTH_STATE] Consume failed (atomic check):', state.substring(0, 8) + '...');
      return false;
    }
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to consume state atomically:', error);
    throw new Error(`Redis infrastructure failure during state consumption: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
