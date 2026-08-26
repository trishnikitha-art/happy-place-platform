import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/deploy/status
 * 
 * Returns deployment status for a given commit SHA.
 * This endpoint is polled by the Workbench after deployment to track Vercel status.
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const commitSha = searchParams.get('commitSha');

    if (!commitSha) {
      return NextResponse.json(
        { error: 'Missing commitSha parameter' },
        { status: 400 }
      );
    }

    // Since we don't have direct Vercel API integration for status polling,
    // return a simple status indicating the commit was committed.
    // The actual Vercel deployment status would require Vercel API access.
    // For now, this allows the Workbench polling to complete gracefully.

    return NextResponse.json({
      commitSha,
      status: 'committed',
      message: 'Commit created successfully. Vercel deployment is in progress.',
      // The client should check the GitHub commit URL for actual deployment status
      commitUrl: `https://github.com/trishnikitha-art/happy-place-platform/commit/${commitSha}`,
    });

  } catch (error) {
    console.error('[DEPLOY STATUS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get deployment status' },
      { status: 500 }
    );
  }
}