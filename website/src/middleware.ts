import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect Workbench routes except login page and preview routes
  // Preview routes are internal rendering surface for authenticated Workbench iframe
  if (pathname.startsWith('/workbench') && pathname !== '/workbench/login' && !pathname.startsWith('/workbench/preview')) {
    // CRITICAL: Development bypass requires explicit DRIVE_AUTH_BYPASS=true
    // Prevents accidental development authentication bypass
    const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
    
    if (authBypassEnabled) {
      console.warn('[MIDDLEWARE] DEVELOPMENT_AUTH_BYPASS_ENABLED - DRIVE_AUTH_BYPASS=true');
      return NextResponse.next();
    }

    const sessionId = request.cookies.get('workbench_session_id')?.value ?? null;

    try {
      const validation = await workbenchSession.validateSessionId(sessionId);

      if (validation.status === 'unavailable') {
        return new NextResponse('Workbench authentication is temporarily unavailable. Please try again.', {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'Retry-After': '30',
          },
        });
      }

      if (validation.status !== 'authenticated') {
        const loginUrl = new URL('/workbench/login', request.url);
        const response = NextResponse.redirect(loginUrl);
        response.headers.set('Cache-Control', 'no-store');
        if (sessionId) response.cookies.delete('workbench_session_id');
        return response;
      }
    } catch (error) {
      console.error('[MIDDLEWARE] WORKBENCH_SESSION_VALIDATION_FAILED', {
        errorName: error instanceof Error ? error.name : 'UnknownError',
      });
      return new NextResponse('Workbench authentication is temporarily unavailable. Please try again.', {
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Retry-After': '30',
        },
      });
    }
  }

  // Allow all other routes (public website, Drive OAuth, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: '/workbench/:path*',
  // Workbench auth uses Node crypto and @upstash/redis.
  runtime: 'nodejs',
};
