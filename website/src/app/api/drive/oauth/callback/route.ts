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
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('error', 'oauth_denied');
    return NextResponse.redirect(url);
  }

  if (!code) {
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('error', 'no_code');
    return NextResponse.redirect(url);
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_URL || 'http://localhost:3000'}/api/drive/oauth/callback`;

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

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      const url = new URL('/workbench/media', request.url);
      url.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(url);
    }

    // Calculate expiry date
    const expiresIn = tokenData.expires_in || 3600;
    const expiryDate = Date.now() + (expiresIn * 1000);

    // Persist credentials through DriveSession
    await driveSession.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: expiryDate,
      scope: tokenData.scope,
    });

    // Redirect to workbench with success
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('oauth', 'success');
    return NextResponse.redirect(url);
  } catch (error) {
    console.error('OAuth token exchange error:', error);
    const url = new URL('/workbench/media', request.url);
    url.searchParams.set('error', 'token_exchange_error');
    return NextResponse.redirect(url);
  }
}
