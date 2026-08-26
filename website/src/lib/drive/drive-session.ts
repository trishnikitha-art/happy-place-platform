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

/**
 * Get session ID from cookies (utility function for external callers)
 * 
 * Returns session ID from drive_session_id cookie or null if not found.
 * This is a utility function for authorization resolution in oauth-manager.
 */
export async function getSessionIdFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('drive_session_id')?.value;
    return sessionId || null;
  } catch (error) {
    console.error('getSessionIdFromCookies(): cookies() failed', error);
    return null;
  }
}

export class DriveSession {
  // Singleton removed - per-request instance creation
  // No process-level state
  
  constructor() {}

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
   * Get Google Drive client for API operations
   * Resolves credentials and returns configured Drive client
   */
  async getDriveClient(): Promise<any> {
    const credentials = await this.getCredentials();
    if (!credentials) {
      throw new Error('Not authenticated with Drive');
    }

    const { google } = await import('googleapis');
    const auth = new google.auth.OAuth2({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 
        `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/oauth/callback`,
    });

    auth.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
      scope: credentials.scope,
    });

    return google.drive({ version: 'v3', auth });
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
  /**
   * Get session ID from cookies
   * 
   * Made public for authorization resolution in oauth-manager
   */
  async getSessionId(): Promise<string | null> {
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

// Per-request instance creation - no singleton
export const driveSession = new DriveSession();
