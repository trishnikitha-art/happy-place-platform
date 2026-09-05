/**
 * Drive Discovery Service
 * 
 * Automatically discovers My Drive, Shared Drives, and known HPP folders.
 * Never requires manual path entry from the operator.
 * 
 * CRITICAL FIX: Corpus authorization enforcement at discovery layer
 * All Drive operations validate requested driveId against authorized corpus
 * This prevents bypass of application-level corpus authorization
 */

import { getDriveClient, isAuthenticated } from './oauth-manager';
import { google } from 'googleapis';
import { verifyCorpusAuthorization } from './corpus-authorization';

export interface DriveFolder {
  id: string;
  name: string;
  type: 'my_drive' | 'shared_drive' | 'folder';
  parent?: string;
  modifiedTime?: string;
  corpusId?: string; // P0 FIX: Preserve corpus context to prevent Shared Drive → My Drive drift
}

export interface DriveListContext {
  parentId: string;
  driveId?: string;
}

export interface DriveListResult {
  items: (DriveFolder | DriveFile)[];
  nextPageToken?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  createdTime?: string;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  description?: string;
  parent?: string;
}

export class DriveDiscovery {
  // Module-level stateless instance
  // DriveDiscovery contains no mutable request-specific state
  // The exported instance is safe to share across requests
  
  constructor() {}

  /**
   * Discover all accessible drives and folders
   */
  async discoverStructure(): Promise<{
    myDrive: DriveFolder | null;
    sharedDrives: DriveFolder[];
  }> {
    console.log('=== Drive Discovery Started ===');
    
    // Check if authenticated first
    const authenticated = await isAuthenticated();
    console.log('Authenticated:', authenticated);
    
    if (!authenticated) {
      console.log('Not authenticated, returning empty structure');
      return {
        myDrive: null,
        sharedDrives: [],
      };
    }

    const drive = await getDriveClient();
    console.log('Drive client obtained');

    // Verify authenticated account (Drive API v3)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const about = await (drive as any).about.get({
        fields: 'user(emailAddress,displayName,permissionId)',
      });
      console.log('Authenticated account:', {
        email: about.data.user?.emailAddress,
        displayName: about.data.user?.displayName,
        permissionId: about.data.user?.permissionId,
      });
    } catch (error) {
      console.error('Failed to get about info:', error);
    }

    // Verify Drive API itself
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const filesTest = await (drive as any).files.list({
        pageSize: 10,
        fields: 'files(id,name,mimeType)',
      });
      console.log('Drive API test - total files:', filesTest.data.files?.length || 0);
      if (filesTest.data.files?.length > 0) {
        console.log('Sample files:', filesTest.data.files.slice(0, 3).map((f: { id: string; name: string; mimeType: string }) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType,
        })));
      }
    } catch (error) {
      console.error('Drive API test failed:', error);
    }

    // Get My Drive info
    console.log('Getting My Drive info...');
    const myDrive = await this.getMyDrive(drive);
    console.log('My Drive:', myDrive);

    // Get Shared Drives
    console.log('Getting Shared Drives...');
    const sharedDrives = await this.getSharedDrives(drive);
    console.log('Shared Drives count:', sharedDrives.length);

    console.log('=== Drive Discovery Complete ===');

    return {
      myDrive,
      sharedDrives,
    };
  }

  /**
   * Get My Drive information (Drive API v3: use files.get with fileId='root')
   */
  private async getMyDrive(drive: ReturnType<typeof google.drive>): Promise<DriveFolder | null> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).files.get({
        fileId: 'root',
        fields: 'id,name,mimeType',
      });

      if (response.data) {
        return {
          id: response.data.id,
          name: response.data.name || 'My Drive',
          type: 'my_drive',
          corpusId: response.data.id, // My Drive corpus ID is its own ID
        };
      }
    } catch (error) {
      console.error('Failed to get My Drive info:', error);
    }

    return null;
  }

  /**
   * Get all Shared Drives
   */
  private async getSharedDrives(drive: ReturnType<typeof google.drive>): Promise<DriveFolder[]> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).drives.list({
        pageSize: 100,
      });

      if (response.data.drives) {
        const drives = response.data.drives.map((drive: { id: string; name: string }) => ({
          id: drive.id,
          name: drive.name,
          type: 'shared_drive',
          corpusId: drive.id, // Shared Drive corpus ID is its own ID
        }));
        
        // Log each Shared Drive ID for production configuration
        console.log('[DRIVE_DISCOVERY] Shared Drives discovered:', drives.map((d: any) => ({ id: d.id, name: d.name })));
        
        return drives;
      }
    } catch (error) {
      console.error('Failed to list Shared Drives:', error);
    }

    return [];
  }



  /**
   * List immediate children of a folder (folders and files)
   * Lazy loading - no recursion, no depth limit
   * Supports pagination via nextPageToken
   * 
   * CRITICAL FIX: Validate driveId against authorized corpus before making Drive API call
   * This prevents bypass of application-level corpus authorization
   */
  async listChildren(context: DriveListContext, pageToken?: string): Promise<DriveListResult> {
    if (!(await isAuthenticated())) {
      throw new Error('Not authenticated with Drive');
    }

    // CRITICAL FIX: Validate driveId against authorized corpus before Drive API call
    // Google OAuth access is NOT sufficient for HPP authorization
    if (context.driveId) {
      const corpusAuth = await verifyCorpusAuthorization(context.parentId, context.driveId);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_DISCOVERY] DRIVE_ID_NOT_AUTHORIZED', {
          folderId: context.parentId,
          requestedDriveId: context.driveId,
          reason: corpusAuth.reason,
        });
        throw new Error(`Drive ID ${context.driveId} is not authorized: ${corpusAuth.reason}`);
      }
      console.log('[DRIVE_DISCOVERY] DRIVE_ID_AUTHORIZED', {
        folderId: context.parentId,
        driveId: context.driveId,
        corpus: corpusAuth.corpus,
      });
    }

    const drive = await getDriveClient();

    const params: Record<string, unknown> = {
      fields: 'nextPageToken,files(id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,description,parents)',
      pageSize: 100,
      orderBy: 'folder,name_natural',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    };

    // Add shared drive support
    if (context.driveId) {
      // Shared Drive query
      params.corpora = 'drive';
      params.driveId = context.driveId;
      
      // FORENSIC: Log Shared Drive root detection for verification
      console.log('[DRIVE_DISCOVERY_FORENSIC] Shared Drive context', {
        parentId: context.parentId,
        driveId: context.driveId,
        isRoot: context.parentId === context.driveId,
        assumption: 'Shared Drive ID === root parent ID',
      });
      
      // For Shared Drive root, use the driveId as the folderId
      // Google documentation: Shared Drive ID is the ID of its top-level folder
      // Root-level items have the Shared Drive ID as their parent
      if (context.parentId === context.driveId) {
        // Shared Drive root - constrain to immediate root children
        params.q = `'${context.driveId}' in parents and trashed = false`;
        console.log('[DRIVE_DISCOVERY_FORENSIC] Using Shared Drive root query', {
          driveId: context.driveId,
          query: params.q,
        });
      } else {
        // Shared Drive folder
        params.q = `'${context.parentId}' in parents and trashed = false`;
        console.log('[DRIVE_DISCOVERY_FORENSIC] Using Shared Drive folder query', {
          parentId: context.parentId,
          driveId: context.driveId,
          query: params.q,
        });
      }
    } else {
      // My Drive query
      params.corpora = 'user';
      params.q = `'${context.parentId}' in parents and trashed = false`;
      console.log('[DRIVE_DISCOVERY_FORENSIC] Using My Drive query', {
        parentId: context.parentId,
        query: params.q,
      });
    }

    // Add pagination
    if (pageToken) {
      params.pageToken = pageToken;
    }

    console.log('[Drive Discovery] listChildren params:', {
      parentId: context.parentId,
      driveId: context.driveId,
      corpora: params.corpora,
      q: params.q,
      supportsAllDrives: params.supportsAllDrives,
      includeItemsFromAllDrives: params.includeItemsFromAllDrives,
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).files.list(params);

      const items: (DriveFolder | DriveFile)[] = [];

      if (response.data.files) {
        // FORENSIC: Log actual Google API response for Shared Drive root investigation
        if (context.driveId && context.parentId === context.driveId) {
          console.log('[DRIVE_DISCOVERY_FORENSIC] Shared Drive root Google API response:', {
            driveId: context.driveId,
            parentId: context.parentId,
            returnedCount: response.data.files.length,
            returnedIds: response.data.files.map((f: any) => f.id),
            returnedNames: response.data.files.map((f: any) => f.name),
            returnedParents: response.data.files.map((f: any) => f.parents),
            returnedDriveIds: response.data.files.map((f: any) => f.driveId),
            nextPageToken: response.data.nextPageToken,
            incompleteSearch: response.data.incompleteSearch,
          });
        }

        for (const item of response.data.files) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            items.push({
              id: item.id,
              name: item.name,
              type: 'folder',
              parent: item.parents?.[0],
              modifiedTime: item.modifiedTime,
              corpusId: context.driveId, // P0 FIX: Preserve corpus context from navigation
            });
          } else {
            items.push({
              id: item.id,
              name: item.name,
              mimeType: item.mimeType,
              size: item.size ? parseInt(item.size, 10) : undefined,
              createdTime: item.createdTime,
              modifiedTime: item.modifiedTime,
              thumbnailLink: item.thumbnailLink,
              webViewLink: item.webViewLink,
              description: item.description,
              parent: item.parents?.[0],
            });
          }
        }
      }

      console.log('[Drive Discovery] listChildren result:', {
        itemCount: items.length,
        folderCount: items.filter(i => (i as DriveFolder).type === 'folder').length,
        fileCount: items.filter(i => (i as DriveFolder).type !== 'folder').length,
        nextPageToken: response.data.nextPageToken,
      });

      return {
        items,
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      console.error(`Failed to list children for ${context.parentId}:`, error);
      throw error;
    }
  }

  /**
   * Get file metadata
   * @param fileId - The actual file ID (file identity, not corpus context)
   * @param corpusId - The corpus context (Shared Drive ID or null for My Drive)
   * 
   * CRITICAL FIX: Validate file belongs to authorized corpus before making Drive API call
   * P0 FIX: Accept corpusId parameter to preserve context through authorization chain
   */
  async getFile(fileId: string, corpusId?: string): Promise<DriveFile | null> {
    if (!(await isAuthenticated())) {
      return null;
    }

    // CRITICAL FIX: Validate file belongs to authorized corpus before Drive API call
    // Google OAuth access is NOT sufficient for HPP authorization
    // P0 FIX: Use provided corpusId for context-aware authorization
    const corpusAuth = await verifyCorpusAuthorization(fileId, corpusId);
    if (!corpusAuth.authorized) {
      console.error('[DRIVE_DISCOVERY] FILE_NOT_AUTHORIZED', {
        fileId,
        corpusId,
        reason: corpusAuth.reason,
      });
      return null; // Return null instead of error for metadata
    }
    console.log('[DRIVE_DISCOVERY] FILE_AUTHORIZED', {
      fileId,
      corpusId,
      corpus: corpusAuth.corpus,
    });

    const drive = await getDriveClient();

    try {
      const params: Record<string, unknown> = {
        fileId,
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,description,parents',
        supportsAllDrives: true,
      };

      console.log('[Drive Discovery] getFile params:', {
        fileId,
        supportsAllDrives: params.supportsAllDrives,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).files.get(params);

      if (response.data) {
        return {
          id: response.data.id,
          name: response.data.name,
          mimeType: response.data.mimeType,
          size: response.data.size ? parseInt(response.data.size, 10) : undefined,
          createdTime: response.data.createdTime,
          modifiedTime: response.data.modifiedTime,
          thumbnailLink: response.data.thumbnailLink,
          webViewLink: response.data.webViewLink,
          description: response.data.description,
          parent: response.data.parents?.[0],
        };
      }
    } catch (error) {
      console.error(`Failed to get file ${fileId}:`, error);
    }

    return null;
  }

  /**
   * Download file content
   * @param fileId - The actual file ID (file identity, not corpus context)
   * @param corpusId - The corpus context (Shared Drive ID or null for My Drive)
   * 
   * CRITICAL FIX: Validate file belongs to authorized corpus before making Drive API call
   * P0 FIX: Accept corpusId parameter to preserve context through authorization chain
   */
  async downloadFile(fileId: string, corpusId?: string): Promise<Buffer> {
    if (!(await isAuthenticated())) {
      throw new Error('Not authenticated with Drive');
    }

    // CRITICAL FIX: Validate file belongs to authorized corpus before Drive API call
    // Google OAuth access is NOT sufficient for HPP authorization
    // P0 FIX: Use provided corpusId for context-aware authorization
    const corpusAuth = await verifyCorpusAuthorization(fileId, corpusId);
    if (!corpusAuth.authorized) {
      console.error('[DRIVE_DISCOVERY] FILE_NOT_AUTHORIZED_FOR_DOWNLOAD', {
        fileId,
        corpusId,
        reason: corpusAuth.reason,
      });
      throw new Error(`File ${fileId} is not authorized: ${corpusAuth.reason}`);
    }
    console.log('[DRIVE_DISCOVERY] FILE_AUTHORIZED_FOR_DOWNLOAD', {
      fileId,
      corpusId,
      corpus: corpusAuth.corpus,
    });

    const drive = await getDriveClient();

    try {
      const params: Record<string, unknown> = {
        fileId,
        alt: 'media',
        supportsAllDrives: true,
      };

      console.log('[Drive Discovery] downloadFile params:', {
        fileId,
        supportsAllDrives: params.supportsAllDrives,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).files.get(params, { responseType: 'arraybuffer' });

      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Failed to download file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Search for files by name within a specific Drive context
   * @param query - Search query string
   * @param context - Optional Drive context (My Drive or Shared Drive)
   * 
   * CRITICAL FIX: Validate driveId against authorized corpus before Drive API call
   * CRITICAL FIX: Escape user query to prevent Drive query injection
   */
  async searchFiles(query: string, context?: DriveListContext): Promise<DriveFile[]> {
    if (!(await isAuthenticated())) {
      return [];
    }

    // CRITICAL FIX: Validate driveId against authorized corpus before Drive API call
    if (context?.driveId) {
      const corpusAuth = await verifyCorpusAuthorization(context.parentId, context.driveId);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_DISCOVERY] DRIVE_ID_NOT_AUTHORIZED_FOR_SEARCH', {
          folderId: context.parentId,
          requestedDriveId: context.driveId,
          reason: corpusAuth.reason,
        });
        return []; // Return empty results instead of error
      }
      console.log('[DRIVE_DISCOVERY] DRIVE_ID_AUTHORIZED_FOR_SEARCH', {
        folderId: context.parentId,
        driveId: context.driveId,
        corpus: corpusAuth.corpus,
      });
    }

    const drive = await getDriveClient();

    try {
      // CRITICAL FIX: Escape user query to prevent Drive query injection
      const escapedQuery = query
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");

      const params: Record<string, unknown> = {
        q: `name contains '${escapedQuery}' and trashed = false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,parents)',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };

      // Preserve Drive context for search - scope to the same corpus as browsing
      if (context?.driveId) {
        // Search within specific Shared Drive
        params.corpora = 'drive';
        params.driveId = context.driveId;
      } else {
        // Search within My Drive only
        params.corpora = 'user';
      }

      console.log('[Drive Discovery] searchFiles params:', {
        query: escapedQuery,
        corpora: params.corpora,
        driveId: params.driveId,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).files.list(params);

      if (response.data.files) {
        return response.data.files.map((file: { id: string; name: string; mimeType: string; size?: string; createdTime?: string; modifiedTime?: string; thumbnailLink?: string; webViewLink?: string; description?: string; parents?: string[] }) => ({
          id: file.id,
          name: file.name,
          mimeType: file.mimeType,
          size: file.size ? parseInt(file.size, 10) : undefined,
          modifiedTime: file.modifiedTime,
          thumbnailLink: file.thumbnailLink,
          webViewLink: file.webViewLink,
          parent: file.parents?.[0],
        }));
      }
    } catch (error) {
      console.error(`Failed to search files for "${query}":`, error);
    }

    return [];
  }

  /**
   * Search with pagination support
   * @param query - Search query string
   * @param corpusId - Optional corpus ID to scope search
   * @param pageToken - Optional page token for pagination
   * 
   * CRITICAL FIX: Validate corpusId against authorized corpus before Drive API call
   * CRITICAL FIX: Escape user query to prevent Drive query injection
   */
  async search(query: string, corpusId?: string, pageToken?: string): Promise<DriveListResult> {
    if (!(await isAuthenticated())) {
      return { items: [] };
    }

    // P0 FIX: If corpusId is undefined or 'root', this targets My Drive
    // Must verify HPP_AUTHORIZED_MY_DRIVE === true before allowing
    // Google OAuth access is NOT sufficient for HPP authorization
    if (!corpusId || corpusId === 'root') {
      const { isMyDriveAuthorized } = await import('./corpus-authorization');
      const myDriveAuthorized = isMyDriveAuthorized();
      if (!myDriveAuthorized) {
        console.error('[DRIVE_DISCOVERY] MY_DRIVE_NOT_AUTHORIZED_FOR_SEARCH', {
          reason: 'My Drive is not HPP-authorized (check HPP_AUTHORIZED_MY_DRIVE)',
        });
        return { items: [] }; // Return empty results instead of error for search
      }
      console.log('[DRIVE_DISCOVERY] MY_DRIVE_AUTHORIZED_FOR_SEARCH via HPP_AUTHORIZED_MY_DRIVE=true');
    } else {
      // CRITICAL FIX: Validate corpusId against authorized corpus before Drive API call
      // Google OAuth access is NOT sufficient for HPP authorization
      const corpusAuth = await verifyCorpusAuthorization('root', corpusId);
      if (!corpusAuth.authorized) {
        console.error('[DRIVE_DISCOVERY] CORPUS_ID_NOT_AUTHORIZED', {
          requestedCorpusId: corpusId,
          reason: corpusAuth.reason,
        });
        return { items: [] }; // Return empty results instead of error for search
      }
      console.log('[DRIVE_DISCOVERY] CORPUS_ID_AUTHORIZED', {
        corpusId,
        corpus: corpusAuth.corpus,
      });
    }

    const drive = await getDriveClient();

    try {
      // CRITICAL FIX: Escape user query to prevent Drive query injection
      // Backslashes and single quotes must be escaped in Drive query syntax
      const escapedQuery = query
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/'/g, "\\'");   // Escape single quotes

      const params: Record<string, unknown> = {
        q: `name contains '${escapedQuery}' and trashed = false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,parents),nextPageToken',
        pageSize: 100,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      };

      // P0 FIX: Only use corpora='user' (My Drive) when My Drive is explicitly authorized
      // Otherwise, scope to specific Shared Drive corpus
      if (corpusId && corpusId !== 'root') {
        params.corpora = 'drive';
        params.driveId = corpusId;
      } else {
        // My Drive search - only allowed if HPP_AUTHORIZED_MY_DRIVE === true (verified above)
        params.corpora = 'user';
      }

      if (pageToken) {
        params.pageToken = pageToken;
      }

      console.log('[Drive Discovery] search params:', {
        query: escapedQuery,
        corpora: params.corpora,
        driveId: params.driveId,
        pageToken,
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).files.list(params);

      const items: (DriveFolder | DriveFile)[] = [];
      if (response.data.files) {
        for (const file of response.data.files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            items.push({
              id: file.id,
              name: file.name,
              type: 'folder',
              parent: file.parents?.[0],
              modifiedTime: file.modifiedTime,
            });
          } else {
            items.push({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? parseInt(file.size, 10) : undefined,
              modifiedTime: file.modifiedTime,
              thumbnailLink: file.thumbnailLink,
              webViewLink: file.webViewLink,
              parent: file.parents?.[0],
            });
          }
        }
      }

      return {
        items,
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      console.error(`Failed to search for "${query}":`, error);
      return { items: [] };
    }
  }
}

// Per-request instance creation - no singleton
export const driveDiscovery = new DriveDiscovery();
