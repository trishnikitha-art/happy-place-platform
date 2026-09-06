/**
 * Workbench Authorization Configuration Diagnostic API
 *
 * Returns current Drive corpus authorization configuration for diagnostic purposes.
 * This allows verification of production authorization configuration.
 *
 * P0 FIX: Requires Workbench authentication for security
 * Returns only safe diagnostics, not raw environment values or internal identifiers
 *
 * GET /api/workbench/authorization-config
 */

import { NextResponse } from 'next/server';
import { getAuthorizationConfiguration } from '@/lib/drive/corpus-authorization';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  // P0 FIX: Require Workbench authentication for security
  const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
  if (!isWorkbenchAuthenticated) {
    return NextResponse.json(
      { 
        error: 'WORKBENCH_AUTH_REQUIRED',
        message: 'Workbench authentication required',
      },
      { status: 401 }
    );
  }

  try {
    const config = getAuthorizationConfiguration();
    
    console.log('[AUTHORIZATION_CONFIG] Current configuration:', config);
    
    return NextResponse.json({
      configuration: config,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[AUTHORIZATION_CONFIG] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve authorization configuration',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
