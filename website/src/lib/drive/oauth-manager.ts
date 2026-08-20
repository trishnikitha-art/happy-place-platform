/**
 * Drive OAuth Manager
 * 
 * Manages Google OAuth tokens for persistent Drive sessions.
 * Handles automatic token refresh using DriveSession authority.
 */

import { google } from 'googleapis';
import { driveSession, DriveCredentials } from './drive-session';

export class DriveOAuthManager {
  private static instance: DriveOAuthManager;
  private oauth2Client: any = null;

  private constructor() {}

  static getInstance(): DriveOAuthManager {
    if (!DriveOAuthManager.instance) {
      DriveOAuthManager.instance = new DriveOAuthManager();
    }
    return DriveOAuthManager.instance;
  }

  /**
   * Initialize OAuth2 client with credentials from DriveSession
   */
  async initialize(): Promise<void> {
    console.log('=== OAuth Manager Initialize ===');
    
    const credentials = await driveSession.getCredentials();
    
    console.log('[OAUTH_MANAGER] Credentials from DriveSession:', {
      hasAccessToken: !!credentials?.access_token,
      hasRefreshToken: !!credentials?.refresh_token,
      expiryDate: credentials?.expiry_date,
      scope: credentials?.scope,
      tokenAge: credentials?.expiry_date ? Date.now() - credentials.expiry_date : 'unknown',
    });
    
    if (!credentials) {
      throw new Error('No valid credentials found. Please authenticate with Google Drive.');
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
      `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/oauth/callback`;

    if (!clientId || !clientSecret) {
      throw new Error('Google OAuth credentials not configured');
    }

    this.oauth2Client = new google.auth.OAuth2({
      clientId,
      clientSecret,
      redirectUri,
    });

    this.oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: credentials.expiry_date,
      scope: credentials.scope,
    });

    console.log('[OAUTH_MANAGER] OAuth2Client created and credentials set');

    // Proactive token refresh if near expiry (within 5 minutes)
    if (credentials.expiry_date && credentials.expiry_date - Date.now() < 5 * 60 * 1000) {
      console.log('[OAUTH_MANAGER] Token near expiry, proactive refresh');
      try {
        await this.oauth2Client.refreshAccessToken();
        console.log('[OAUTH_MANAGER] Proactive refresh successful');
      } catch (error) {
        console.error('[OAUTH_MANAGER] Proactive refresh failed:', error);
        // Don't throw here, will retry on next API call
      }
    }

    // Set up automatic token refresh
    this.oauth2Client.on('tokens', async (tokens: any) => {
      console.log('[OAUTH_MANAGER] Token refresh event:', {
        hasAccessToken: !!tokens.access_token,
        hasRefreshToken: !!tokens.refresh_token,
        expiryDate: tokens.expiry_date,
      });
      try {
        // Get current credentials to preserve refresh token if not provided
        const currentCreds = await driveSession.getCredentials();
        // Update DriveSession with refreshed tokens
        await driveSession.setCredentials({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || currentCreds?.refresh_token,
          expiry_date: tokens.expiry_date,
          scope: tokens.scope,
        });
        console.log('[OAUTH_MANAGER] Credentials updated successfully');
      } catch (error) {
        console.error('[OAUTH_MANAGER] Failed to update credentials after refresh:', error);
      }
    });
  }

  /**
   * Get OAuth2 client for Drive API calls
   */
  async getClient(): Promise<any> {
    if (!this.oauth2Client) {
      await this.initialize();
    }
    
    // Ensure token is valid with error handling
    try {
      const tokens = await this.oauth2Client.getAccessToken();
      if (!tokens.token) {
        await this.oauth2Client.refreshAccessToken();
      }
    } catch (error) {
      console.error('[OAUTH_MANAGER] Token refresh failed, clearing credentials:', error);
      // Clear invalid credentials on auth failure
      await this.logout();
      throw new Error('OAuth token refresh failed. Please re-authenticate with Google Drive.');
    }

    return this.oauth2Client;
  }

  /**
   * Get Drive API client
   */
  async getDriveClient(): Promise<any> {
    const auth = await this.getClient();
    return google.drive({ version: 'v3', auth });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    return await driveSession.isAuthenticated();
  }

  /**
   * Clear credentials (logout)
   */
  async logout(): Promise<void> {
    await driveSession.clearCredentials();
    this.oauth2Client = null;
  }
}

export const driveOAuthManager = DriveOAuthManager.getInstance();
