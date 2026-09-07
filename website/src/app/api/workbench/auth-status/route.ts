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

export async function GET() {
  try {
    const authenticated = await workbenchSession.isAuthenticated();
    
    return NextResponse.json({ authenticated });
  } catch (error) {
    console.error('[WORKBENCH_AUTH_STATUS] Error:', error);
    return NextResponse.json(
      { 
        authenticated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
