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

  return oauth2Client;
}

/**
 * Explicit token refresh with persistence ownership
 * 
 * CRITICAL: This function owns the entire refresh operation:
 * 1. Request refresh from Google
 * 2. Validate returned tokens
 * 3. Persist encrypted credentials to authorization store
 * 4. Return success or throw explicit error
 * 
 * Does not depend on EventEmitter callback - this is the authoritative refresh path.
 * If persistence fails, the refresh operation fails explicitly.
 */
async function explicitTokenRefresh(
  oauth2Client: InstanceType<typeof google.auth.OAuth2>,
  authorizationId: string
): Promise<void> {
  console.log('[OAUTH_MANAGER] Explicit token refresh for authorization:', authorizationId);
  
  try {
    // P0 FIX: Preserve existing refresh token before refresh
    // Google may not return a new refresh token on successful refresh
    const existingCredentials = oauth2Client.credentials;
    const existingRefreshToken = existingCredentials.refresh_token as string;
    
    // Request refresh from Google
    await oauth2Client.refreshAccessToken();
    
    // Get refreshed credentials from the client
    const credentials = oauth2Client.credentials;
    
    // Validate returned tokens
    if (!credentials.access_token || typeof credentials.access_token !== 'string') {
      throw new Error('Token refresh returned invalid access_token');
    }
    
    const expiryDate = (credentials.expiry_date as number) || Date.now() + 3600 * 1000;
    
    // P0 FIX: Use returned refresh token if present, otherwise preserve existing refresh token
    // Google may not return a new refresh token on successful refresh - this is normal
    const newRefreshToken = (credentials.refresh_token as string);
    const refreshToken = newRefreshToken || existingRefreshToken;
    
    if (!refreshToken || typeof refreshToken !== 'string') {
      throw new Error('Token refresh failed: no valid refresh token available (neither returned by Google nor preserved from existing credentials)');
    }
    
    console.log('[OAUTH_MANAGER] Token refresh details', {
      authorizationId,
      newRefreshTokenProvided: !!newRefreshToken,
      existingRefreshTokenPreserved: !newRefreshToken && !!existingRefreshToken,
      expiryDate: new Date(expiryDate).toISOString()
    });
    
    // Persist encrypted credentials with explicit ownership
    await updateAuthorizationAfterRefresh(
      authorizationId,
      credentials.access_token,
      expiryDate,
      refreshToken
    );
    
    console.log('[OAUTH_MANAGER] Explicit token refresh succeeded:', authorizationId);
  } catch (error) {
    console.error('[OAUTH_MANAGER] Explicit token refresh failed:', authorizationId, error);
    throw new Error(`Explicit token refresh failed for authorization ${authorizationId}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Get OAuth2 client for Drive API calls
 * 
 * CRITICAL: authorizationId is NEVER accepted from caller
 * Authorization ID is resolved ONLY from the current authenticated session
 * This prevents caller-controlled authorization ID from reaching OAuth credentials
 * 
 * HTTP boundary → session resolution → authorization resolution → OAuth client
 * 
 * The raw authorization ID is an internal capability, not an API-level identity selector
 */
export async function getOAuthClient(): Promise<InstanceType<typeof google.auth.OAuth2>> {
  console.log('[OAUTH_MANAGER] Getting OAuth client for current session');
  
  // Resolve authorization ID ONLY from current authenticated session
  // NEVER accept authorizationId from caller - this is a security boundary
  const sessionId = await getSessionIdFromCookies();
  if (!sessionId) {
    throw new Error('No active session found');
  }
  
  const session = await getSession(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  
  const effectiveAuthorizationId = session.authorizationId;
  if (!effectiveAuthorizationId) {
    throw new Error('Session has no associated authorization');
  }
  
  console.log('[OAUTH_MANAGER] Resolved authorization ID from session:', effectiveAuthorizationId);
  
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

  // Single authoritative token refresh path
  // Check if token needs refresh (expired or near expiry within 5 minutes)
  const needsRefresh = !credentials.expiry_date || 
                       credentials.expiry_date - Date.now() < 5 * 60 * 1000;

  if (needsRefresh) {
    console.log('[OAUTH_MANAGER] Token needs refresh (expired or near expiry), performing explicit refresh:', {
      authorizationId: effectiveAuthorizationId,
      currentExpiry: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : 'unknown',
    });
    await explicitTokenRefresh(oauth2Client, effectiveAuthorizationId);
    console.log('[OAUTH_MANAGER] Token refresh successful for authorization:', effectiveAuthorizationId);
  }

  // Validate token is accessible without triggering internal refresh
  try {
    const tokens = await oauth2Client.getAccessToken();
    if (!tokens.token) {
      console.log('[OAUTH_MANAGER] Token validation failed, attempting recovery refresh:', effectiveAuthorizationId);
      await explicitTokenRefresh(oauth2Client, effectiveAuthorizationId);
      console.log('[OAUTH_MANAGER] Recovery refresh successful for authorization:', effectiveAuthorizationId);
    }
  } catch (error) {
    console.error('[OAUTH_MANAGER] Token validation failed, attempting recovery refresh:', effectiveAuthorizationId, error);
    
    // Attempt explicit refresh as recovery
    try {
      await explicitTokenRefresh(oauth2Client, effectiveAuthorizationId);
      console.log('[OAUTH_MANAGER] Recovery refresh succeeded:', effectiveAuthorizationId);
    } catch (refreshError) {
      console.error('[OAUTH_MANAGER] Recovery refresh failed:', effectiveAuthorizationId, refreshError);
      
      // Classify error type with explicit semantics
      const errorMessage = refreshError instanceof Error ? refreshError.message : String(refreshError);
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
  }

  return oauth2Client;
}

/**
 * Get Drive API client for current session
 * 
 * CRITICAL: No authorizationId parameter - resolves from current session only
 * This prevents caller-controlled authorization ID from reaching Drive API
 */
export async function getDriveClient(): Promise<ReturnType<typeof google.drive>> {
  const auth = await getOAuthClient();
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
