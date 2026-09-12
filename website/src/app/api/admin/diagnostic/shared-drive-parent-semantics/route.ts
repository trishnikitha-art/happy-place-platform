/**
 * Diagnostic Endpoint: Verify Shared Drive Root Parent Semantics
 * 
 * Tests the actual Google Drive API response to determine:
 * - What parent ID is returned for files immediately in Shared Drive root
 * - What parent ID is returned for files in Shared Drive subfolders
 * - Whether Shared Drive ID equals root folder parent ID
 * - Whether the current implementation assumption is correct
 * 
 * This requires production access to a real Shared Drive.
 * 
 * POST /api/admin/diagnostic/shared-drive-parent-semantics
 */

import { NextResponse } from 'next/server';
import { workbenchSession } from '@/lib/workbench-session';
import { getDriveClient } from '@/lib/drive/oauth-manager';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Require Workbench authentication
  const isAuthenticated = await workbenchSession.isAuthenticated();
  if (!isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Workbench authentication required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { sharedDriveId } = body;

    if (!sharedDriveId) {
      return NextResponse.json(
        { error: 'Bad request', message: 'sharedDriveId is required' },
        { status: 400 }
      );
    }

    // Check Drive authentication
    const { isAuthenticated: isDriveAuthenticated } = await import('@/lib/drive/oauth-manager');
    if (!await isDriveAuthenticated()) {
      return NextResponse.json(
        { error: 'Not authenticated with Drive', message: 'Please authenticate with Google Drive first' },
        { status: 401 }
      );
    }

    const driveClient = await getDriveClient();

    console.log('[SHARED_DRIVE_PARENT_SEMANTICS] Testing Shared Drive:', sharedDriveId);

    const results = {
      sharedDriveId,
      assumptions: {
        currentImplementation: 'Assumes parentId === driveId for Shared Drive root',
        expectedQuery: `'${sharedDriveId}' in parents and trashed = false`,
      },
      findings: {
        rootFolderParentId: null as string | null,
        rootFileParentIds: [] as string[],
        subfolderFileParentIds: [] as string[],
        rootFolderId: null as string | null,
      },
      validation: {
        assumptionCorrect: false,
        evidence: [] as string[],
      },
    };

    // STEP 1: Get the Shared Drive root folder metadata
    console.log('[SHARED_DRIVE_PARENT_SEMANTICS] STEP 1: Get Shared Drive root folder');
    try {
      const driveResponse = await driveClient.drives.get({
        driveId: sharedDriveId,
        fields: 'id,name,rootFolderId',
      });

      results.findings.rootFolderId = driveResponse.data.rootFolderId;
      console.log('[SHARED_DRIVE_PARENT_SEMANTICS] Shared Drive root folder ID:', results.findings.rootFolderId);

      results.validation.evidence.push(`Shared Drive root folder ID: ${results.findings.rootFolderId}`);
      results.validation.evidence.push(`Shared Drive ID: ${sharedDriveId}`);
      results.validation.evidence.push(`Are they equal? ${results.findings.rootFolderId === sharedDriveId}`);

      if (results.findings.rootFolderId !== sharedDriveId) {
        results.validation.evidence.push('CRITICAL: Shared Drive ID ≠ root folder ID');
      }
    } catch (error) {
      console.error('[SHARED_DRIVE_PARENT_SEMANTICS] Failed to get Shared Drive metadata:', error);
      results.validation.evidence.push(`Failed to get Shared Drive metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // STEP 2: List files using current implementation assumption
    console.log('[SHARED_DRIVE_PARENT_SEMANTICS] STEP 2: Test current implementation query');
    try {
      const currentQueryFiles = await driveClient.files.list({
        corpora: 'drive',
        driveId: sharedDriveId,
        q: `'${sharedDriveId}' in parents and trashed = false`,
        pageSize: 10,
        fields: 'files(id,name,parents,mimeType)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const files = currentQueryFiles.data.files || [];
      console.log('[SHARED_DRIVE_PARENT_SEMANTICS] Files returned by current query:', files.length);

      // Collect parent IDs from returned files
      const parentIds = new Set<string>();
      files.forEach((file: any) => {
        if (file.parents && file.parents.length > 0) {
          file.parents.forEach((parentId: string) => {
            parentIds.add(parentId);
            results.findings.rootFileParentIds.push(parentId);
          });
        }
      });

      results.validation.evidence.push(`Current query returned ${files.length} files`);
      results.validation.evidence.push(`Parent IDs found: ${Array.from(parentIds).join(', ')}`);
      results.validation.evidence.push(`Does any file have Shared Drive ID as parent? ${parentIds.has(sharedDriveId)}`);

      if (files.length === 0) {
        results.validation.evidence.push('WARNING: Current query returned ZERO files');
        results.validation.evidence.push('This suggests the assumption may be WRONG');
      }
    } catch (error) {
      console.error('[SHARED_DRIVE_PARENT_SEMANTICS] Failed to list files with current query:', error);
      results.validation.evidence.push(`Current query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // STEP 3: List files using root folder ID (alternative approach)
    if (results.findings.rootFolderId) {
      console.log('[SHARED_DRIVE_PARENT_SEMANTICS] STEP 3: Test root folder ID query');
      try {
        const rootFolderQueryFiles = await driveClient.files.list({
          corpora: 'drive',
          driveId: sharedDriveId,
          q: `'${results.findings.rootFolderId}' in parents and trashed = false`,
          pageSize: 10,
          fields: 'files(id,name,parents,mimeType)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const files = rootFolderQueryFiles.data.files || [];
        console.log('[SHARED_DRIVE_PARENT_SEMANTICS] Files returned by root folder ID query:', files.length);

        results.validation.evidence.push(`Root folder ID query returned ${files.length} files`);

        if (files.length > 0) {
          results.validation.evidence.push('This suggests root folder ID is the correct parent');
        }
      } catch (error) {
        console.error('[SHARED_DRIVE_PARENT_SEMANTICS] Failed to list files with root folder ID:', error);
        results.validation.evidence.push(`Root folder ID query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // STEP 4: Find a subfolder and test its children
    console.log('[SHARED_DRIVE_PARENT_SEMANTICS] STEP 4: Find subfolder and test its children');
    try {
      const folders = await driveClient.files.list({
        corpora: 'drive',
        driveId: sharedDriveId,
        q: `mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        pageSize: 10,
        fields: 'files(id,name,parents)',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      const folderList = folders.data.files || [];
      console.log('[SHARED_DRIVE_PARENT_SEMANTICS] Folders found:', folderList.length);

      if (folderList.length > 0) {
        const firstFolder = folderList[0];
        const folderId = firstFolder.id;
        const folderParents = firstFolder.parents || [];

        results.validation.evidence.push(`Test folder ID: ${folderId}`);
        results.validation.evidence.push(`Test folder parents: ${folderParents.join(', ')}`);
        results.validation.evidence.push(`Test folder has Shared Drive ID as parent? ${folderParents.includes(sharedDriveId)}`);

        // List files in this subfolder
        const subfolderFiles = await driveClient.files.list({
          corpora: 'drive',
          driveId: sharedDriveId,
          q: `'${folderId}' in parents and trashed = false`,
          pageSize: 5,
          fields: 'files(id,name,parents)',
          supportsAllDrives: true,
          includeItemsFromAllDrives: true,
        });

        const subFileList = subfolderFiles.data.files || [];
        console.log('[SHARED_DRIVE_PARENT_SEMANTICS] Files in subfolder:', subFileList.length);

        subFileList.forEach((file: any) => {
          if (file.parents && file.parents.length > 0) {
            results.findings.subfolderFileParentIds.push(...file.parents);
          }
        });

        results.validation.evidence.push(`Subfolder has ${subFileList.length} files`);
        results.validation.evidence.push(`Subfolder file parent IDs: ${results.findings.subfolderFileParentIds.join(', ')}`);
      }
    } catch (error) {
      console.error('[SHARED_DRIVE_PARENT_SEMANTICS] Failed to test subfolder:', error);
      results.validation.evidence.push(`Subfolder test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // STEP 5: Determine if assumption is correct
    console.log('[SHARED_DRIVE_PARENT_SEMANTICS] STEP 5: Validate assumption');
    
    // Assumption is correct if:
    // 1. Shared Drive ID equals root folder ID
    // 2. Current query returns files
    // 3. Returned files have Shared Drive ID as parent
    const assumptionCorrect = 
      results.findings.rootFolderId === sharedDriveId &&
      results.findings.rootFileParentIds.length > 0 &&
      results.findings.rootFileParentIds.includes(sharedDriveId);

    results.validation.assumptionCorrect = assumptionCorrect;

    if (assumptionCorrect) {
      results.validation.evidence.push('VALIDATION: Current implementation assumption is CORRECT');
    } else {
      results.validation.evidence.push('VALIDATION: Current implementation assumption is INCORRECT');
      
      if (results.findings.rootFolderId && results.findings.rootFolderId !== sharedDriveId) {
        results.validation.evidence.push('RECOMMENDATION: Use rootFolderId instead of driveId for Shared Drive root query');
      }
    }

    console.log('[SHARED_DRIVE_PARENT_SEMANTICS] Validation complete:', {
      assumptionCorrect,
      evidenceCount: results.validation.evidence.length,
    });

    return NextResponse.json({
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[SHARED_DRIVE_PARENT_SEMANTICS] Diagnostic error:', error);
    return NextResponse.json(
      { 
        error: 'Diagnostic failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
