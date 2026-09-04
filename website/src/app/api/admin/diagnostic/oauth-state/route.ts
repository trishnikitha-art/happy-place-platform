/**
 * OAuth State Diagnostic Endpoint
 * 
 * Safely inspects OAuth state without exposing secrets.
 * Returns only safe identifiers and status flags.
 * 
 * POST /api/admin/diagnostic/oauth-state
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getSessionIdFromCookies } from '@/lib/drive/drive-session';
import { getSession } from '@/lib/drive/session-store';
import { getAuthorization } from '@/lib/drive/oauth-credential-store';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // REQUIRE ADMIN AUTHORIZATION
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json({
      error: 'Unauthorized',
      message: 'Workbench authentication required',
    }, { status: 401 });
  }

  try {
    const sessionId = await getSessionIdFromCookies();
    
    if (!sessionId) {
      return NextResponse.json({
        diagnosis: 'NO_SESSION_COOKIE',
        message: 'No drive_session_id cookie found in request',
        sessionId: null,
      });
    }

    const session = await getSession(sessionId);
    
    if (!session) {
      return NextResponse.json({
        diagnosis: 'SESSION_NOT_FOUND',
        message: 'Session record not found in KV',
        sessionId: sessionId.substring(0, 8) + '...',
      });
    }

    const authorization = await getAuthorization(session.authorizationId);
    
    if (!authorization) {
      return NextResponse.json({
        diagnosis: 'AUTHORIZATION_NOT_FOUND',
        message: 'Authorization record not found in KV',
        sessionId: sessionId.substring(0, 8) + '...',
        authorizationId: session.authorizationId.substring(0, 8) + '...',
      });
    }

    // Check authorization status
    const isActive = authorization.status === 'active';
    const isRevoked = authorization.status === 'revoked';
    const isExpired = authorization.status === 'expired';
    
    // Check access token expiry
    const accessTokenExpiry = new Date(authorization.accessTokenExpiresAt).getTime();
    const isAccessTokenExpired = Date.now() > accessTokenExpiry;
    const isAccessTokenNearExpiry = Date.now() > (accessTokenExpiry - 5 * 60 * 1000);

    // Check if we have encrypted credentials
    const hasEncryptedAccessToken = !!authorization.encryptedAccessToken;
    const hasEncryptedRefreshToken = !!authorization.encryptedRefreshToken;

    return NextResponse.json({
      diagnosis: 'STATE_VALID',
      sessionId: sessionId.substring(0, 8) + '...',
      authorizationId: authorization.id.substring(0, 8) + '...',
      googleSubject: authorization.googleSubject.substring(0, 8) + '...',
      email: authorization.email,
      status: authorization.status,
      isActive,
      isRevoked,
      isExpired,
      hasEncryptedAccessToken,
      hasEncryptedRefreshToken,
      accessTokenExpiry: authorization.accessTokenExpiresAt,
      isAccessTokenExpired,
      isAccessTokenNearExpiry,
      keyVersion: authorization.keyVersion,
      lastUsedAt: authorization.lastUsedAt,
      lastRefreshAt: authorization.lastRefreshAt,
      createdAt: authorization.createdAt,
    });
  } catch (error) {
    console.error('[OAUTH_STATE_DIAGNOSTIC] Error:', error);
    return NextResponse.json({
      diagnosis: 'ERROR',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
