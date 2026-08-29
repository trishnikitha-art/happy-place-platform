/**
 * Pergolas Drive Evidence Diagnostic API Route
 *
 * EVIDENCE-PRODUCING DIAGNOSTIC
 *
 * Purpose: Establish live Google Drive evidence for Pergolas media lineage
 * before making any authority data changes.
 *
 * This diagnostic uses the existing authoritative Drive machinery to:
 * 1. Check Drive authentication status
 * 2. Discover My Drive and Shared Drives
 * 3. Search for Pergolas-related files by name
 * 4. Test whether application-style IDs (pergolas-001-hero, etc.) are real Drive file IDs
 *
 * CLASSIFICATION: READ-ONLY - No mutations, only evidence gathering
 *
 * GET /api/admin/diagnostic/pergolas-drive-evidence
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { driveSession } from '@/lib/drive/drive-session';
import { driveDiscovery } from '@/lib/drive/drive-discovery';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  const evidence: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    steps: [],
  };

  try {
    // STEP 1: Check Drive authentication
    evidence.steps.push({ step: 1, name: 'Check Drive authentication status' });
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    evidence.driveAuthenticated = isDriveAuthenticated;

    if (!isDriveAuthenticated) {
      evidence.steps.push({ step: 1, status: 'FAILED', reason: 'Not authenticated with Drive' });
      return NextResponse.json({
        error: 'Not authenticated with Drive',
        message: 'Please authenticate with Google Drive via the Workbench first',
        evidence,
      }, { status: 401 });
    }
    evidence.steps.push({ step: 1, status: 'COMPLETE' });

    // STEP 2: Discover Drive structure
    evidence.steps.push({ step: 2, name: 'Discover Drive structure' });
    try {
      const structure = await driveDiscovery.discoverStructure();
      evidence.myDrive = structure.myDrive;
      evidence.sharedDrives = structure.sharedDrives;
      evidence.steps.push({ step: 2, status: 'COMPLETE', sharedDriveCount: structure.sharedDrives.length });
    } catch (error) {
      evidence.steps.push({ step: 2, status: 'FAILED', error: error instanceof Error ? error.message : 'Unknown error' });
      return NextResponse.json({
        error: 'Failed to discover Drive structure',
        message: error instanceof Error ? error.message : 'Unknown error',
        evidence,
      }, { status: 500 });
    }

    // STEP 3: Search for Pergolas files by name
    evidence.steps.push({ step: 3, name: 'Search for Pergolas-related files by name' });
    const searchTerms = ['pergola', 'Pergola', 'PERGOLA', 'HOMESERVICEPROJECTPERGOLAS'];
    const searchResults: Record<string, unknown> = {};

    for (const term of searchTerms) {
      try {
        const results = await driveDiscovery.searchFiles(term);
        searchResults[term] = {
          count: results.length,
          files: results.slice(0, 5).map(f => ({ id: f.id, name: f.name, mimeType: f.mimeType })),
        };
      } catch (error) {
        searchResults[term] = { error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }
    evidence.searchResults = searchResults;
    evidence.steps.push({ step: 3, status: 'COMPLETE', termsSearched: searchTerms.length });

    // STEP 4: Test application-style IDs
    evidence.steps.push({ step: 4, name: 'Test application-style IDs as Drive file IDs' });
    const pergolasIds = [
      'pergolas-001-hero',
      'pergolas-001-before',
      'pergolas-001-after',
      'pergolas-001-construction',
      'pergolas-001-steel-frame',
      'pergolas-001-finished',
      'pergolas-001-master',
      'pergolas-001-variant-001',
    ];
    const idTestResults: Record<string, unknown> = {};

    for (const id of pergolasIds) {
      try {
        const file = await driveDiscovery.getFile(id);
        if (file) {
          idTestResults[id] = {
            status: 'PROVEN',
            isRealDriveFile: true,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            parent: file.parent,
          };
        } else {
          idTestResults[id] = {
            status: 'NOT_FOUND',
            isRealDriveFile: false,
          };
        }
      } catch (error) {
        idTestResults[id] = {
          status: 'ERROR',
          isRealDriveFile: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    evidence.applicationIdTests = idTestResults;
    evidence.steps.push({ step: 4, status: 'COMPLETE', idsTested: pergolasIds.length });

    // STEP 5: Test known Drive-prefixed IDs
    evidence.steps.push({ step: 5, name: 'Test known Drive-prefixed IDs from media.v1.json' });
    const knownDriveIds = ['drive-c266e5096e43', 'drive-7a4b33c8b2bb'];
    const driveIdTestResults: Record<string, unknown> = {};

    for (const id of knownDriveIds) {
      try {
        const file = await driveDiscovery.getFile(id);
        if (file) {
          driveIdTestResults[id] = {
            status: 'PROVEN',
            isRealDriveFile: true,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            parent: file.parent,
          };
        } else {
          driveIdTestResults[id] = {
            status: 'NOT_FOUND',
            isRealDriveFile: false,
          };
        }
      } catch (error) {
        driveIdTestResults[id] = {
          status: 'ERROR',
          isRealDriveFile: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }
    evidence.driveIdTests = driveIdTestResults;
    evidence.steps.push({ step: 5, status: 'COMPLETE', idsTested: knownDriveIds.length });

    // Final verdict
    const realDriveFileIds = Object.values(idTestResults).filter((r: any) => r?.isRealDriveFile).length;
    evidence.verdict = {
      totalApplicationIdsTested: pergolasIds.length,
      realDriveFileIdsFound: realDriveFileIds,
      applicationIdsAreDriveIds: realDriveFileIds > 0,
      classification: realDriveFileIds > 0 ? 'MIXED' : 'APPLICATION_ONLY',
    };

    return NextResponse.json({
      message: 'Pergolas Drive evidence diagnostic complete',
      evidence,
    });

  } catch (error) {
    console.error('[PERGOLAS_DRIVE_EVIDENCE] Fatal error:', error);
    return NextResponse.json({
      error: 'Diagnostic failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      evidence,
    }, { status: 500 });
  }
}
