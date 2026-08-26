/**
 * Materialization Consistency Verification API Route
 * 
 * P1-7: API endpoint to verify cross-state consistency
 * Checks KV-Blob, KV-assignment, and Drive-provenance consistency
 * 
 * GET /api/admin/materialization/consistency
 */

import { NextResponse } from 'next/server';
import { verifyCrossStateConsistency } from '@/lib/materialization-recovery';
import { workbenchSession } from '@/lib/workbench-session';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Check Workbench authentication
    const isWorkbenchAuthenticated = await workbenchSession.isAuthenticated();
    if (!isWorkbenchAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

    console.log('[MATERIALIZATION_CONSISTENCY_API] Starting consistency verification');

    // Verify cross-state consistency
    const consistencyResult = await verifyCrossStateConsistency();

    return NextResponse.json({
      success: true,
      consistency: consistencyResult,
    });
  } catch (error) {
    console.error('[MATERIALIZATION_CONSISTENCY_API] Consistency verification failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'CONSISTENCY_VERIFICATION_FAILED',
        message: 'Materialization consistency verification failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}