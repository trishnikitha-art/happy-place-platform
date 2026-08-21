/**
 * Google OAuth Callback Route
 * 
 * Handles OAuth 2.0 callback and exchanges code for tokens.
 * Persists credentials through DriveSession authority.
 */

import { NextResponse } from 'next/server';
import { driveSession } from '@/lib/drive/drive-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('=== DRIVE OAUTH CALLBACK REACHED ===');
  console.log('Request URL:', request.url);

  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const state = searchParams.get('state');

  console.log('[DRIVE OAUTH FORENSIC] Callback parameters:', {
    hasCode: !!code,
    hasError: !!error,
    hasState: !!state,
    errorValue: error || 'none',
  });

  if (error) {
    console.log('[DRIVE OAUTH FORENSIC] Google OAuth error:', error);
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('error', 'oauth_denied');
    return NextResponse.redirect(url);
  }

  if (!code) {
    console.log('[DRIVE OAUTH FORENSIC] No authorization code received');
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('error', 'no_code');
    return NextResponse.redirect(url);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/oauth/callback`;

  console.log('[DRIVE OAUTH FORENSIC] OAuth configuration:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
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

    const tokenData = await tokenResponse.json();

    console.log('[DRIVE OAUTH FORENSIC] Token exchange response:', {
      status: tokenResponse.status,
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      hasScope: !!tokenData.scope,
      hasError: !!tokenData.error,
      errorValue: tokenData.error || 'none',
    });

    if (tokenData.error) {
      console.log('[DRIVE OAUTH FORENSIC] Token exchange failed:', tokenData.error);
      const url = new URL('/workbench/media', request.url);
      url.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(url);
    }

    // Calculate expiry date
    const expiresIn = tokenData.expires_in || 3600;
    const expiryDate = Date.now() + (expiresIn * 1000);

    console.log('[DRIVE OAUTH FORENSIC] Persisting credentials through DriveSession...');
    
    // Preserve existing refresh token if Google doesn't return a new one
    // Google typically returns refresh token only on first authorization
    const currentCreds = await driveSession.getCredentials();
    const refreshTokenToStore = tokenData.refresh_token || currentCreds?.refresh_token;
    
    // Persist credentials through DriveSession
    await driveSession.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: refreshTokenToStore,
      expiry_date: expiryDate,
      scope: tokenData.scope,
    });

    console.log('[DRIVE OAUTH FORENSIC] Credentials persisted successfully');
    console.log('[DRIVE OAUTH FORENSIC] CALLBACK_SUCCESS - Redirecting to workbench');

    // Redirect to workbench with success
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('oauth', 'success');
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('[DRIVE OAUTH FORENSIC] OAuth token exchange error:', error);
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('error', 'token_exchange_error');
    return NextResponse.redirect(url);
  }
}
