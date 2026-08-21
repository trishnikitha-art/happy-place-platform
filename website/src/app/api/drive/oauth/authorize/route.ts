/**
 * Google OAuth Authorization Route
 * 
 * Initiates OAuth 2.0 flow for Google Drive access.
 * Uses PING90 Google Cloud project credentials.
 */

import { NextResponse } from 'next/server';
import { driveSession } from '@/lib/drive/drive-session';

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

  const scopes = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.photos.readonly',
  ];

  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(' '));
  authUrl.searchParams.append('access_type', 'offline');
  
  // Check if user already has refresh token (has previously consented)
  const hasRefreshToken = await driveSession.getRefreshToken();
  
  // Only force consent on first login; subsequent logins use silent approval
  if (hasRefreshToken) {
    authUrl.searchParams.append('prompt', 'none');
  } else {
    authUrl.searchParams.append('prompt', 'consent');
  }

  console.log('[DRIVE OAUTH FORENSIC] Redirecting to Google OAuth:', {
    authUrl: authUrl.toString(),
    hasRefreshToken: !!hasRefreshToken,
    prompt: hasRefreshToken ? 'none' : 'consent',
  });

  return NextResponse.redirect(authUrl.toString());
}
