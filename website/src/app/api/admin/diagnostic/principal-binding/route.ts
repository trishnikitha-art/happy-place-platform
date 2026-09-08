/**
 * Principal Binding Diagnostic
 * 
 * Reports Workbench ↔ Drive authorization binding configuration
 * Returns only safe diagnostic information, never secret values
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getAuthorizationConfiguration } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  console.log('[PRINCIPAL_BINDING] Diagnostic requested');
  
  const report = {
    timestamp: new Date().toISOString(),
    workbenchPrincipal: {
      configured: !!process.env.HPP_WORKBENCH_PRINCIPAL_ID,
      // P0 FIX: Do not return actual principal ID - only presence check
    },
    corpusAuthorization: getAuthorizationConfiguration(),
    workbenchAuthentication: {
      // Check if Workbench session is authenticated
      authenticated: await workbenchSession.isAuthenticated(),
    },
  };
  
  return NextResponse.json(report);
}
