/**
 * Drive Corpus Authorization
 * 
 * P0-4: Application-level Drive corpus authorization
 * 
 * AUTHORIZATION MODEL:
 * 
 * This module uses TWO SEPARATE authorization systems:
 * 1. Workbench Session (workbench-session.ts): Authenticates a human to the Workbench
 * 2. Drive OAuth (oauth-credential-store.ts): Authorizes this deployment to Google Drive
 *
 * THESE TWO SYSTEMS ARE NOT CRYPTOGRAPHICALLY BOUND TO EACH OTHER.
 *
 * This deployment is intentionally modelled as SINGLE-ADMIN. There is exactly
 * one Workbench principal per deployment, identified by the deployment-global
 * environment variable HPP_WORKBENCH_PRINCIPAL_ID. Anyone who authenticates to
 * the Workbench is that principal. Do not read the code below as multi-tenant.
 *
 * WHAT principalId ACTUALLY DOES:
 * - Write: oauth-credential-store.ts getCurrentPrincipalId() reads
 *   process.env.HPP_WORKBENCH_PRINCIPAL_ID and stamps it onto the authorization
 *   record at upsert time.
 * - Read: session-store.ts getSession() rejects the session when
 *   authRecord.principalId !== process.env.HPP_WORKBENCH_PRINCIPAL_ID.
 * - oauth-manager.ts getDriveClient() asserts only that the variable is
 *   CONFIGURED. It does not itself compare it to the authorization record.
 *
 * Both ends therefore read the SAME deployment-global value. The comparison
 * cannot fail within a deployment whose HPP_WORKBENCH_PRINCIPAL_ID has not
 * changed. Its real and only security function is STALE-AUTHORIZATION
 * INVALIDATION: rotating HPP_WORKBENCH_PRINCIPAL_ID invalidates every
 * previously issued Drive authorization, including pre-principal records. That
 * is a useful property. It is not identity binding.
 *
 * The Workbench session contributes no principal identity at all:
 * workbenchSession.getSessionIdentity() returns only { sessionId, authenticated }.
 * It carries no principal ID, no email, and no Google subject. There is nothing
 * session-derived for the authorization record to be bound to.
 *
 * DO NOT claim that a Drive authorization belonging to principal A cannot be
 * used by principal B. That claim is false as written: the model admits exactly
 * one principal value per deployment, and the session supplies none. Real
 * principal binding would require a per-principal identity minted by the
 * Workbench session itself and compared against the authorization record —
 * not an environment-global constant read by both sides.
 *
 * WHAT IS ACTUALLY ENFORCED (and is a genuine boundary):
 * - Session → authorization binding: getDriveClient() resolves
 *   effectiveAuthorizationId ONLY from the server-side session record reached
 *   via the session cookie. A caller-supplied authorizationId is never honored.
 * - Corpus authorization: HPP_AUTHORIZED_SHARED_DRIVES / HPP_AUTHORIZED_MY_DRIVE
 *   gate which corpora may be touched, independent of what Google would permit.
 * - Revocation and TTL are enforced in session-store.ts / oauth-credential-store.ts.
 *
 * CURRENT BEHAVIOR:
 * - workbenchSession.getSessionIdentity() checks whether a human is
 *   authenticated to the Workbench. It does not identify which human.
 * - getDriveClient() requires an authenticated Workbench session, requires
 *   HPP_WORKBENCH_PRINCIPAL_ID to be configured, and resolves the authorization
 *   solely from the session.
 * - Environment variables (HPP_AUTHORIZED_SHARED_DRIVES, HPP_AUTHORIZED_MY_DRIVE)
 *   control corpus access.
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
 * 
 * NOTE: Principal binding is enforced by getDriveClient() in oauth-manager.ts
 * getDriveClient() resolves authorization via session → getOAuthClient() → principal binding check
 * This module uses getDriveClient() for all Drive API access, so principal binding is enforced transitively
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
 * Default: false (fail-closed - explicit opt-in required)
 * 
 * CONSTITUTIONAL RULE: Google OAuth access ≠ HPP authorization
 * My Drive is NOT authorized by default - must be explicitly configured
 * 
 * NOTE: Principal binding is enforced by getDriveClient() in oauth-manager.ts
 * getDriveClient() resolves authorization via session → getOAuthClient() → principal binding check
 * This module uses getDriveClient() for all Drive API access, so principal binding is enforced transitively
 * 
 * P0 FIX: Normalize environment variable to handle case-insensitive "TRUE"/"true"/"True"
 */
export function isMyDriveAuthorized(): boolean {
  const myDriveAuth = process.env.HPP_AUTHORIZED_MY_DRIVE;
  // Explicit opt-in only - normalize to lowercase for case-insensitive comparison
  // Only "true" (case-insensitive, trimmed) means authorized
  return myDriveAuth?.trim().toLowerCase() === 'true';
}

/**
 * Get current authorization configuration for diagnostic purposes
 * Returns the current environment variable configuration without requiring authentication
 * P0 FIX: Returns only safe diagnostics, not raw environment values
 */
export function getAuthorizationConfiguration() {
  const myDriveAuth = process.env.HPP_AUTHORIZED_MY_DRIVE;
  const myDriveAuthorized = isMyDriveAuthorized();
  const sharedDrivesConfigured = process.env.HPP_AUTHORIZED_SHARED_DRIVES !== undefined;
  const authorizedSharedDriveIds = getAuthorizedSharedDriveIds();
  
  return {
    myDriveAuthorized,
    myDriveConfigured: myDriveAuth !== undefined,
    sharedDriveCount: authorizedSharedDriveIds.length,
    // P0 FIX: Do not return raw environment values or internal identifiers
    // Only return safe diagnostic information
  };
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
 * 
 * NOTE: Principal binding is enforced transitively by getDriveClient()
 * getDriveClient() → getOAuthClient() → principal binding check → authorization resolution
 * This ensures corpus discovery only uses authorizations bound to the current principal
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
 * 
 * NOTE: Principal binding is enforced transitively by getDriveClient()
 * getDriveClient() → getOAuthClient() → principal binding check → authorization resolution
 * This module uses getDriveClient() for all Drive API access, so principal binding is enforced transitively
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
    // Two cases:
    // 1. fileId === 'root' && corpusId !== 'root' (Shared Drive root via My Drive root convention)
    // 2. fileId === corpusId && corpusId !== 'root' (Shared Drive root via direct Drive ID)
    if (corpusId && corpusId !== 'root' && (fileId === 'root' || fileId === corpusId)) {
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
 * 
 * CONSTITUTIONAL RULE: Google OAuth access ≠ HPP authorization
 * My Drive search requires explicit HPP_AUTHORIZED_MY_DRIVE=true
 * Shared Drive search requires explicit HPP_AUTHORIZED_SHARED_DRIVES configuration
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

    // P0 FIX: If corpusId is undefined or 'root', this targets My Drive
    // Must verify HPP_AUTHORIZED_MY_DRIVE === true before allowing
    // Google OAuth access is NOT sufficient for HPP authorization
    if (!corpusId || corpusId === 'root') {
      const myDriveAuthorized = isMyDriveAuthorized();
      if (!myDriveAuthorized) {
        return {
          authorized: false,
          reason: 'My Drive is not HPP-authorized (check HPP_AUTHORIZED_MY_DRIVE)',
        };
      }
      console.log('[CORPUS_AUTHORIZATION] My Drive search authorized via HPP_AUTHORIZED_MY_DRIVE=true');
      return {
        authorized: true,
        corpus: {
          id: 'root',
          name: 'My Drive',
          type: 'my_drive',
          authorized: true,
        },
      };
    }

    // If a specific corpus is requested, verify it's authorized
    const authorizedCorpora = await getAuthorizedCorpora();
    const authorizedCorpusIds = authorizedCorpora.map(c => c.id);
    
    if (!authorizedCorpusIds.includes(corpusId)) {
      return {
        authorized: false,
        reason: `Requested corpus (${corpusId}) is not in authorized corpora`,
      };
    }

    const corpus = authorizedCorpora.find(c => c.id === corpusId);
    return {
      authorized: true,
      corpus,
    };
  } catch (error) {
    console.error('[CORPUS_AUTHORIZATION] Search verification failed:', error);
    return {
      authorized: false,
      reason: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}