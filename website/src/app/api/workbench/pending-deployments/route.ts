/**
 * Pending Deployments API
 * 
 * Returns prepared deployment transactions available for retry.
 * This enables recovery of transactions that were preserved after failed deployments.
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { loadPendingDeploymentTransactions } from '@/lib/load-pending-deployments';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  // Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Workbench authentication required" },
      { status: 401 }
    );
  }

  try {
    const transactions = await loadPendingDeploymentTransactions();
    
    return NextResponse.json({
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error('[PENDING DEPLOYMENTS API] Error:', error);
    return NextResponse.json(
      { error: "Failed to load pending deployments" },
      { status: 500 }
    );
  }
}
