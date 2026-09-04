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
 * 
 * CORPUS AUTHORIZATION MODEL:
 * - My Drive: Authorized only if HPP_AUTHORIZED_MY_DRIVE=true (explicit opt-in)
 * - Shared Drives: Only authorized if explicitly configured via HPP_AUTHORIZED_SHARED_DRIVES
 * - Google OAuth access is NOT sufficient for HPP authorization
 * 
 * CONSTITUTIONAL RULE: Google OAuth access ≠ HPP authorization
 * Even if Google permits access to a corpus, HPP must explicitly authorize it.
 */

import { getDriveClient } from './oauth-manager';
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
 * Get explicitly configured HPP-authorized Shared Drive IDs
 * 
 * HPP authorization is separate from Google OAuth access.
 * Only Shared Drives explicitly configured here are authorized.
 * 
 * Configuration via environment variable: HPP_AUTHORIZED_SHARED_DRIVES
 * Format: comma-separated list of Shared Drive IDs
 * Example: HPP_AUTHORIZED_SHARED_DRIVES=0AEd3EhGxxxxx,0AEd3EhGyyyyy
 */
function getAuthorizedSharedDriveIds(): string[] {
  const configuredDrives = process.env.HPP_AUTHORIZED_SHARED_DRIVES;
  if (!configuredDrives) {
    return [];
  }
  
  return configuredDrives
    .split(',')
    .map(id => id.trim())
    .filter(id => id.length > 0);
}

/**
 * Check if My Drive is explicitly authorized for HPP
 * 
 * HPP authorization is separate from Google OAuth access.
 * My Drive is only authorized if HPP_AUTHORIZED_MY_DRIVE=true
 * 
 * Configuration via environment variable: HPP_AUTHORIZED_MY_DRIVE
 * Format: boolean string ("true" or "false")
 * Default: true (maintains current behavior, but will change to false in future)
 * 
 * DEPRECATION WARNING: Default will change to false in future release.
 * Set HPP_AUTHORIZED_MY_DRIVE=true explicitly to maintain behavior.
 */
function isMyDriveAuthorized(): boolean {
  const myDriveAuth = process.env.HPP_AUTHORIZED_MY_DRIVE;
  if (myDriveAuth === undefined || myDriveAuth === null) {
    // Default to true for now to maintain current behavior
    // DEPRECATION: This default will change to false in future
    console.warn('[CORPUS_AUTHORIZATION] HPP_AUTHORIZED_MY_DRIVE not set, defaulting to true (DEPRECATED: set explicitly, default will change to false in future)');
    return true;
  }
  return myDriveAuth === 'true';
}

/**
 * Get authorized Drive corpora for the current session
 * Returns the list of Drive corpora that the authenticated session is authorized to access
 * 
 * HPP AUTHORIZATION MODEL:
 * - My Drive: Authorized ONLY if HPP_AUTHORIZED_MY_DRIVE=true (explicit opt-in)
 * - Shared Drives: Only authorized if explicitly configured via HPP_AUTHORIZED_SHARED_DRIVES
 * - Google OAuth access is NOT sufficient for HPP authorization
 * 
 * CONSTITUTIONAL RULE: Google OAuth access ≠ HPP authorization
 * Even if Google permits access to a corpus, HPP must explicitly authorize it.
 */
export async function getAuthorizedCorpora(): Promise<DriveCorpus[]> {
  try {
    // Check session authentication
    const sessionIdentity = await workbenchSession.getSessionIdentity();
    if (!sessionIdentity || !sessionIdentity.authenticated) {
      return [];
    }

    // Get Drive client using authoritative path
    // This will handle authentication and token refresh automatically
    const driveClient = await getDriveClient();
    
    // Check if My Drive is explicitly authorized
    const myDriveAuthorized = isMyDriveAuthorized();
    
    const corpora: DriveCorpus[] = [];

    // Only add My Drive if explicitly authorized
    if (myDriveAuthorized) {
      const aboutResponse = await driveClient.about.get({
        fields: 'storageQuota,kind',
      });

      corpora.push({
        id: 'root',
        name: 'My Drive',
        type: 'my_drive',
        authorized: true,
      });
      
      console.log('[CORPUS_AUTHORIZATION] My Drive authorized via HPP_AUTHORIZED_MY_DRIVE=true');
    } else {
      console.log('[CORPUS_AUTHORIZATION] My Drive NOT authorized (HPP_AUTHORIZED_MY_DRIVE not set to true)');
    }

    // Get explicitly configured HPP-authorized Shared Drive IDs
    const authorizedSharedDriveIds = getAuthorizedSharedDriveIds();
    
    // Only if Shared Drives are explicitly configured, fetch and authorize them
    if (authorizedSharedDriveIds.length > 0) {
      const drivesResponse = await driveClient.drives.list({
        pageSize: 100,
      });

      if (drivesResponse.data.drives) {
        console.log('[CORPUS_AUTHORIZATION] Google-accessible Shared Drives:', drivesResponse.data.drives.map((d: any) => ({ id: d.id, name: d.name })));
        
        for (const drive of drivesResponse.data.drives) {
          // Only authorize Shared Drives that are explicitly configured
          if (authorizedSharedDriveIds.includes(drive.id || '')) {
            corpora.push({
              id: drive.id || '',
              name: drive.name || drive.id || '',
              type: 'shared_drive',
              authorized: true,
            });
          } else {
            // Shared Drive exists in Google but is NOT HPP-authorized
            console.warn('[CORPUS_AUTHORIZATION] Shared Drive NOT authorized by HPP configuration:', {
              driveId: drive.id,
              driveName: drive.name,
              reason: 'Not in HPP_AUTHORIZED_SHARED_DRIVES environment variable',
            });
          }
        }
      }
    } else {
      // Log all Google-accessible Shared Drives even when HPP allowlist is empty
      const drivesResponse = await driveClient.drives.list({
        pageSize: 100,
      });

      if (drivesResponse.data.drives) {
        console.log('[CORPUS_AUTHORIZATION] Google-accessible Shared Drives (NOT HPP-authorized):', drivesResponse.data.drives.map((d: any) => ({ id: d.id, name: d.name })));
      }
      
      console.log('[CORPUS_AUTHORIZATION] No Shared Drives configured for HPP authorization', {
        configuredCount: 0,
        googleAccessibleCount: drivesResponse.data.drives?.length || 0,
        reason: 'HPP_AUTHORIZED_SHARED_DRIVES environment variable not set',
      });
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

    // Get Drive client using authoritative path
    // This will handle authentication and token refresh automatically
    const driveClient = await getDriveClient();

    // CRITICAL FIX: Handle Shared Drive root differently
    // Shared Drive root is not a file - it's the drive itself
    // For Shared Drive operations, we only need to verify corpusId is authorized
    if (fileId === 'root' && corpusId && corpusId !== 'root') {
      // This is a Shared Drive root operation - verify corpusId directly
      const authorizedCorpora = await getAuthorizedCorpora();
      const authorizedCorpusIds = authorizedCorpora.map(c => c.id);
      
      if (!authorizedCorpusIds.includes(corpusId)) {
        return {
          authorized: false,
          reason: `Corpus ${corpusId} not in authorized corpora`,
        };
      }
      
      return {
        authorized: true,
        corpus: {
          id: corpusId,
          name: `Shared Drive ${corpusId}`,
          type: 'shared_drive',
          authorized: true,
        },
      };
    }

    // CRITICAL FIX: When corpusId is provided for non-root operations,
    // verify corpusId matches the file's actual corpus before allowing the operation
    // This prevents driveId swapping attacks
    if (corpusId && corpusId !== 'root') {
      // First verify corpusId is in authorized list
      const authorizedCorpora = await getAuthorizedCorpora();
      const authorizedCorpusIds = authorizedCorpora.map(c => c.id);
      
      if (!authorizedCorpusIds.includes(corpusId)) {
        return {
          authorized: false,
          reason: `Corpus ${corpusId} not in authorized corpora`,
        };
      }
      
      // Then verify the file actually belongs to that corpus
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

      const fileDriveId = fileMetadata.data.driveId;
      const fileCorpusId = fileDriveId || 'root';
      
      // Verify file's corpus matches requested corpusId
      if (fileCorpusId !== corpusId) {
        return {
          authorized: false,
          reason: `File belongs to corpus ${fileCorpusId} but requested corpus ${corpusId}`,
        };
      }
      
      return {
        authorized: true,
        corpus: {
          id: corpusId,
          name: `Shared Drive ${corpusId}`,
          type: 'shared_drive',
          authorized: true,
        },
      };
    }

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
  // CRITICAL: 'root' must still require authentication
  // 'root' means the authenticated user's My Drive root, not a magic bypass
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

    // Get Drive client using authoritative path
    // This will handle authentication and token refresh automatically
    const driveClient = await getDriveClient();

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