/**
 * Canonical Graph API Route
 * 
 * Exposes the reconstructed canonical graph to the Media Runtime.
 * Includes Drive, Canonical, and Website reconciliation status.
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { graphReconstructor } from '@/lib/media/graph-reconstructor';
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
    const { assets, summary } = await graphReconstructor.reconstruct();

    return NextResponse.json({
      assets,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Graph reconstruction error:', error);
    return NextResponse.json(
      { error: 'Failed to reconstruct canonical graph', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
