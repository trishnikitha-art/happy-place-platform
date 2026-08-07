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
    const authenticated = await driveSession.isAuthenticated();
    return NextResponse.json({ authenticated });
  } catch (error) {
    console.error('Auth status check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
