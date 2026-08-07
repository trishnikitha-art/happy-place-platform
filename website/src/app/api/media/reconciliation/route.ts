/**
 * Media Reconciliation API Route
 * 
 * Exposes the Drive ↔ Canonical Graph ↔ Website Runtime reconciliation state.
 * Shows operator exactly what's in sync and what needs attention.
 */

import { NextResponse } from 'next/server';
import { reconciliationService } from '@/lib/media/reconciliation';

export const dynamic = 'force-dynamic';

export async function GET() {
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
