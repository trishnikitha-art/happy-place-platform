/**
 * Workbench Session Authority
 * 
 * Server-side session-based authentication for Workbench administrative access.
 * Uses Redis/KV for server-side session storage with opaque session identifier in cookie.
 * 
 * Separation of concerns:
 * - WorkbenchSession: Human/user session and Workbench access control
 * - DriveSession: Drive OAuth authorization (separate system)
 * 
 * Session identity:
 * - sessionId: UUID v4 (opaque session identifier stored in cookie)
 * - sessionData: Server-side session record in Redis/KV
 * - authenticated: boolean (server-side, not client-controlled)
 * - expiresAt: timestamp (server-side, not client-controlled)
 */

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { Redis } from '@upstash/redis';
import { getEnvironment, getKvNamespace } from './environment';

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
  // Check if we're in Next.js production build phase
  // NEXT_PHASE is set by Next.js: 'phase-production-build' during static generation
  // During runtime, NEXT_PHASE is undefined or set to other values
  const isBuilding = process.env.NEXT_PHASE === 'phase-production-build';
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
  
  console.log('[WORKBENCH_SESSION] Created environment-bound client', {
    environment: env,
    namespace: getKvNamespace(),
  });
  
  return client;
}

// Cryptographically secure UUID v4 generator
function randomUUID(): string {
  return crypto.randomUUID();
}

export interface WorkbenchCredentials {
  sessionId: string;
  authenticated: boolean;
  expiresAt: number;
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours

// Fail closed: require explicit WORKBENCH_PASSWORD in production
const WORKBENCH_PASSWORD = process.env.WORKBENCH_PASSWORD;

// Development fallback for backwards compatibility
const DEV_FALLBACK_PASSWORD = 'admin';

function isPasswordConfigured(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return WORKBENCH_PASSWORD !== undefined && WORKBENCH_PASSWORD !== '';
  }
  // Development: allow unconfigured (uses fallback)
  return true;
}

export class WorkbenchSession {
  private static instance: WorkbenchSession;

  private constructor() {}

  static getInstance(): WorkbenchSession {
    if (!WorkbenchSession.instance) {
      WorkbenchSession.instance = new WorkbenchSession();
    }
    return WorkbenchSession.instance;
  }

  /**
   * Authenticate user with password
   * Stores session data server-side in Redis/KV, cookie contains only opaque session ID
   */
  async authenticate(password: string): Promise<boolean> {
    console.log('[WORKBENCH_SESSION] AUTHENTICATE_START', {
      environment: getEnvironment(),
      namespace: getKvNamespace(),
      hasPasswordConfigured: isPasswordConfigured(),
      isProduction: process.env.NODE_ENV === 'production',
    });

    // Fail closed in production if password not configured
    if (!isPasswordConfigured()) {
      console.error('[WORKBENCH_SESSION] AUTHENTICATION_BLOCKED: Password not configured');
      return false;
    }

    // Use configured password or development fallback
    const effectivePassword = WORKBENCH_PASSWORD || DEV_FALLBACK_PASSWORD;

    console.log('[WORKBENCH_SESSION] AUTHENTICATE_PASSWORD_CHECK', {
      isProduction: process.env.NODE_ENV === 'production',
      usingConfiguredPassword: !!WORKBENCH_PASSWORD,
      usingFallbackPassword: !WORKBENCH_PASSWORD,
    });

    if (password === effectivePassword) {
      const sessionId = randomUUID();
      const expiresAt = Date.now() + SESSION_DURATION;
      
      // Store session data server-side in Redis/KV
      const sessionData = {
        authenticated: true,
        expiresAt,
        createdAt: Date.now(),
      };
      
      try {
        const client = createRedisClient();
        const sessionKey = namespacedKey(`workbench_session:${sessionId}`);
        
        console.log('[WORKBENCH_SESSION] AUTHENTICATE_STORING_SESSION', {
          sessionId: `${sessionId.substring(0, 8)}...`,
          sessionKey,
          expiresAt,
          ttl: SESSION_DURATION / 1000,
        });
        
        await client.set(sessionKey, JSON.stringify(sessionData), {
          ex: SESSION_DURATION / 1000, // Set TTL to match session duration
        });
        
        console.log('[WORKBENCH_SESSION] AUTHENTICATE_SESSION_STORED', {
          sessionId: `${sessionId.substring(0, 8)}...`,
        });
        
        // Set only opaque session ID in cookie
        await this.setSessionCookie(sessionId);
        
        console.log('[WORKBENCH_SESSION] AUTHENTICATE_COOKIE_SET', {
          sessionId: `${sessionId.substring(0, 8)}...`,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
        });
        
        return true;
      } catch (error) {
        console.error('[WORKBENCH_SESSION] AUTHENTICATE_REDIS_ERROR', {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });
        // Fail closed if Redis is unavailable
        return false;
      }
    }
    
    console.log('[WORKBENCH_SESSION] AUTHENTICATE_PASSWORD_MISMATCH');
    return false;
  }

  /**
   * Check if user is authenticated with Workbench
   * Validates session ID against server-side session data
   */
  async isAuthenticated(): Promise<boolean> {
    const sessionId = await this.getCookie('workbench_session_id');
    
    console.log('[WORKBENCH_SESSION] AUTH_CHECK_START', {
      hasSessionId: !!sessionId,
      sessionId: sessionId ? `${sessionId.substring(0, 8)}...` : null,
      environment: getEnvironment(),
      namespace: getKvNamespace(),
    });
    
    if (!sessionId) {
      console.log('[WORKBENCH_SESSION] AUTH_CHECK_FAILED - No session cookie');
      return false;
    }
    
    try {
      const client = createRedisClient();
      const sessionKey = namespacedKey(`workbench_session:${sessionId}`);
      const sessionData = await client.get(sessionKey);
      
      console.log('[WORKBENCH_SESSION] AUTH_CHECK_REDIS_LOOKUP', {
        sessionKey,
        hasSessionData: !!sessionData,
        sessionDataType: typeof sessionData,
      });
      
      if (!sessionData) {
        // Session not found in Redis (expired or invalid)
        console.log('[WORKBENCH_SESSION] AUTH_CHECK_FAILED - Session not found in Redis');
        return false;
      }
      
      // Parse session data
      const parsedSession = typeof sessionData === 'string' 
        ? JSON.parse(sessionData) 
        : sessionData;
      
      console.log('[WORKBENCH_SESSION] AUTH_CHECK_SESSION_DATA', {
        authenticated: parsedSession.authenticated,
        expiresAt: parsedSession.expiresAt,
        isExpired: Date.now() >= parsedSession.expiresAt,
        createdAt: parsedSession.createdAt,
      });
      
      // Check if session is expired
      if (Date.now() >= parsedSession.expiresAt) {
        console.log('[WORKBENCH_SESSION] AUTH_CHECK_FAILED - Session expired');
        await this.clearSession(sessionId);
        return false;
      }
      
      // Verify authenticated flag is true (server-side, not client-controlled)
      const isAuth = parsedSession.authenticated === true;
      console.log('[WORKBENCH_SESSION] AUTH_CHECK_RESULT', { authenticated: isAuth });
      return isAuth;
    } catch (error) {
      console.error('[WORKBENCH_SESSION] AUTH_CHECK_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Fail closed if Redis is unavailable
      return false;
    }
  }

  /**
   * Get current session credentials
   * Returns server-side session data, not client cookies
   */
  async getCredentials(): Promise<WorkbenchCredentials | null> {
    const sessionId = await this.getCookie('workbench_session_id');
    
    if (!sessionId) {
      return null;
    }
    
    try {
      const client = createRedisClient();
      const sessionData = await client.get(namespacedKey(`workbench_session:${sessionId}`));
      
      if (!sessionData) {
        return null;
      }
      
      const parsedSession = typeof sessionData === 'string' 
        ? JSON.parse(sessionData) 
        : sessionData;
      
      return {
        sessionId,
        authenticated: parsedSession.authenticated === true,
        expiresAt: parsedSession.expiresAt,
      };
    } catch (error) {
      console.error('[WORKBENCH_SESSION] Failed to get session credentials:', error);
      return null;
    }
  }

  /**
   * Get session identity for authorization purposes
   * Returns session identity information for Drive/Drive object authorization
   */
  async getSessionIdentity(): Promise<{ sessionId: string; authenticated: boolean; email?: string } | null> {
    const credentials = await this.getCredentials();
    
    if (!credentials || !credentials.authenticated) {
      return null;
    }
    
    return {
      sessionId: credentials.sessionId,
      authenticated: credentials.authenticated,
      // Workbench sessions don't have email, this is for Drive authorization context
      // Drive authorization uses googleSubject from Drive session
    };
  }

  /**
   * Set opaque session ID in cookie (server-side data in Redis)
   */
  private async setSessionCookie(sessionId: string): Promise<void> {
    try {
      const cookieStore = await cookies();

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: SESSION_DURATION / 1000,
        path: '/',
      };

      console.log('[WORKBENCH_SESSION] SET_COOKIE_START', {
        sessionId: `${sessionId.substring(0, 8)}...`,
        cookieOptions,
        nodeEnv: process.env.NODE_ENV,
        vercelEnv: process.env.VERCEL_ENV,
      });

      // Set only opaque session ID in cookie
      cookieStore.set('workbench_session_id', sessionId, cookieOptions);

      console.log('[WORKBENCH_SESSION] SET_COOKIE_SUCCESS', {
        sessionId: `${sessionId.substring(0, 8)}...`,
      });
    } catch (error) {
      console.error('[WORKBENCH_SESSION] SET_COOKIE_ERROR', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Clear session (logout)
   * Removes both cookie and server-side session data
   */
  async clearSession(sessionId?: string): Promise<void> {
    const cookieStore = await cookies();

    // Clear cookie
    cookieStore.delete('workbench_session_id');
    
    // Clear server-side session data if sessionId provided
    if (sessionId) {
      try {
        const client = createRedisClient();
        await client.del(namespacedKey(`workbench_session:${sessionId}`));
      } catch (error) {
        console.error('[WORKBENCH_SESSION] Failed to clear session from Redis:', error);
      }
    }
  }

  /**
   * Helper to get cookie value
   */
  private async getCookie(name: string): Promise<string | null> {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(name);
      
      console.log('[WORKBENCH_SESSION] GET_COOKIE', {
        name,
        hasCookie: !!cookie,
        cookieValue: cookie ? `${cookie.value.substring(0, 8)}...` : null,
      });
      
      return cookie?.value || null;
    } catch (error) {
      console.error('[WORKBENCH_SESSION] GET_COOKIE_ERROR', {
        name,
        error: error instanceof Error ? error.message : String(error),
      });
      // Cookies might not be available in all contexts
      return null;
    }
  }
}

export const workbenchSession = WorkbenchSession.getInstance();
