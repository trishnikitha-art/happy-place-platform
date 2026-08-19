/**
 * Workbench Session Authority
 * 
 * Simple session-based authentication for Workbench administrative access.
 * Uses httpOnly cookies for secure session management.
 * 
 * Separation of concerns:
 * - WorkbenchSession: Human/user session and Workbench access control
 * - DriveSession: Drive OAuth authorization (separate system)
 * 
 * Session identity:
 * - sessionId: UUID v4 (stable session identifier)
 * - authenticated: boolean
 * - expiresAt: timestamp
 */

import { cookies } from 'next/headers';

// Edge-compatible UUID v4 generator
function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export interface WorkbenchCredentials {
  sessionId: string;
  authenticated: boolean;
  expiresAt: number;
}

const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 hours
const WORKBENCH_PASSWORD = process.env.WORKBENCH_PASSWORD || 'admin'; // Environment variable for admin password

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
   */
  async authenticate(password: string): Promise<boolean> {
    if (password === WORKBENCH_PASSWORD) {
      const sessionId = randomUUID();
      const expiresAt = Date.now() + SESSION_DURATION;
      
      await this.setSession({
        sessionId,
        authenticated: true,
        expiresAt,
      });
      
      return true;
    }
    
    return false;
  }

  /**
   * Check if user is authenticated with Workbench
   */
  async isAuthenticated(): Promise<boolean> {
    const sessionId = await this.getCookie('workbench_session_id');
    const authenticated = await this.getCookie('workbench_authenticated');
    const expiresAt = await this.getCookie('workbench_expires_at');
    
    if (!sessionId || authenticated !== 'true' || !expiresAt) {
      return false;
    }
    
    // Check if session is expired
    const expiryDate = parseInt(expiresAt, 10);
    if (Date.now() >= expiryDate) {
      await this.clearSession();
      return false;
    }
    
    return true;
  }

  /**
   * Get current session credentials
   */
  async getCredentials(): Promise<WorkbenchCredentials | null> {
    const sessionId = await this.getCookie('workbench_session_id');
    const authenticated = await this.getCookie('workbench_authenticated');
    const expiresAt = await this.getCookie('workbench_expires_at');
    
    if (!sessionId || authenticated !== 'true' || !expiresAt) {
      return null;
    }
    
    return {
      sessionId,
      authenticated: authenticated === 'true',
      expiresAt: parseInt(expiresAt, 10),
    };
  }

  /**
   * Set session in cookies
   */
  private async setSession(credentials: WorkbenchCredentials): Promise<void> {
    const cookieStore = await cookies();

    // Set session ID
    cookieStore.set('workbench_session_id', credentials.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    // Set authenticated flag
    cookieStore.set('workbench_authenticated', credentials.authenticated.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });

    // Set expiry
    cookieStore.set('workbench_expires_at', credentials.expiresAt.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_DURATION / 1000,
      path: '/',
    });
  }

  /**
   * Clear session (logout)
   */
  async clearSession(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.delete('workbench_session_id');
    cookieStore.delete('workbench_authenticated');
    cookieStore.delete('workbench_expires_at');
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
