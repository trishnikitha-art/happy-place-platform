/**
 * Drive Explorer - Browse Google Drive hierarchy
 *
 * Treats Google Drive as the source-of-truth file browser.
 * Shows folder hierarchy, thumbnails, and allows selecting assets.
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Folder, FileImage, Search, Grid, List, ExternalLink } from 'lucide-react';
import type { DriveFolder, DriveFile } from '@/lib/drive/drive-discovery';

interface DriveExplorerState {
  loading: boolean;
  error: string | null;
  currentFolder: DriveFolder | null;
  breadcrumb: DriveFolder[];
  viewMode: 'grid' | 'list';
  searchQuery: string;
  selectedFile: DriveFile | null;
}

export default function DriveExplorerPage() {
  const [state, setState] = useState<DriveExplorerState>({
    loading: true,
    error: null,
    currentFolder: null,
    breadcrumb: [],
    viewMode: 'grid',
    searchQuery: '',
    selectedFile: null,
  });

  useEffect(() => {
    loadDriveStructure();
  }, []);

  const loadDriveStructure = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/drive/discovery');
      if (!response.ok) {
        throw new Error('Failed to load Drive structure');
      }

      const structure = await response.json();

      // Start at My Drive root
      if (structure.myDrive) {
        const folderTree = await fetchFolderTree(structure.myDrive.id);
        setState(prev => ({
          ...prev,
          currentFolder: folderTree,
          breadcrumb: [folderTree],
          loading: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: 'Drive not connected',
          loading: false,
        }));
      }
    } catch (err) {
      console.error('Failed to load Drive structure:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to load Drive structure',
        loading: false,
      }));
    }
  };

  const fetchFolderTree = async (folderId: string): Promise<DriveFolder> => {
    const response = await fetch(`/api/drive/folder/${folderId}`);
    if (!response.ok) {
      throw new Error('Failed to load folder');
    }
    return await response.json();
  };

  const navigateToFolder = async (folder: DriveFolder) => {
    const folderTree = await fetchFolderTree(folder.id);
    setState(prev => ({
      ...prev,
      currentFolder: folderTree,
      breadcrumb: [...prev.breadcrumb, folderTree],
    }));
  };

  const navigateUp = (index: number) => {
    const newBreadcrumb = state.breadcrumb.slice(0, index + 1);
    const targetFolder = newBreadcrumb[newBreadcrumb.length - 1];
    setState(prev => ({
      ...prev,
      currentFolder: targetFolder,
      breadcrumb: newBreadcrumb,
    }));
  };

  const selectFile = (file: DriveFile) => {
    setState(prev => ({ ...prev, selectedFile: file }));
  };

  const useDriveAsset = async () => {
    if (!state.selectedFile) return;

    try {
      const response = await fetch('/api/drive/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driveId: state.selectedFile.id }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Success: ${data.action} media record "${data.media.id}"`);
        setState(prev => ({ ...prev, selectedFile: null }));
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to reference Drive asset:', err);
      alert('Error: Failed to reference Drive asset');
    }
  };

  const filteredFiles = state.currentFolder?.files?.filter(file =>
    file.name.toLowerCase().includes(state.searchQuery.toLowerCase())
  ) || [];

  const filteredFolders = state.currentFolder?.children?.filter(folder =>
    folder.name.toLowerCase().includes(state.searchQuery.toLowerCase())
  ) || [];

  return (
    <div className="p-6 h-screen flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Google Drive Explorer</h1>
        <p className="text-muted-foreground">
          Browse and select assets from your Google Drive
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={state.searchQuery}
            onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search files and folders..."
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg"
          />
        </div>

        {/* View toggle */}
        <button
          onClick={() => setState(prev => ({ ...prev, viewMode: prev.viewMode === 'grid' ? 'list' : 'grid' }))}
          className="p-2 bg-muted rounded-lg hover:bg-muted/90 transition-colors"
        >
          {state.viewMode === 'grid' ? <List size={20} /> : <Grid size={20} />}
        </button>
      </div>

      {/* Breadcrumbs */}
      <div className="flex items-center gap-2 mb-4 text-sm overflow-x-auto pb-2">
        {state.breadcrumb.map((folder, index) => (
          <div key={folder.id} className="flex items-center gap-2">
            {index > 0 && <ChevronRight size={16} className="text-muted-foreground" />}
            <button
              onClick={() => navigateUp(index)}
              className="text-primary hover:underline whitespace-nowrap"
            >
              {folder.name}
            </button>
          </div>
        ))}
      </div>

      {/* Content */}
      {state.loading ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Loading Drive...
        </div>
      ) : state.error ? (
        <div className="flex-1 flex items-center justify-center text-destructive">
          {state.error}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {/* Folders */}
          {filteredFolders.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Folders</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {filteredFolders.map(folder => (
                  <button
                    key={folder.id}
                    onClick={() => navigateToFolder(folder)}
                    className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors text-left"
                  >
                    <Folder size={32} className="text-primary mb-2" />
                    <div className="text-sm font-medium text-foreground truncate">{folder.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {folder.children?.length || 0} folders, {folder.files?.length || 0} files
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {filteredFiles.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Files</h2>
              {state.viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {filteredFiles.map(file => (
                    <button
                      key={file.id}
                      onClick={() => selectFile(file)}
                      className={`p-4 bg-card border rounded-lg transition-colors text-left ${
                        state.selectedFile?.id === file.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {file.thumbnailLink ? (
                        <img
                          src={file.thumbnailLink}
                          alt={file.name}
                          className="w-full aspect-square object-cover rounded mb-2"
                        />
                      ) : (
                        <div className="w-full aspect-square bg-muted rounded mb-2 flex items-center justify-center">
                          <FileImage size={32} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown date'}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredFiles.map(file => (
                    <button
                      key={file.id}
                      onClick={() => selectFile(file)}
                      className={`w-full p-4 bg-card border rounded-lg transition-colors text-left flex items-center gap-4 ${
                        state.selectedFile?.id === file.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {file.thumbnailLink ? (
                        <img
                          src={file.thumbnailLink}
                          alt={file.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                          <FileImage size={24} className="text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1">
                        <div className="text-sm font-medium text-foreground">{file.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown date'}
                        </div>
                      </div>
                      {file.webViewLink && (
                        <a
                          href={file.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 hover:bg-muted rounded"
                        >
                          <ExternalLink size={16} className="text-muted-foreground" />
                        </a>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No files or folders found
            </div>
          )}
        </div>
      )}

      {/* Selected file actions */}
      {state.selectedFile && (
        <div className="mt-6 p-4 bg-card border border-border rounded-lg flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-foreground">{state.selectedFile.name}</div>
            <div className="text-xs text-muted-foreground">
              {state.selectedFile.mimeType} • {state.selectedFile.size ? `${(state.selectedFile.size / 1024).toFixed(1)} KB` : 'Unknown size'}
            </div>
          </div>
          <button
            onClick={useDriveAsset}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Use This Asset
          </button>
        </div>
      )}
    </div>
  );
}
