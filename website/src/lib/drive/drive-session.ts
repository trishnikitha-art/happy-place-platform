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
    const cookieStore = await cookies();

    // Calculate expiry if not provided
    const expiryDate = credentials.expiry_date || (Date.now() + 3600 * 1000);

    // Set access token (short-lived, 1 hour)
    cookieStore.set('drive_access_token', credentials.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    });

    // Set refresh token (long-lived, 30 days)
    if (credentials.refresh_token) {
      cookieStore.set('drive_refresh_token', credentials.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    // Set expiry date
    cookieStore.set('drive_expiry_date', expiryDate.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    // Set scope
    if (credentials.scope) {
      cookieStore.set('drive_scope', credentials.scope, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }
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
      return cookie?.value || null;
    } catch {
      // Cookies might not be available in all contexts
      return null;
    }
  }
}

export const driveSession = DriveSession.getInstance();
