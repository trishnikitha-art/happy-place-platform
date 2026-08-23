/**
 * Drive Discovery Service
 * 
 * Automatically discovers My Drive, Shared Drives, and known HPP folders.
 * Never requires manual path entry from the operator.
 */

import { getDriveClient, isAuthenticated } from './oauth-manager';
import { google } from 'googleapis';

export interface DriveFolder {
  id: string;
  name: string;
  type: 'my_drive' | 'shared_drive' | 'folder';
  parent?: string;
  modifiedTime?: string;
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
  // Singleton removed - per-request instance creation
  // No process-level state
  
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
        return response.data.drives.map((drive: { id: string; name: string }) => ({
          id: drive.id,
          name: drive.name,
          type: 'shared_drive',
        }));
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
   */
  async listChildren(context: DriveListContext, pageToken?: string): Promise<DriveListResult> {
    if (!(await isAuthenticated())) {
      throw new Error('Not authenticated with Drive');
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
      // For Shared Drive root, use the driveId as the folderId
      // Google documentation: Shared Drive ID is also the ID of its top-level folder
      // Root-level items have the Shared Drive ID as their parent
      if (context.parentId === context.driveId) {
        // Shared Drive root - constrain to immediate root children
        params.q = `'${context.driveId}' in parents and trashed = false`;
      } else {
        // Shared Drive folder
        params.q = `'${context.parentId}' in parents and trashed = false`;
      }
    } else {
      // My Drive query
      params.corpora = 'user';
      params.q = `'${context.parentId}' in parents and trashed = false`;
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
    });

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const response = await (drive as any).files.list(params);

      const items: (DriveFolder | DriveFile)[] = [];

      if (response.data.files) {
        for (const item of response.data.files) {
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            items.push({
              id: item.id,
              name: item.name,
              type: 'folder',
              parent: item.parents?.[0],
              modifiedTime: item.modifiedTime,
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
   */
  async getFile(fileId: string): Promise<DriveFile | null> {
    if (!(await isAuthenticated())) {
      return null;
    }

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
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    if (!(await isAuthenticated())) {
      throw new Error('Not authenticated with Drive');
    }

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
   */
  async searchFiles(query: string, context?: DriveListContext): Promise<DriveFile[]> {
    if (!(await isAuthenticated())) {
      return [];
    }

    const drive = await getDriveClient();

    try {
      const params: Record<string, unknown> = {
        q: `name contains '${query}' and trashed = false`,
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
        query,
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
}

// Per-request instance creation - no singleton
export const driveDiscovery = new DriveDiscovery();
