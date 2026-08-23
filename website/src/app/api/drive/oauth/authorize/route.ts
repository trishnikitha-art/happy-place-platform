/**
 * Google OAuth Authorization Route
 * 
 * Initiates OAuth 2.0 flow for Google Drive access.
 * Uses PING90 Google Cloud project credentials.
 * Integrates with state authority for CSRF protection.
 */

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createState } from '@/lib/drive/oauth-state-manager';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('=== DRIVE OAUTH AUTHORIZE REACHED ===');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 
    `${process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'}/api/drive/oauth/callback`;

  console.log('[DRIVE OAUTH FORENSIC] Authorize configuration:', {
    hasClientId: !!clientId,
    redirectUri: redirectUri,
  });

  if (!clientId) {
    return NextResponse.json({ error: 'GOOGLE_CLIENT_ID not configured' }, { status: 500 });
  }

  // Validate redirect URI to prevent redirect_uri injection
  const redirectUriUrl = new URL(redirectUri);
  const isLocalhost = redirectUriUrl.hostname === 'localhost' || redirectUriUrl.hostname === '127.0.0.1';
  const isHttps = redirectUriUrl.protocol === 'https:';
  const expectedPath = '/api/drive/oauth/callback';
  const hasExpectedPath = redirectUriUrl.pathname === expectedPath;

  if (!isLocalhost && !isHttps) {
    console.log('[DRIVE OAUTH FORENSIC] Redirect URI validation failed: non-localhost must use HTTPS');
    return NextResponse.json({ error: 'Invalid redirect URI: non-localhost must use HTTPS' }, { status: 500 });
  }

  if (!hasExpectedPath) {
    console.log('[DRIVE OAUTH FORENSIC] Redirect URI validation failed: path must be /api/drive/oauth/callback');
    return NextResponse.json({ error: 'Invalid redirect URI: path must be /api/drive/oauth/callback' }, { status: 500 });
  }

  console.log('[DRIVE OAUTH FORENSIC] Redirect URI validation passed');

  // Create OAuth state for CSRF protection
  // Explicitly pass cookie store to make request context ownership explicit
  const cookieStore = await cookies();
  const state = await createState(cookieStore);
  if (!state) {
    console.log('[DRIVE OAUTH FORENSIC] Failed to create OAuth state');
    return NextResponse.json({ error: 'Failed to create OAuth state' }, { status: 500 });
  }

  const scopes = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.photos.readonly',
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('prompt', 'consent'); // Always prompt consent for offline access

  console.log('[DRIVE OAUTH FORENSIC] Redirecting to Google OAuth:', {
    hasState: !!state,
  });

  return NextResponse.redirect(authUrl.toString());
}
