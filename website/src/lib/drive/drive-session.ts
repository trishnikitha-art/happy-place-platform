/**
 * Drive Session Authority
 * 
 * Constitutional authority for Google Drive OAuth session management.
 * 
 * Single source of truth for Drive credentials:
 * - Resolves opaque session ID to server-side authorization
 * - Reads from session repository and authorization repository
 * - Provides automatic token refresh
 * - All Drive services obtain credentials through this authority
 * 
 * Client-agnostic: PING90 credentials today, swap for client credentials later.
 */

import { cookies } from 'next/headers';
import { getAuthorization } from './oauth-credential-store';
import { getSession } from './session-store';
import { decrypt, type EncryptionEnvelope } from './encryption';

export interface DriveCredentials {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
  scope?: string;
}

export class DriveSession {
  private static instance: DriveSession;

  private constructor() {}

  static getInstance(): DriveSession {
    if (!DriveSession.instance) {
      DriveSession.instance = new DriveSession();
    }
    return DriveSession.instance;
  }

  /**
   * Check if user is authenticated with Drive
   * 
   * Authentication requires a valid session ID and active authorization.
   */
  async isAuthenticated(): Promise<boolean> {
    const sessionId = await this.getSessionId();
    if (!sessionId) {
      console.log('DriveSession.isAuthenticated(): no session ID');
      return false;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) {
        console.log('DriveSession.isAuthenticated(): session not found');
        return false;
      }

      const authorization = await getAuthorization(session.authorizationId);
      if (!authorization || authorization.status !== 'active') {
        console.log('DriveSession.isAuthenticated(): authorization not active');
        return false;
      }

      console.log('DriveSession.isAuthenticated(): session and authorization valid');
      return true;
    } catch (error) {
      console.error('DriveSession.isAuthenticated(): error', error);
      return false;
    }
  }

  /**
   * Get current credentials from session and authorization repositories
   * 
   * Resolves session ID → session → authorization → decrypted credentials
   */
  async getCredentials(): Promise<DriveCredentials | null> {
    const sessionId = await this.getSessionId();
    if (!sessionId) {
      console.log('DriveSession.getCredentials(): no session ID');
      return null;
    }

    try {
      const session = await getSession(sessionId);
      if (!session) {
        console.log('DriveSession.getCredentials(): session not found');
        return null;
      }

      const authorization = await getAuthorization(session.authorizationId);
      if (!authorization || authorization.status !== 'active') {
        console.log('DriveSession.getCredentials(): authorization not active');
        return null;
      }

      // Decrypt credentials
      const accessTokenEnvelope = JSON.parse(authorization.encryptedAccessToken) as EncryptionEnvelope;
      const refreshTokenEnvelope = JSON.parse(authorization.encryptedRefreshToken) as EncryptionEnvelope;

      const accessToken = decrypt(accessTokenEnvelope);
      const refreshToken = decrypt(refreshTokenEnvelope);

      const expiryDate = new Date(authorization.accessTokenExpiresAt).getTime();

      console.log('DriveSession.getCredentials(): credentials resolved from authorization');
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        expiry_date: expiryDate,
        scope: authorization.scopes.join(' '),
      };
    } catch (error) {
      console.error('DriveSession.getCredentials(): error', error);
      return null;
    }
  }

  /**
   * Set credentials is now a no-op - credentials are stored in authorization repository
   * This method is kept for compatibility but should not be used
   */
  async setCredentials(credentials: DriveCredentials): Promise<void> {
    console.log('[DRIVE SESSION FORENSIC] setCredentials() called - NO-OP (credentials stored in authorization repository)');
    // Credentials are now stored in oauth-credential-store, not cookies
    // This method is kept for backward compatibility but does nothing
  }

  /**
   * Clear session and authorization (logout)
   */
  async clearCredentials(): Promise<void> {
    const cookieStore = await cookies();
    const sessionId = await this.getSessionId();

    if (sessionId) {
      try {
        const { revokeAuthorizationWithSessions } = await import('./oauth-credential-store');
        const session = await getSession(sessionId);
        if (session) {
          await revokeAuthorizationWithSessions(session.authorizationId);
          console.log('[DRIVE SESSION FORENSIC] Authorization revoked:', session.authorizationId);
        }
      } catch (error) {
        console.error('[DRIVE SESSION FORENSIC] Failed to revoke authorization:', error);
      }
    }

    // Clear session cookie
    cookieStore.delete('drive_session_id');
    
    // Clear legacy OAuth credential cookies (cleanup)
    cookieStore.delete('drive_access_token');
    cookieStore.delete('drive_refresh_token');
    cookieStore.delete('drive_expiry_date');
    cookieStore.delete('drive_scope');

    console.log('[DRIVE SESSION FORENSIC] Session and credentials cleared');
  }

  /**
   * Check if access token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    const credentials = await this.getCredentials();
    if (!credentials || !credentials.expiry_date) {
      return true;
    }
    // Add 60 second buffer to handle clock skew
    return Date.now() >= (credentials.expiry_date - 60000);
  }

  /**
   * Check if token is near expiry (within 5 minutes)
   */
  async isTokenNearExpiry(): Promise<boolean> {
    const credentials = await this.getCredentials();
    if (!credentials || !credentials.expiry_date) {
      return true;
    }
    // Consider token near expiry if less than 5 minutes remaining
    return Date.now() >= (credentials.expiry_date - 5 * 60 * 1000);
  }

  /**
   * Get time until token expiry in seconds
   */
  async getTimeUntilExpiry(): Promise<number> {
    const credentials = await this.getCredentials();
    if (!credentials || !credentials.expiry_date) {
      return 0;
    }
    const timeRemaining = credentials.expiry_date - Date.now();
    return Math.max(0, Math.floor(timeRemaining / 1000));
  }

  /**
   * Get refresh token (for token refresh flow)
   */
  async getRefreshToken(): Promise<string | null> {
    const credentials = await this.getCredentials();
    return credentials?.refresh_token || null;
  }

  /**
   * Get session ID from cookie
   */
  private async getSessionId(): Promise<string | null> {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get('drive_session_id');
      return cookie?.value || null;
    } catch (error) {
      console.log('DriveSession.getSessionId(): cookies() failed', error);
      return null;
    }
  }
}

export const driveSession = DriveSession.getInstance();
