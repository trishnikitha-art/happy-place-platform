/**
 * Drive OAuth Manager
 * 
 * Manages Google OAuth tokens for persistent Drive sessions.
 * Creates OAuth clients per request/session operation with explicit authorizationId passing.
 * 
 * ARCHITECTURAL CORRECTIONS:
 * - Removed singleton pattern (no process-level state)
 * - OAuth client created per request/session operation
 * - AuthorizationId passed explicitly (never derived from cookies() in background callbacks)
 * - Token refresh handled explicitly during request context
 * - Refresh failure semantics are explicit (no swallowed failures)
 * 
 * Uses authoritative authorization revocation path for invalid_grant failures.
 */

import { google } from 'googleapis';
import { DriveCredentials, getSessionIdFromCookies } from './drive-session';
import { revokeAuthorizationWithSessions, getAuthorization, updateAuthorizationAfterRefresh, decrypt, type EncryptionEnvelope } from './oauth-credential-store';
import { getSession } from './session-store';
import { cookies } from 'next/headers';

/**
 * Create OAuth2 client with explicit credentials
 * 
 * Per-request OAuth client creation with explicit authorizationId for token refresh updates.
 * No process-level state, no background callbacks calling cookies().
 */
export async function createOAuthClient(credentials: DriveCredentials, authorizationId: string): Promise<InstanceType<typeof google.auth.OAuth2>> {
  console.log('[OAUTH_MANAGER] Creating OAuth client for authorization:', authorizationId);
  
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/oauth/callback`;

  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  const oauth2Client = new google.auth.OAuth2({
    clientId,
    clientSecret,
    redirectUri,
  });

  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    expiry_date: credentials.expiry_date,
    scope: credentials.scope,
  });

  console.log('[OAUTH_MANAGER] OAuth2Client created for authorization:', authorizationId);

  // Set up explicit token refresh handler with authorizationId parameter
  // This callback will only be invoked during request context, not background
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  oauth2Client.on('tokens', async (tokens: any) => {
    console.log('[OAUTH_MANAGER] Token refresh event for authorization:', authorizationId, {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiryDate: tokens.expiry_date,
    });
    
    try {
      // AuthorizationId is explicitly passed, no need to call cookies()
      const authorization = await getAuthorization(authorizationId);
      if (authorization && authorization.status === 'active') {
        // Update authorization with refreshed tokens
        await updateAuthorizationAfterRefresh(
          authorization.id,
          tokens.access_token as string,
          (tokens.expiry_date as number) || Date.now() + 3600 * 1000,
          tokens.refresh_token as string
        );
        
        console.log('[OAUTH_MANAGER] Authorization updated successfully:', authorizationId);
        return;
      }
      
      console.log('[OAUTH_MANAGER] Authorization not found or inactive:', authorizationId);
    } catch (error) {
      console.error('[OAUTH_MANAGER] Failed to update authorization after refresh:', authorizationId, error);
      // Token refresh failure is explicit, not swallowed
      throw new Error(`Token refresh failed for authorization ${authorizationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  return oauth2Client;
}

/**
 * Get OAuth2 client for Drive API calls with explicit authorizationId
 * 
 * Creates per-request OAuth client with explicit authorization context.
 * Handles token refresh explicitly during request context.
 * No process-level state, no background callbacks.
 */
export async function getOAuthClient(authorizationId?: string): Promise<InstanceType<typeof google.auth.OAuth2>> {
  console.log('[OAUTH_MANAGER] Getting OAuth client for authorization:', authorizationId);
  
  // If authorizationId not provided, resolve from session
  let effectiveAuthorizationId = authorizationId;
  if (!effectiveAuthorizationId) {
    const sessionId = await getSessionIdFromCookies();
    if (sessionId) {
      const session = await getSession(sessionId);
      if (session) {
        effectiveAuthorizationId = session.authorizationId;
      }
    }
  }

  if (!effectiveAuthorizationId) {
    throw new Error('Cannot resolve authorization ID from session');
  }
  
  // Resolve credentials from authorization repository
  const authorization = await getAuthorization(effectiveAuthorizationId);
  if (!authorization || authorization.status !== 'active') {
    throw new Error('Authorization not found or inactive');
  }
  
  // Decrypt credentials
  const accessTokenEnvelope = JSON.parse(authorization.encryptedAccessToken) as EncryptionEnvelope;
  const refreshTokenEnvelope = JSON.parse(authorization.encryptedRefreshToken) as EncryptionEnvelope;
  
  const credentials: DriveCredentials = {
    access_token: decrypt(accessTokenEnvelope),
    refresh_token: decrypt(refreshTokenEnvelope),
    expiry_date: new Date(authorization.accessTokenExpiresAt).getTime(),
    scope: authorization.scopes.join(' '),
  };

  const oauth2Client = await createOAuthClient(credentials, effectiveAuthorizationId);

  // Proactive token refresh if near expiry (within 5 minutes)
  if (credentials.expiry_date && credentials.expiry_date - Date.now() < 5 * 60 * 1000) {
    console.log('[OAUTH_MANAGER] Token near expiry, proactive refresh for authorization:', effectiveAuthorizationId);
    try {
      await oauth2Client.refreshAccessToken();
      console.log('[OAUTH_MANAGER] Proactive refresh successful for authorization:', effectiveAuthorizationId);
    } catch (error) {
      console.error('[OAUTH_MANAGER] Proactive refresh failed for authorization:', effectiveAuthorizationId, error);
      // Proactive refresh failure is explicit, not swallowed
      throw new Error(`Proactive token refresh failed for authorization ${effectiveAuthorizationId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Ensure token is valid with error handling
  try {
    const tokens = await oauth2Client.getAccessToken();
    if (!tokens.token) {
      await oauth2Client.refreshAccessToken();
    }
  } catch (error) {
    console.error('[OAUTH_MANAGER] Token refresh failed for authorization:', effectiveAuthorizationId, error);
    
    // Classify error type with explicit semantics
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isPermanentFailure = errorMessage.includes('invalid_grant') || 
                                errorMessage.includes('revoked') ||
                                errorMessage.includes('Token has been revoked');
    
    if (isPermanentFailure) {
      console.log('[OAUTH_MANAGER] Permanent authorization failure, revoking authorization:', effectiveAuthorizationId);
      
      // Use authoritative revocation path
      await revokeAuthorizationWithSessions(effectiveAuthorizationId);
      console.log('[OAUTH_MANAGER] Authorization revoked:', effectiveAuthorizationId);
      
      // Clear session cookie
      const cookieStore = await cookies();
      cookieStore.delete('drive_session_id');
      
      throw new Error('OAuth authorization failed. Please re-authenticate with Google Drive.');
    } else {
      // Transient failure - explicit error, not swallowed
      console.log('[OAUTH_MANAGER] Transient token refresh failure for authorization:', effectiveAuthorizationId);
      throw new Error(`Token refresh failed (transient) for authorization ${effectiveAuthorizationId}: ${errorMessage}`);
    }
  }

  return oauth2Client;
}

/**
 * Get Drive API client with explicit authorizationId
 */
export async function getDriveClient(authorizationId?: string): Promise<ReturnType<typeof google.drive>> {
  const auth = await getOAuthClient(authorizationId);
  return google.drive({ version: 'v3', auth });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    return false;
  }

  try {
    const session = await getSession(sessionId);
    if (!session) {
      return false;
    }

    const authorization = await getAuthorization(session.authorizationId);
    return !!(authorization && authorization.status === 'active');
  } catch (error) {
    console.error('isAuthenticated(): error', error);
    return false;
  }
}

/**
 * Clear credentials (logout)
 */
export async function logout(): Promise<void> {
  // Clear session cookie
  const cookieStore = await cookies();
  cookieStore.delete('drive_session_id');
  
  // Note: Authorization revocation should be handled explicitly via revokeAuthorizationWithSessions
  // This is a simple session cookie clear for browser logout
}
