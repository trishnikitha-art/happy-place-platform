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

    const isAuthenticated = await workbenchSession.isAuthenticated();
    
    if (!isAuthenticated) {
      // Redirect to login page
      const loginUrl = new URL('/workbench/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Allow all other routes (public website, Drive OAuth, etc.)
  return NextResponse.next();
}

export const config = {
  matcher: '/workbench/:path*',
};
