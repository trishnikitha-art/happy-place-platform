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
    // Fail closed in production if password not configured
    if (!isPasswordConfigured()) {
      console.error('[WORKBENCH_SESSION] AUTHENTICATION_BLOCKED: Password not configured');
      return false;
    }

    // Use configured password or development fallback
    const effectivePassword = WORKBENCH_PASSWORD || DEV_FALLBACK_PASSWORD;

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
        const client = getRedisClient();
        await client.set(`workbench_session:${sessionId}`, JSON.stringify(sessionData), {
          ex: SESSION_DURATION / 1000, // Set TTL to match session duration
        });
        
        // Set only opaque session ID in cookie
        await this.setSessionCookie(sessionId);
        
        return true;
      } catch (error) {
        console.error('[WORKBENCH_SESSION] Failed to store session in Redis:', error);
        // Fail closed if Redis is unavailable
        return false;
      }
    }
    
    return false;
  }

  /**
   * Check if user is authenticated with Workbench
   * Validates session ID against server-side session data
   */
  async isAuthenticated(): Promise<boolean> {
    const sessionId = await this.getCookie('workbench_session_id');
    
    if (!sessionId) {
      return false;
    }
    
    try {
      const client = getRedisClient();
      const sessionData = await client.get(`workbench_session:${sessionId}`);
      
      if (!sessionData) {
        // Session not found in Redis (expired or invalid)
        return false;
      }
      
      // Parse session data
      const parsedSession = typeof sessionData === 'string' 
        ? JSON.parse(sessionData) 
        : sessionData;
      
      // Check if session is expired
      if (Date.now() >= parsedSession.expiresAt) {
        await this.clearSession(sessionId);
        return false;
      }
      
      // Verify authenticated flag is true (server-side, not client-controlled)
      return parsedSession.authenticated === true;
    } catch (error) {
      console.error('[WORKBENCH_SESSION] Failed to validate session:', error);
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
      const client = getRedisClient();
      const sessionData = await client.get(`workbench_session:${sessionId}`);
      
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
   * Set opaque session ID in cookie (server-side data in Redis)
   */
  private async setSessionCookie(sessionId: string): Promise<void> {
    const cookieStore = await cookies();

    // Set only opaque session ID in cookie
    cookieStore.set('workbench_session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });
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
        const client = getRedisClient();
        await client.del(`workbench_session:${sessionId}`);
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
      return cookie?.value || null;
    } catch {
      // Cookies might not be available in all contexts
      return null;
    }
  }
}

export const workbenchSession = WorkbenchSession.getInstance();
