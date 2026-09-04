/**
 * Drive Discovery API Route
 * 
 * Exposes automatic Drive discovery to the Media Runtime.
 * Returns My Drive, Shared Drives, HPP folders, and recent folders.
 * 
 * Requires Workbench authentication.
 */

import { NextResponse } from 'next/server';
import { driveDiscovery } from '@/lib/drive/drive-discovery';
import { workbenchSession } from '@/lib/workbench-session';
import { getAuthorizedCorpora } from '@/lib/drive/corpus-authorization';

export const dynamic = 'force-dynamic';

export async function GET() {
  // CRITICAL: Authentication bypass is DANGEROUS and should only be used with explicit consent
  // This bypass requires both NODE_ENV=development AND explicit DRIVE_AUTH_BYPASS=true
  const authBypassEnabled = process.env.NODE_ENV === 'development' && process.env.DRIVE_AUTH_BYPASS === 'true';
  
  if (authBypassEnabled) {
    console.warn('[DRIVE DISCOVERY API] AUTHENTICATION BYPASS ENABLED - DEVELOPMENT ONLY');
  } else {
    // Check Workbench authentication
    const isAuthenticated = await workbenchSession.isAuthenticated();
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Workbench authentication required' },
        { status: 401 }
      );
    }
  }

  try {
    // P0 FIX: Verify authorized corpora before returning discovery
    const authorizedCorpora = await getAuthorizedCorpora();
    
    const structure = await driveDiscovery.discoverStructure();
    
    // Filter structure to only include authorized corpora
    const filteredStructure = {
      ...structure,
      myDrive: structure.myDrive,
      sharedDrives: structure.sharedDrives?.filter(drive => 
        authorizedCorpora.some(c => c.id === drive.id && c.authorized)
      ) || [],
    };
    
    return NextResponse.json(filteredStructure);
  } catch (error) {
    console.error('Drive discovery error:', error);
    
    // Detect OAuth authorization failure (invalid_grant, revoked tokens)
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isAuthFailure = errorMessage.includes('invalid_grant') || 
                        errorMessage.includes('revoked') ||
                        errorMessage.includes('Token has been revoked') ||
                        errorMessage.includes('OAuth authorization failed');
    
    if (isAuthFailure) {
      return NextResponse.json(
        { 
          error: 'AUTHORIZATION_EXPIRED', 
          message: 'Google Drive authorization has expired or been revoked. Please re-authenticate.',
          requiresReauth: true
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to discover Drive structure', message: errorMessage },
      { status: 500 }
    );
  }
}
