/**
 * Media Reconciliation API Route
 * 
 * Exposes the Drive ↔ Canonical Graph ↔ Website Runtime reconciliation state.
 * Shows operator exactly what's in sync and what needs attention.
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { reconciliationService } from '@/lib/media/reconciliation';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  try {
    const state = await reconciliationService.reconcile();
    return NextResponse.json(state);
  } catch (error) {
    console.error('Reconciliation error:', error);
    return NextResponse.json(
      { error: 'Failed to reconcile media state', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
