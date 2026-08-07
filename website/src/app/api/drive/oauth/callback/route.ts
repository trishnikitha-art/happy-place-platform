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
  console.log('=== OAuth Callback Reached ===');
  
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  console.log('Code:', code ? 'present' : 'missing');
  console.log('Error:', error);

  if (error) {
    console.log('OAuth error:', error);
    const url = new URL('/workbench/media', new URL(request.url).origin);
    url.searchParams.set('error', 'oauth_denied');
    return NextResponse.redirect(url);
  }

  if (!code) {
    console.log('No code in callback');
    const url = new URL('/workbench/media', new URL(request.url).origin);
    url.searchParams.set('error', 'no_code');
    return NextResponse.redirect(url);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive/oauth/callback';

  console.log('Environment check:');
  console.log('- GOOGLE_CLIENT_ID:', clientId ? 'set' : 'not set');
  console.log('- GOOGLE_CLIENT_SECRET:', clientSecret ? 'set' : 'not set');
  console.log('- GOOGLE_REDIRECT_URI:', redirectUri);

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: 'OAuth credentials not configured' }, { status: 500 });
  }

  try {
    // Exchange code for tokens
    const params = new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    });

    console.log('Exchanging code for tokens...');

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenResponse.json();

    console.log('Token exchange response:', {
      hasAccessToken: !!tokenData.access_token,
      hasRefreshToken: !!tokenData.refresh_token,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
    });

    if (tokenData.error) {
      console.log('Token exchange error:', tokenData.error);
      const url = new URL('/workbench/media', new URL(request.url).origin);
      url.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(url);
    }

    // Calculate expiry date
    const expiresIn = tokenData.expires_in || 3600;
    const expiryDate = Date.now() + (expiresIn * 1000);

    console.log('Writing cookies...');

    // Create redirect response first
    const dashboardUrl = new URL('/workbench/media', new URL(request.url).origin);
    dashboardUrl.searchParams.set('oauth', 'success');
    const response = NextResponse.redirect(dashboardUrl);

    // Set cookies directly on the response
    response.cookies.set('drive_access_token', tokenData.access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3600, // 1 hour
      path: '/',
    });

    if (tokenData.refresh_token) {
      response.cookies.set('drive_refresh_token', tokenData.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        path: '/',
      });
    }

    response.cookies.set('drive_expiry_date', expiryDate.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    if (tokenData.scope) {
      response.cookies.set('drive_scope', tokenData.scope, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30,
        path: '/',
      });
    }

    console.log('Redirecting to:', dashboardUrl.toString());

    return response;
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    const url = new URL('/workbench/media', new URL(request.url).origin);
    url.searchParams.set('error', 'token_exchange_error');
    return NextResponse.redirect(url);
  }
}
