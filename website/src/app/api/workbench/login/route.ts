/**
 * Workbench Login API Endpoint
 * 
 * Authenticates user and creates Workbench session.
 * 
 * POST /api/workbench/login
 * Body: { password: string }
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  console.log('[WORKBENCH_LOGIN] REQUEST_RECEIVED', {
    url: request.url,
    hasCookie: request.headers.has('cookie'),
    cookieHeader: request.headers.get('cookie'),
    userAgent: request.headers.get('user-agent'),
    origin: request.headers.get('origin'),
    referer: request.headers.get('referer'),
  });

  try {
    const body = await request.json();
    const { password } = body;

    console.log('[WORKBENCH_LOGIN] PASSWORD_PROVIDED', {
      hasPassword: !!password,
      passwordLength: password?.length,
    });

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const authenticated = await workbenchSession.authenticate(password);

    console.log('[WORKBENCH_LOGIN] AUTHENTICATION_RESULT', {
      authenticated,
    });

    if (authenticated) {
      console.log('[WORKBENCH_LOGIN] SUCCESS');
      return NextResponse.json({ success: true });
    } else {
      console.log('[WORKBENCH_LOGIN] FAILED - Invalid password');
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    // Handle JSON parsing errors specifically
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error('[WORKBENCH_LOGIN] JSON_PARSE_ERROR', error);
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }
    
    console.error('[WORKBENCH_LOGIN] ERROR', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
