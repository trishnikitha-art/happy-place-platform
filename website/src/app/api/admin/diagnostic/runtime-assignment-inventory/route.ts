/**
 * Runtime Assignment Inventory Diagnostic API Route
 * 
 * Provides server-side diagnostic of the actual KV state to identify
 * media resolution failures. This is NOT a production API - it's a forensic
 * diagnostic tool for investigating the "red/broken" visual state on non-Home pages.
 * 
 * TEMPORARILY DISABLED: diagnostic-assignment-inventory script not available
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // CRITICAL: Verify Workbench authentication before exposing diagnostic data
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { 
        error: 'WORKBENCH_AUTH_REQUIRED',
        message: 'Workbench authentication required for diagnostic access',
      },
      { status: 401 }
    );
  }

  return NextResponse.json(
    {
      error: 'DIAGNOSTIC_DISABLED',
      message: 'Runtime assignment inventory diagnostic temporarily disabled - missing diagnostic script',
    },
    { status: 503 }
  );
}
