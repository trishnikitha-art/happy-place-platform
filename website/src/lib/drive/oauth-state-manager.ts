/**
 * Drive OAuth State Authority
 *
 * Server-side OAuth state management for CSRF protection.
 * 
 * Constitutional authority for OAuth state:
 * - Cryptographically random state generation
 * - Browser-bound state validation (via HttpOnly cookie)
 * - One-time state consumption
 * - Server-side persistence (Redis KV)
 * - Atomic consume operation
 * 
 * Browser receives ONLY opaque state string.
 * Server validates and consumes state atomically.
 */

import { Redis } from '@upstash/redis';
import { cookies } from 'next/headers';
import crypto from 'crypto';

/**
 * OAuth State Validation Result
 * 
 * Distinguishes between security failures and infrastructure failures
 */
export enum StateValidationResult {
  STATE_VALID = 'STATE_VALID',
  STATE_INVALID = 'STATE_INVALID',
  STATE_EXPIRED = 'STATE_EXPIRED',
  STATE_REPLAYED = 'STATE_REPLAYED',
  STATE_BROWSER_MISMATCH = 'STATE_BROWSER_MISMATCH',
  STATE_MISSING = 'STATE_MISSING',
  STATE_MALFORMED = 'STATE_MALFORMED',
  STATE_INFRASTRUCTURE_ERROR = 'STATE_INFRASTRUCTURE_ERROR',
}

/**
 * OAuth State Validation Error
 * 
 * Thrown when infrastructure failures occur
 */
export class StateInfrastructureError extends Error {
  constructor(message: string, public readonly originalError?: Error) {
    super(message);
    this.name = 'StateInfrastructureError';
  }
}

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
const STATE_PREFIX = 'drive:oauth:state:';

// State TTL: 5 minutes (one-time use, short-lived)
const STATE_TTL_SECONDS = 5 * 60;

// Browser binding cookie name
const BROWSER_BINDING_COOKIE = 'drive_oauth_binding';

// Browser binding cookie TTL: 5 minutes (matches state TTL)
const BROWSER_BINDING_TTL_SECONDS = 5 * 60;

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
 * Get or create browser binding cookie
 *
 * Establishes or retrieves an HttpOnly browser binding cookie for CSRF protection.
 * The binding is cryptographically random and opaque.
 * 
 * @param cookieStore - Optional cookie store for testing
 * @returns Browser binding value
 */
export async function getOrCreateBrowserBinding(cookieStore?: Awaited<ReturnType<typeof cookies>>): Promise<string> {
  const actualCookieStore = cookieStore || await cookies();
  const existingBinding = actualCookieStore.get(BROWSER_BINDING_COOKIE);
  
  if (existingBinding) {
    return existingBinding.value;
  }
  
  // Create new browser binding
  const binding = generateBrowserBinding();
  const secureFlag = process.env.NODE_ENV === 'production';
  
  actualCookieStore.set(BROWSER_BINDING_COOKIE, binding, {
    httpOnly: true,
    secure: secureFlag,
    sameSite: 'lax',
    maxAge: BROWSER_BINDING_TTL_SECONDS,
    path: '/',
  });
  
  return binding;
}

/**
 * Get browser binding from cookie
 *
 * Retrieves the browser binding value from the HttpOnly cookie.
 * 
 * @param cookieStore - Optional cookie store for testing
 * @returns Browser binding value or null if not present
 */
export async function getBrowserBinding(cookieStore?: Awaited<ReturnType<typeof cookies>>): Promise<string | null> {
  const actualCookieStore = cookieStore || await cookies();
  const binding = actualCookieStore.get(BROWSER_BINDING_COOKIE);
  return binding?.value || null;
}

/**
 * Clear browser binding cookie
 *
 * Removes the browser binding cookie.
 * 
 * @param cookieStore - Optional cookie store for testing
 */
export async function clearBrowserBinding(cookieStore?: Awaited<ReturnType<typeof cookies>>): Promise<void> {
  const actualCookieStore = cookieStore || await cookies();
  actualCookieStore.delete(BROWSER_BINDING_COOKIE);
}

/**
 * Create OAuth state record with browser binding
 *
 * Stores state in Redis with 5-minute TTL using atomic SET NX EX operation
 * State is not yet consumed
 * 
 * Browser binding is obtained from HttpOnly cookie for CSRF protection
 * 
 * Uses atomic SET NX EX to ensure state record cannot exist without intended expiration
 * 
 * @param cookieStore - Optional cookie store for testing
 */
export async function createState(cookieStore?: Awaited<ReturnType<typeof cookies>>): Promise<string> {
  const state = generateState();
  const browserBinding = await getOrCreateBrowserBinding(cookieStore);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + STATE_TTL_SECONDS * 1000);

  const record: OAuthStateRecord = {
    state,
    browserBinding,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    consumed: false,
  };

  try {
    const client = getRedisClient();
    
    // Use atomic SET NX EX to ensure state record cannot exist without intended expiration
    // NX: Only set if key does not exist (prevents duplicate state creation)
    // EX: Set expiration time atomically with the value
    await client.set(`${STATE_PREFIX}${state}`, record, {
      nx: true,
      ex: STATE_TTL_SECONDS,
    });

    console.log('[OAUTH_STATE] State created');

    return state;
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to create state:', error);
    throw new StateInfrastructureError(
      'Redis infrastructure failure during state creation',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Validate OAuth state with browser binding
 *
 * Checks if state exists, not expired, not consumed, and browser binding matches
 * Does NOT consume the state
 * 
 * Browser binding is obtained from HttpOnly cookie
 * 
 * Returns explicit validation result to distinguish security from infrastructure failures
 *
 * @param state - OAuth state string
 * @param cookieStore - Optional cookie store for testing
 */
export async function validateState(state: string, cookieStore?: Awaited<ReturnType<typeof cookies>>): Promise<StateValidationResult> {
  try {
    const client = getRedisClient();
    const record = await client.get<OAuthStateRecord>(`${STATE_PREFIX}${state}`);

    if (!record) {
      console.log('[OAUTH_STATE] State not found');
      return StateValidationResult.STATE_MISSING;
    }

    if (!validateStateRecord(record)) {
      console.error('[OAUTH_STATE] Invalid state record');
      return StateValidationResult.STATE_MALFORMED;
    }

    if (record.consumed) {
      console.log('[OAUTH_STATE] State already consumed');
      return StateValidationResult.STATE_REPLAYED;
    }

    if (new Date(record.expiresAt) < new Date()) {
      console.log('[OAUTH_STATE] State expired');
      return StateValidationResult.STATE_EXPIRED;
    }

    const browserBinding = await getBrowserBinding(cookieStore);
    if (!browserBinding) {
      console.log('[OAUTH_STATE] Browser binding missing');
      return StateValidationResult.STATE_BROWSER_MISMATCH;
    }
    
    if (record.browserBinding !== browserBinding) {
      console.log('[OAUTH_STATE] Browser binding mismatch');
      return StateValidationResult.STATE_BROWSER_MISMATCH;
    }

    console.log('[OAUTH_STATE] State valid');
    return StateValidationResult.STATE_VALID;
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to validate state:', error);
    throw new StateInfrastructureError(
      'Redis infrastructure failure during state validation',
      error instanceof Error ? error : undefined
    );
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
 * - Check browser binding matches (from HttpOnly cookie)
 * - Mark as consumed
 * - All in one atomic operation
 *
 * Under concurrent requests, exactly one consumer will succeed
 *
 * @param state - OAuth state string
 * @param cookieStore - Optional cookie store for testing
 */
export async function consumeState(state: string, cookieStore?: Awaited<ReturnType<typeof cookies>>): Promise<boolean> {
  try {
    const client = getRedisClient();
    const browserBinding = await getBrowserBinding(cookieStore);
    
    if (!browserBinding) {
      console.log('[OAUTH_STATE] Browser binding missing from cookie');
      return false;
    }

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

      -- Mark as consumed atomically, preserving TTL
      decoded.consumed = true
      redis.call('SET', key, cjson.encode(decoded), 'KEEPTTL')

      return 1
    `;

    const result = await client.eval(
      luaScript,
      [`${STATE_PREFIX}${state}`],
      [state, browserBinding]
    );

    if (result === 1) {
      console.log('[OAUTH_STATE] State consumed atomically');
      return true;
    } else {
      console.log('[OAUTH_STATE] Consume failed (atomic check)');
      return false;
    }
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to consume state atomically:', error);
    throw new StateInfrastructureError(
      'Redis infrastructure failure during state consumption',
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Delete OAuth state
 *
 * Removes state from Redis immediately
 * Clears browser binding cookie
 * Used for cleanup or explicit revocation
 * 
 * @param state - OAuth state string
 * @param cookieStore - Optional cookie store for testing
 */
export async function deleteState(state: string, cookieStore?: Awaited<ReturnType<typeof cookies>>): Promise<void> {
  try {
    const client = getRedisClient();
    await client.del(`${STATE_PREFIX}${state}`);
    await clearBrowserBinding(cookieStore);
    console.log('[OAUTH_STATE] State deleted');
  } catch (error) {
    console.error('[OAUTH_STATE] Failed to delete state:', error);
    throw new StateInfrastructureError(
      'Redis infrastructure failure during state deletion',
      error instanceof Error ? error : undefined
    );
  }
}
