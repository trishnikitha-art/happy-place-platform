/**
 * Workbench Auth Status API Endpoint
 * 
 * Returns Workbench authentication status.
 * 
 * GET /api/workbench/auth-status
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  console.log('[WORKBENCH_AUTH_STATUS] REQUEST_RECEIVED', {
    url: request.url,
    hasCookie: request.headers.has('cookie'),
    cookieHeader: request.headers.get('cookie'),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
  });

  try {
    const authenticated = await workbenchSession.isAuthenticated();
    
    console.log('[WORKBENCH_AUTH_STATUS] RESULT', { authenticated });
    
    return NextResponse.json({ authenticated });
  } catch (error) {
    console.error('[WORKBENCH_AUTH_STATUS] ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { 
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
