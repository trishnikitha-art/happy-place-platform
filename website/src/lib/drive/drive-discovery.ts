/**
 * Drive Discovery Service
 * 
 * Automatically discovers My Drive, Shared Drives, and known HPP folders.
 * Never requires manual path entry from the operator.
 */

import { driveOAuthManager } from './oauth-manager';

export interface DriveFolder {
  id: string;
  name: string;
  type: 'my_drive' | 'shared_drive' | 'folder';
  parent?: string;
  modifiedTime?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: number;
  modifiedTime?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  parent?: string;
}

export class DriveDiscovery {
  private static instance: DriveDiscovery;

  private constructor() {}

  static getInstance(): DriveDiscovery {
    if (!DriveDiscovery.instance) {
      DriveDiscovery.instance = new DriveDiscovery();
    }
    return DriveDiscovery.instance;
  }

  /**
   * Discover all accessible drives and folders
   */
  async discoverStructure(): Promise<{
    myDrive: DriveFolder | null;
    sharedDrives: DriveFolder[];
    hppFolders: DriveFolder[];
    recentFolders: DriveFolder[];
  }> {
    console.log('=== Drive Discovery Started ===');
    
    // Check if authenticated first
    const isAuthenticated = await driveOAuthManager.isAuthenticated();
    console.log('Authenticated:', isAuthenticated);
    
    if (!isAuthenticated) {
      console.log('Not authenticated, returning empty structure');
      return {
        myDrive: null,
        sharedDrives: [],
        hppFolders: [],
        recentFolders: [],
      };
    }

    const drive = await driveOAuthManager.getDriveClient();
    console.log('Drive client obtained');

    // Verify authenticated account
    try {
      const about = await drive.about.get({
        fields: 'user(emailAddress,displayName,permissionId),storageQuota,rootFolderId',
      });
      console.log('Authenticated account:', {
        email: about.data.user?.emailAddress,
        displayName: about.data.user?.displayName,
        permissionId: about.data.user?.permissionId,
        rootFolderId: about.data.rootFolderId,
      });
    } catch (error) {
      console.error('Failed to get about info:', error);
    }

    // Verify Drive API itself
    try {
      const filesTest = await drive.files.list({
        pageSize: 10,
        fields: 'files(id,name,mimeType)',
      });
      console.log('Drive API test - total files:', filesTest.data.files?.length || 0);
      if (filesTest.data.files?.length > 0) {
        console.log('Sample files:', filesTest.data.files.slice(0, 3).map((f: any) => ({
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

    // Search for known HPP folders
    console.log('Searching HPP folders...');
    const hppFolders = await this.searchHPPFolders(drive);
    console.log('HPP folders count:', hppFolders.length);
    console.log('HPP folders:', hppFolders.map(f => ({ id: f.id, name: f.name })));

    // Get recently modified folders
    console.log('Getting recent folders...');
    const recentFolders = await this.getRecentFolders(drive);
    console.log('Recent folders count:', recentFolders.length);
    console.log('Recent folders:', recentFolders.map(f => ({ id: f.id, name: f.name })));

    console.log('=== Drive Discovery Complete ===');

    return {
      myDrive,
      sharedDrives,
      hppFolders,
      recentFolders,
    };
  }

  /**
   * Get My Drive information
   */
  private async getMyDrive(drive: any): Promise<DriveFolder | null> {
    try {
      const response = await drive.about.get({
        fields: 'driveId,name',
      });

      if (response.data) {
        return {
          id: response.data.driveId,
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
  private async getSharedDrives(drive: any): Promise<DriveFolder[]> {
    try {
      const response = await drive.drives.list({
        pageSize: 100,
      });

      if (response.data.drives) {
        return response.data.drives.map((drive: any) => ({
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
   * Search for known HPP folder patterns
   */
  private async searchHPPFolders(drive: any): Promise<DriveFolder[]> {
    const hppPatterns = [
      'Happy Place',
      'Happy Place Carpentry',
      'HPP',
      'Projects',
      'Photos',
      'Gallery',
      'Uploads',
      'Archive',
    ];

    const folders: DriveFolder[] = [];

    try {
      // Search in My Drive
      for (const pattern of hppPatterns) {
        const response = await drive.files.list({
          q: `name contains '${pattern}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
          fields: 'files(id,name,parents,modifiedTime)',
          pageSize: 50,
        });

        if (response.data.files) {
          response.data.files.forEach((folder: any) => {
            folders.push({
              id: folder.id,
              name: folder.name,
              type: 'folder',
              parent: folder.parents?.[0],
              modifiedTime: folder.modifiedTime,
            });
          });
        }
      }
    } catch (error) {
      console.error('Failed to search HPP folders:', error);
    }

    return folders;
  }

  /**
   * Get recently modified folders
   */
  private async getRecentFolders(drive: any): Promise<DriveFolder[]> {
    try {
      const response = await drive.files.list({
        q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id,name,parents,modifiedTime)',
        orderBy: 'modifiedTime desc',
        pageSize: 20,
      });

      if (response.data.files) {
        return response.data.files.map((folder: any) => ({
          id: folder.id,
          name: folder.name,
          type: 'folder',
          parent: folder.parents?.[0],
          modifiedTime: folder.modifiedTime,
        }));
      }
    } catch (error) {
      console.error('Failed to get recent folders:', error);
    }

    return [];
  }

  /**
   * List files in a folder
   */
  async listFiles(folderId: string): Promise<DriveFile[]> {
    if (!(await driveOAuthManager.isAuthenticated())) {
      return [];
    }

    const drive = await driveOAuthManager.getDriveClient();

    try {
      const response = await drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,parents)',
        pageSize: 1000,
        orderBy: 'name',
      });

      if (response.data.files) {
        return response.data.files.map((file: any) => ({
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
      console.error(`Failed to list files in folder ${folderId}:`, error);
    }

    return [];
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<DriveFile | null> {
    if (!(await driveOAuthManager.isAuthenticated())) {
      return null;
    }

    const drive = await driveOAuthManager.getDriveClient();

    try {
      const response = await drive.files.get({
        fileId,
        fields: 'id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,webViewLink,parents',
      });

      if (response.data) {
        return {
          id: response.data.id,
          name: response.data.name,
          mimeType: response.data.mimeType,
          size: response.data.size ? parseInt(response.data.size, 10) : undefined,
          modifiedTime: response.data.modifiedTime,
          thumbnailLink: response.data.thumbnailLink,
          webViewLink: response.data.webViewLink,
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
   */
  async downloadFile(fileId: string): Promise<Buffer> {
    if (!(await driveOAuthManager.isAuthenticated())) {
      throw new Error('Not authenticated with Drive');
    }

    const drive = await driveOAuthManager.getDriveClient();

    try {
      const response = await drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'arraybuffer' }
      );

      return Buffer.from(response.data);
    } catch (error) {
      console.error(`Failed to download file ${fileId}:`, error);
      throw error;
    }
  }

  /**
   * Search for files by name
   */
  async searchFiles(query: string): Promise<DriveFile[]> {
    if (!(await driveOAuthManager.isAuthenticated())) {
      return [];
    }

    const drive = await driveOAuthManager.getDriveClient();

    try {
      const response = await drive.files.list({
        q: `name contains '${query}' and trashed = false`,
        fields: 'files(id,name,mimeType,size,modifiedTime,thumbnailLink,webViewLink,parents)',
        pageSize: 100,
      });

      if (response.data.files) {
        return response.data.files.map((file: any) => ({
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

export const driveDiscovery = DriveDiscovery.getInstance();
