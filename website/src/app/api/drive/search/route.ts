/**
 * Drive Search API Route
 *
 * Searches within an authorized Drive corpus
 * Prevents cross-corpus search attacks
 *
 * DESIGN DECISION: Search is corpus-scoped, not folder-scoped
 * This implementation searches the entire selected corpus (My Drive or specific Shared Drive)
 * rather than limiting to a folder subtree. This is intentional for UX flexibility.
 *
 * SECURITY: Application-level Drive authorization
 * - Google OAuth authentication is NOT sufficient for HPP authorization
 * - Must verify: session identity → HPP authorization → Drive authorization → corpus → search
 * - Prevents IDOR/cross-corpus access even when Google technically permits the object
 *
 * GET /api/drive/search?query=...&corpusId=...
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { workbenchSession } from '@/lib/workbench-session';
import { isAuthenticated as isDriveAuthenticated } from '@/lib/drive/oauth-manager';
import { verifySearchAuthorization } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  // CRITICAL: Authentication bypass is DANGEROUS and should only be used with explicit consent
  // This bypass requires both NODE_ENV=development AND explicit DRIVE_AUTH_BYPASS=true
  const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (authBypassEnabled) {
    console.warn('[DRIVE SEARCH API] AUTHENTICATION BYPASS ENABLED - DEVELOPMENT ONLY');
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }

    // Check Drive authentication
    if (!await isDriveAuthenticated()) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Drive authentication required' },
        { status: 401 }
      );
    }

    // P0 FIX: Verify search corpus authorization
    // Client sends driveId for Shared Drive context, server accepts both driveId and corpusId
    const { searchParams } = new URL(request.url);
    const corpusId = searchParams.get('corpusId') || searchParams.get('driveId') || undefined;
    
    const searchAuth = await verifySearchAuthorization(corpusId);
    if (!searchAuth.authorized) {
      console.error('[DRIVE_AUTHORIZATION] SEARCH_NOT_AUTHORIZED', {
        corpusId,
        reason: searchAuth.reason,
      });
      return NextResponse.json(
        {
          error: 'DRIVE_SEARCH_NOT_AUTHORIZED',
          message: searchAuth.reason || 'Search corpus is not authorized',
        },
        { status: 403 }
      );
    }
    
    console.log('[DRIVE_AUTHORIZATION] SEARCH_AUTHORIZED', {
      corpusId,
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query') || '';
    const corpusId = searchParams.get('corpusId') || undefined;
    const pageToken = searchParams.get('pageToken') || undefined;

    console.log('[DRIVE SEARCH API] Request:', { query, corpusId, pageToken });

    const result = await driveDiscovery.search(query, corpusId, pageToken);

    console.log('[DRIVE SEARCH API] Result:', {
      resultCount: result.items.length,
      nextPageToken: result.nextPageToken,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[DRIVE SEARCH API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search Drive', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}