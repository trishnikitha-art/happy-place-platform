/**
 * Materialization Recovery API Route
 * 
 * P1-7: API endpoint to trigger materialization recovery
 * Detects and repairs incomplete materialization states
 * 
 * POST /api/admin/materialization/recovery
 */

import { NextResponse } from 'next/server';
import { runMaterializationRecovery, verifyCrossStateConsistency } from '@/lib/materialization-recovery';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

    console.log('[MATERIALIZATION_RECOVERY_API] Starting recovery');

    // Run full recovery
    const recoveryResult = await runMaterializationRecovery();

    // Verify cross-state consistency
    const consistencyResult = await verifyCrossStateConsistency();

    return NextResponse.json({
      success: true,
      recovery: recoveryResult,
      consistency: consistencyResult,
    });
  } catch (error) {
    console.error('[MATERIALIZATION_RECOVERY_API] Recovery failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'RECOVERY_FAILED',
        message: 'Materialization recovery failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}