/**
 * Google OAuth Authorization Route
 * 
 * Initiates OAuth 2.0 flow for Google Drive access.
 * Uses PING90 Google Cloud project credentials.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  // Force the redirect URI to ensure it matches Google Cloud Console configuration
  // Do NOT use NEXT_PUBLIC_URL fallback - it can cause incorrect redirects
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/drive/oauth/callback';
  
  console.log('=== OAuth Authorize Debug ===');
  console.log('CLIENT ID prefix:', clientId?.slice(0, 20));
  console.log('redirect_uri:', redirectUri);
  console.log('NEXT_PUBLIC_URL:', process.env.NEXT_PUBLIC_URL);
  console.log('GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
  
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
  authUrl.searchParams.append('prompt', 'consent');

  console.log('FULL AUTH URL:', authUrl.toString());
  console.log('redirect_uri param value:', authUrl.searchParams.get('redirect_uri'));

  return NextResponse.redirect(authUrl.toString());
}
