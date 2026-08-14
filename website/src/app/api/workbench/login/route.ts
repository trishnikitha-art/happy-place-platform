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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    const authenticated = await workbenchSession.authenticate(password);

    if (authenticated) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Workbench login error:', error);
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
