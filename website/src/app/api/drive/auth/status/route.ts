/**
 * Drive Authentication Status API Route
 *
 * Checks if user is authenticated with Google Drive.
 * Used by workbench to determine if "Connect Google Account" button should show.
 */

import { NextResponse } from 'next/server';
import { driveSession } from '@/lib/drive/drive-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const credentials = await driveSession.getCredentials();
    const authenticated = await driveSession.isAuthenticated();

    console.log('[DRIVE AUTH STATUS FORENSIC]', {
      authenticated,
      hasAccessToken: !!credentials?.access_token,
      hasRefreshToken: !!credentials?.refresh_token,
      hasExpiry: !!credentials?.expiry_date,
      hasScope: !!credentials?.scope,
    });

    return NextResponse.json({
      authenticated,
      has_access_token: !!credentials?.access_token,
      has_refresh_token: !!credentials?.refresh_token,
      has_expiry_date: !!credentials?.expiry_date,
      has_scope: !!credentials?.scope,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[DRIVE AUTH STATUS FORENSIC] Auth status check error:', error);
    return NextResponse.json({
      authenticated: false,
      has_access_token: false,
      has_refresh_token: false,
      has_expiry_date: false,
      has_scope: false,
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  }
}
