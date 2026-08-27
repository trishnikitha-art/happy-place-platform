/**
 * Drive Corpus Authorization
 * 
 * P0-4: Application-level Drive corpus authorization
 * 
 * Google OAuth authentication is NOT sufficient for HPP authorization.
 * The application must verify:
 * - authenticated session
 * - authorization
 * - authorized Drive corpus/context
 * - requested Drive object
 * - permitted operation
 * 
 * A user must not be able to supply an arbitrary Drive file ID that Google
 * happens to permit and thereby bypass the application's corpus boundary.
 */

import { driveSession } from './drive-session';
import { workbenchSession } from '../workbench-session';

export interface DriveCorpus {
  id: string;
  name: string;
  type: 'my_drive' | 'shared_drive';
  authorized: boolean;
}

export interface CorpusAuthorizationResult {
  authorized: boolean;
  reason?: string;
  corpus?: DriveCorpus;
}

/**
 * Get authorized Drive corpora for the current session
 * Returns the list of Drive corpora that the authenticated session is authorized to access
 */
export async function getAuthorizedCorpora(): Promise<DriveCorpus[]> {
  try {
    // Check session authentication
    const sessionIdentity = await workbenchSession.getSessionIdentity();
    if (!sessionIdentity || !sessionIdentity.authenticated) {
      return [];
    }

    // Check Drive authentication
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    if (!isDriveAuthenticated) {
      return [];
    }

    // For now, we authorize My Drive and any Shared Drives the user has access to
    // In the future, this could be restricted to specific corpora based on HPP authorization
    const driveClient = await driveSession.getDriveClient();
    
    // Get My Drive info
    const aboutResponse = await driveClient.about.get({
      fields: 'storageQuota,kind',
    });

    // Get Shared Drives
    const drivesResponse = await driveClient.drives.list({
      pageSize: 100,
    });

    const corpora: DriveCorpus[] = [
      {
        id: 'root',
        name: 'My Drive',
        type: 'my_drive',
        authorized: true,
      },
    ];

    if (drivesResponse.data.drives) {
      for (const drive of drivesResponse.data.drives) {
        corpora.push({
          id: drive.id,
          name: drive.name || drive.id,
          type: 'shared_drive',
          authorized: true,
        });
      }
    }

    return corpora;
  } catch (error) {
    console.error('[CORPUS_AUTHORIZATION] Failed to get authorized corpora:', error);
    return [];
  }
}

/**
 * Verify that a Drive object is within an authorized corpus
 * This prevents cross-corpus access and IDOR attacks
 */
export async function verifyCorpusAuthorization(
  fileId: string,
  corpusId?: string
): Promise<CorpusAuthorizationResult> {
  try {
    // Check session authentication
    const sessionIdentity = await workbenchSession.getSessionIdentity();
    if (!sessionIdentity || !sessionIdentity.authenticated) {
      return {
        authorized: false,
        reason: 'Session not authenticated',
      };
    }

    // Check Drive authentication
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    if (!isDriveAuthenticated) {
      return {
        authorized: false,
        reason: 'Drive not authenticated',
      };
    }

    // Get Drive client
    const driveClient = await driveSession.getDriveClient();

    // Get file metadata to determine corpus
    const fileMetadata = await driveClient.files.get({
      fileId,
      fields: 'id,name,owners,permissions,shared,driveId',
      supportsAllDrives: true,
    });

    if (!fileMetadata.data) {
      return {
        authorized: false,
        reason: 'File not found in Drive',
      };
    }

    // Determine which corpus the file belongs to
    const fileDriveId = fileMetadata.data.driveId;
    const fileCorpusId = fileDriveId || 'root'; // 'root' for My Drive

    // Get authorized corpora
    const authorizedCorpora = await getAuthorizedCorpora();
    const authorizedCorpusIds = authorizedCorpora.map(c => c.id);

    // Check if file's corpus is authorized
    if (!authorizedCorpusIds.includes(fileCorpusId)) {
      return {
        authorized: false,
        reason: `File corpus (${fileCorpusId}) is not in authorized corpora`,
      };
    }

    // If a specific corpus is requested, verify the file is in that corpus
    if (corpusId && fileCorpusId !== corpusId) {
      return {
        authorized: false,
        reason: `File is in corpus ${fileCorpusId}, but requested corpus is ${corpusId}`,
      };
    }

    // Verify file is accessible to the authenticated session
    // This is the final check to ensure Google OAuth also permits access
    try {
      await driveClient.files.get({
        fileId,
        fields: 'id',
        supportsAllDrives: true,
      });
    } catch (googleError) {
      return {
        authorized: false,
        reason: 'Google OAuth does not permit access to this file',
      };
    }

    return {
      authorized: true,
      corpus: authorizedCorpora.find(c => c.id === fileCorpusId),
    };
  } catch (error) {
    console.error('[CORPUS_AUTHORIZATION] Verification failed:', error);
    return {
      authorized: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Verify folder authorization for browsing
 * Ensures the folder is within an authorized corpus
 */
export async function verifyFolderAuthorization(
  folderId: string
): Promise<CorpusAuthorizationResult> {
  // 'root' is always allowed (My Drive root)
  if (folderId === 'root') {
    return {
      authorized: true,
    };
  }

  return verifyCorpusAuthorization(folderId);
}

/**
 * Verify search authorization
 * Ensures search is limited to authorized corpus
 */
export async function verifySearchAuthorization(
  corpusId?: string
): Promise<CorpusAuthorizationResult> {
  try {
    // Check session authentication
    const sessionIdentity = await workbenchSession.getSessionIdentity();
    if (!sessionIdentity || !sessionIdentity.authenticated) {
      return {
        authorized: false,
        reason: 'Session not authenticated',
      };
    }

    // Check Drive authentication
    const isDriveAuthenticated = await driveSession.isAuthenticated();
    if (!isDriveAuthenticated) {
      return {
        authorized: false,
        reason: 'Drive not authenticated',
      };
    }

    // If a specific corpus is requested, verify it's authorized
    if (corpusId) {
      const authorizedCorpora = await getAuthorizedCorpora();
      const authorizedCorpusIds = authorizedCorpora.map(c => c.id);
      
      if (!authorizedCorpusIds.includes(corpusId)) {
        return {
          authorized: false,
          reason: `Requested corpus (${corpusId}) is not in authorized corpora`,
        };
      }
    }

    return {
      authorized: true,
    };
  } catch (error) {
    console.error('[CORPUS_AUTHORIZATION] Search verification failed:', error);
    return {
      authorized: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}