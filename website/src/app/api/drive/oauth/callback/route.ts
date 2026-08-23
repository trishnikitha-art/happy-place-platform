/**
 * Google OAuth Callback Route
 * 
 * Handles OAuth 2.0 callback and exchanges code for tokens.
 * Integrates with authority layers for secure credential storage.
 * Uses authoritative revocation path for invalid grant failures.
 * Validates and consumes OAuth state for CSRF protection.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { revokeAuthorizationWithSessions, upsertAuthorization } from '@/lib/drive/oauth-credential-store';
import { createSession, getSession } from '@/lib/drive/session-store';
import { consumeState } from '@/lib/drive/oauth-state-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('=== DRIVE OAUTH CALLBACK REACHED ===');
  console.log('Request URL:', request.url);

  // Origin validation - prevent CSRF attacks
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const expectedOrigin = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
  
  console.log('[DRIVE OAUTH FORENSIC] Origin validation:', {
    origin: origin || 'none',
    referer: referer || 'none',
    expectedOrigin,
  });

  // Allow callback from same origin or from Google OAuth
  const isSameOrigin = origin === expectedOrigin;
  const isFromGoogle = referer?.startsWith('https://accounts.google.com/');
  
  if (!isSameOrigin && !isFromGoogle) {
    console.log('[DRIVE OAUTH FORENSIC] Origin validation failed - rejecting request');
    return NextResponse.json({ error: 'Invalid origin' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  console.log('[DRIVE OAUTH FORENSIC] Callback parameters:', {
    hasCode: !!code,
    hasError: !!error,
    hasState: !!state,
  });

  // Validate and consume OAuth state for CSRF protection
  if (!state) {
    console.log('[DRIVE OAUTH FORENSIC] Missing state parameter');
    const url = new URL('/workbench/media', request.url);
    return NextResponse.redirect(url);
  }

  // Explicitly pass cookie store to make request context ownership explicit
  const cookieStore = await cookies();
  const stateConsumed = await consumeState(state, cookieStore);
  if (!stateConsumed) {
    console.log('[DRIVE OAUTH FORENSIC] State validation or consumption failed');
    const url = new URL('/workbench/media', request.url);
    return NextResponse.redirect(url);
  }

  console.log('[DRIVE OAUTH FORENSIC] State validated and consumed successfully');

  if (error) {
    console.log('[DRIVE OAUTH FORENSIC] Google OAuth error:', error);
    const url = new URL('/workbench/media', request.url);
    return NextResponse.redirect(url);
  }

  if (!code) {
    console.log('[DRIVE OAUTH FORENSIC] No authorization code received');
    const url = new URL('/workbench/media', request.url);
    return NextResponse.redirect(url);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/oauth/callback`;

  console.log('[DRIVE OAUTH FORENSIC] OAuth configuration:', {
    hasClientId: !!clientId,
    redirectUri: redirectUri,
  });

  if (!clientId || !clientSecret) {
    console.log('[DRIVE OAUTH FORENSIC] OAuth credentials not configured');
    return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
  }

  try {
    console.log('[DRIVE OAUTH FORENSIC] Exchanging authorization code for tokens...');
    // Exchange code for tokens
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      console.error('[DRIVE OAUTH FORENSIC] Token exchange HTTP error:', tokenResponse.status);
      const url = new URL('/workbench/media', request.url);
      return NextResponse.redirect(url);
    }

    const tokenData = await tokenResponse.json();

    console.log('[DRIVE OAUTH FORENSIC] Token exchange response:', {
      status: tokenResponse.status,
      hasError: !!tokenData.error,
    });

    if (tokenData.error) {
      console.log('[DRIVE OAUTH FORENSIC] Token exchange failed:', tokenData.error);
      
      // Check for invalid_grant - use authoritative revocation path
      if (tokenData.error === 'invalid_grant') {
        console.log('[DRIVE OAUTH FORENSIC] Invalid grant - revoking authorization');
        
        // Try to get authorization ID from session ID cookie for authoritative revocation
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('drive_session_id')?.value;
        
        if (sessionId) {
          try {
            const { getSession } = await import('@/lib/drive/session-store');
            const session = await getSession(sessionId);
            if (session && session.authorizationId) {
              await revokeAuthorizationWithSessions(session.authorizationId);
              console.log('[DRIVE OAUTH FORENSIC] Authorization revoked:', session.authorizationId);
            }
          } catch (error) {
            console.error('[DRIVE OAUTH FORENSIC] Failed to revoke authorization:', error);
          }
        }
        
        // Clear session cookie
        cookieStore.delete('drive_session_id');
        
        const url = new URL('/workbench/media', request.url);
        return NextResponse.redirect(url);
      }
      
      const url = new URL('/workbench/media', request.url);
      return NextResponse.redirect(url);
    }

    // Validate token response shape
    if (!tokenData.access_token || typeof tokenData.access_token !== 'string') {
      console.error('[DRIVE OAUTH FORENSIC] Token response missing or invalid access_token');
      const url = new URL('/workbench/media', request.url);
      return NextResponse.redirect(url);
    }

    if (tokenData.token_type && tokenData.token_type !== 'Bearer') {
      console.error('[DRIVE OAUTH FORENSIC] Unexpected token_type:', tokenData.token_type);
      const url = new URL('/workbench/media', request.url);
      return NextResponse.redirect(url);
    }

    if (!tokenData.expires_in || typeof tokenData.expires_in !== 'number') {
      console.error('[DRIVE OAUTH FORENSIC] Token response missing or invalid expires_in');
      const url = new URL('/workbench/media', request.url);
      return NextResponse.redirect(url);
    }

    // refresh_token is optional for some flows but required for offline access
    if (!tokenData.refresh_token && !tokenData.scope?.includes('offline')) {
      console.warn('[DRIVE OAUTH FORENSIC] Token response missing refresh_token (offline access may not work)');
    }

    // Calculate expiry date
    const expiresIn = tokenData.expires_in || 3600;
    const expiryDate = Date.now() + (expiresIn * 1000);

    console.log('[DRIVE OAUTH FORENSIC] Integrating with authority layers...');
    
    // Extract Google identity from userinfo endpoint
    // CRITICAL: Google subject (sub) is the authoritative identity key
    // Email is display-only and not required for authorization
    let googleSubject: string;
    let email: string;
    
    try {
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
        },
      });
      
      if (!userInfoResponse.ok) {
        throw new Error(`Google userinfo request failed: ${userInfoResponse.status}`);
      }
      
      const userInfo = await userInfoResponse.json();
      
      // Validate response shape
      if (!userInfo || typeof userInfo !== 'object') {
        throw new Error('Google userinfo returned invalid response');
      }
      
      // Subject is REQUIRED - this is the authoritative identity
      if (!userInfo.sub || typeof userInfo.sub !== 'string') {
        throw new Error('Google userinfo missing or invalid subject identifier');
      }
      
      googleSubject = userInfo.sub;
      
      // Email is optional display field - do not fabricate
      email = userInfo.email && typeof userInfo.email === 'string' ? userInfo.email : '';
      
      console.log('[DRIVE OAUTH FORENSIC] Google identity extracted:', {
        googleSubject: googleSubject.substring(0, 8) + '...',
        hasEmail: !!email,
      });
    } catch (error) {
      console.error('[DRIVE OAUTH FORENSIC] Failed to extract Google identity:', error);
      // FAIL CLOSED: Do not fabricate identity data
      const url = new URL('/workbench/media', request.url);
      return NextResponse.redirect(url);
    }
    
    // Persist authorization through oauth-credential-store
    const authorization = await upsertAuthorization(
      googleSubject,
      email,
      tokenData.scope ? tokenData.scope.split(' ') : [],
      tokenData.access_token,
      expiryDate,
      tokenData.refresh_token || ''
    );

    console.log('[DRIVE OAUTH FORENSIC] Authorization persisted:', authorization.id);

    // Create browser session
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const session = await createSession(authorization.id, userAgent);

    console.log('[DRIVE OAUTH FORENSIC] Session created:', session.id);

    // Clear old OAuth credential cookies (legacy cleanup)
    const cookieStore = await cookies();
    cookieStore.delete('drive_access_token');
    cookieStore.delete('drive_refresh_token');
    cookieStore.delete('drive_expiry_date');
    cookieStore.delete('drive_scope');
    console.log('[DRIVE OAUTH FORENSIC] Legacy OAuth credential cookies cleared');

    // Issue opaque session ID to browser instead of OAuth tokens
    cookieStore.set('drive_session_id', session.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    });

    console.log('[DRIVE OAUTH FORENSIC] Opaque session ID issued to browser');
    console.log('[DRIVE OAUTH FORENSIC] CALLBACK_SUCCESS - Redirecting to workbench');

    // Redirect to workbench with success
    const url = new URL('/workbench/media', request.url);
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('[DRIVE OAUTH FORENSIC] OAuth token exchange error:', error);
    const url = new URL('/workbench/media', request.url);
    return NextResponse.redirect(url);
  }
}
