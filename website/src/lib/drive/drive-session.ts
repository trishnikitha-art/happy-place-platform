/**
 * Drive Session Authority
 * 
 * Constitutional authority for Google Drive OAuth session management.
 * 
 * Single source of truth for Drive credentials:
 * - Persists access token, refresh token, expiry, scope
 * - Reads from httpOnly cookies (secure, server-side only)
 * - Provides automatic token refresh
 * - All Drive services obtain credentials through this authority
 * 
 * Client-agnostic: PING90 credentials today, swap for client credentials later.
 */

import { cookies } from 'next/headers';

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
   */
  async isAuthenticated(): Promise<boolean> {
    const accessToken = await this.getCookie('drive_access_token');
    const refreshToken = await this.getCookie('drive_refresh_token');
    console.log('DriveSession.isAuthenticated():', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      drive_access_token_cookie: !!accessToken ? 'PRESENT' : 'ABSENT',
      drive_refresh_token_cookie: !!refreshToken ? 'PRESENT' : 'ABSENT',
    });
    return !!(accessToken && refreshToken);
  }

  /**
   * Get current credentials from cookies
   */
  async getCredentials(): Promise<DriveCredentials | null> {
    const accessToken = await this.getCookie('drive_access_token');
    const refreshToken = await this.getCookie('drive_refresh_token');
    const expiryDate = await this.getCookie('drive_expiry_date');
    const scope = await this.getCookie('drive_scope');

    if (!accessToken || !refreshToken) {
      return null;
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expiry_date: expiryDate ? parseInt(expiryDate, 10) : undefined,
      scope: scope || undefined,
    };
  }

  /**
   * Store credentials in cookies
   */
  async setCredentials(credentials: DriveCredentials): Promise<void> {
    console.log('[DRIVE SESSION FORENSIC] SETTING CREDENTIAL COOKIES');
    const cookieStore = await cookies();

    // Calculate expiry if not provided
    const expiryDate = credentials.expiry_date || (Date.now() + 3600 * 1000);

    const secureFlag = process.env.NODE_ENV === 'production';

    console.log('[DRIVE SESSION FORENSIC] Cookie configuration:', {
      secure: secureFlag,
      sameSite: 'lax',
      path: '/',
      hasAccessToken: !!credentials.access_token,
      hasRefreshToken: !!credentials.refresh_token,
      hasExpiry: !!credentials.expiry_date,
      hasScope: !!credentials.scope,
    });

    // Set access token (short-lived, 1 hour)
    cookieStore.set('drive_access_token', credentials.access_token, {
      httpOnly: true,
      secure: secureFlag,
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    });
    console.log('[DRIVE SESSION FORENSIC] access_token cookie: SET');

    // Set refresh token (long-lived, 30 days)
    if (credentials.refresh_token) {
      cookieStore.set('drive_refresh_token', credentials.refresh_token, {
        httpOnly: true,
        secure: secureFlag,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
      console.log('[DRIVE SESSION FORENSIC] refresh_token cookie: SET');
    } else {
      console.log('[DRIVE SESSION FORENSIC] refresh_token cookie: NOT SET (no refresh token provided)');
    }

    // Set expiry date
    cookieStore.set('drive_expiry_date', expiryDate.toString(), {
      httpOnly: true,
      secure: secureFlag,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });
    console.log('[DRIVE SESSION FORENSIC] expiry_date cookie: SET');

    // Set scope
    if (credentials.scope) {
      cookieStore.set('drive_scope', credentials.scope, {
        httpOnly: true,
        secure: secureFlag,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
      console.log('[DRIVE SESSION FORENSIC] scope cookie: SET');
    } else {
      console.log('[DRIVE SESSION FORENSIC] scope cookie: NOT SET (no scope provided)');
    }

    console.log('[DRIVE SESSION FORENSIC] CREDENTIAL COOKIES SET COMPLETE');
  }

  /**
   * Clear all Drive credentials (logout)
   */
  async clearCredentials(): Promise<void> {
    const cookieStore = await cookies();

    cookieStore.delete('drive_access_token');
    cookieStore.delete('drive_refresh_token');
    cookieStore.delete('drive_expiry_date');
    cookieStore.delete('drive_scope');
  }

  /**
   * Check if access token is expired
   */
  async isTokenExpired(): Promise<boolean> {
    const credentials = await this.getCredentials();
    if (!credentials || !credentials.expiry_date) {
      return true;
    }
    return Date.now() >= credentials.expiry_date;
  }

  /**
   * Get refresh token (for token refresh flow)
   */
  async getRefreshToken(): Promise<string | null> {
    return await this.getCookie('drive_refresh_token');
  }

  /**
   * Helper to get cookie value
   */
  private async getCookie(name: string): Promise<string | null> {
    try {
      const cookieStore = await cookies();
      const cookie = cookieStore.get(name);
      if (cookie) {
        console.log(`DriveSession.getCookie(${name}): cookie exists`);
      } else {
        console.log(`DriveSession.getCookie(${name}): cookie NOT found`);
      }
      return cookie?.value || null;
    } catch (error) {
      console.log(`DriveSession.getCookie(${name}): cookies() failed`, error);
      // Cookies might not be available in all contexts
      return null;
    }
  }
}

export const driveSession = DriveSession.getInstance();
