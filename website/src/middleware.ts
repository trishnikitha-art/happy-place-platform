import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect Workbench routes except login page
  if (pathname.startsWith('/workbench') && pathname !== '/workbench/login') {
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
