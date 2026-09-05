/**
 * Workbench Authorization Configuration Diagnostic API
 *
 * Returns current Drive corpus authorization configuration for diagnostic purposes.
 * This allows verification of production authorization configuration without requiring full authentication.
 *
 * GET /api/workbench/authorization-config
 */

import { NextResponse } from 'next/server';
import { getAuthorizationConfiguration } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';

export async function GET() {
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
