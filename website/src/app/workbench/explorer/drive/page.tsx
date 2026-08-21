/**
 * Drive Explorer - Browse Google Drive hierarchy
 *
 * Treats Google Drive as the source-of-truth file browser.
 * Shows folder hierarchy, thumbnails, and allows selecting assets.
 * Uses lazy loading with pagination (no recursive tree).
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Folder, FileImage, Search, Grid, List, ExternalLink, Loader2 } from 'lucide-react';
import type { DriveFolder, DriveFile } from '@/lib/drive/drive-discovery';

interface DriveExplorerState {
  loading: boolean;
  error: string | null;
  currentFolderId: string;
  breadcrumb: { id: string; name: string }[];
  items: (DriveFolder | DriveFile)[];
  viewMode: 'grid' | 'list';
  searchQuery: string;
  selectedFile: DriveFile | null;
  nextPageToken?: string;
  loadingMore: boolean;
}

export default function DriveExplorerPage() {
  const [state, setState] = useState<DriveExplorerState>({
    loading: true,
    error: null,
    currentFolderId: 'root',
    breadcrumb: [{ id: 'root', name: 'My Drive' }],
    items: [],
    viewMode: 'grid',
    searchQuery: '',
    selectedFile: null,
    nextPageToken: undefined,
    loadingMore: false,
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
        setState(prev => ({
          ...prev,
          currentFolderId: structure.myDrive.id,
          breadcrumb: [{ id: structure.myDrive.id, name: structure.myDrive.name }],
        }));
        await loadChildren(structure.myDrive.id);
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

  const loadChildren = async (folderId: string, pageToken?: string) => {
    try {
      const params = new URLSearchParams({ folderId });
      if (pageToken) params.set('pageToken', pageToken);

      const response = await fetch(`/api/drive/files?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load folder children');
      }

      const result = await response.json();

      setState(prev => ({
        ...prev,
        items: pageToken ? [...prev.items, ...result.items] : result.items,
        nextPageToken: result.nextPageToken,
        loading: false,
        loadingMore: false,
      }));
    } catch (err) {
      console.error('Failed to load children:', err);
      setState(prev => ({
        ...prev,
        error: 'Failed to load folder children',
        loading: false,
        loadingMore: false,
      }));
    }
  };

  const navigateToFolder = async (folder: DriveFolder) => {
    setState(prev => ({
      ...prev,
      currentFolderId: folder.id,
      breadcrumb: [...prev.breadcrumb, { id: folder.id, name: folder.name }],
      items: [],
      nextPageToken: undefined,
      loading: true,
    }));
    await loadChildren(folder.id);
  };

  const navigateUp = (index: number) => {
    const newBreadcrumb = state.breadcrumb.slice(0, index + 1);
    const target = newBreadcrumb[newBreadcrumb.length - 1];
    setState(prev => ({
      ...prev,
      currentFolderId: target.id,
      breadcrumb: newBreadcrumb,
      items: [],
      nextPageToken: undefined,
      loading: true,
    }));
    loadChildren(target.id);
  };

  const loadMore = () => {
    if (state.nextPageToken && !state.loadingMore) {
      setState(prev => ({ ...prev, loadingMore: true }));
      loadChildren(state.currentFolderId, state.nextPageToken);
    }
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
        alert(`Drive reference created: ${data.media.id}\n\nNOTE: This is a Drive-only reference for Workbench browsing.\nTo use this asset publicly, you must drag it to the Media Workbench to materialize it first.`);
        setState(prev => ({ ...prev, selectedFile: null }));
      } else {
        alert(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Failed to reference Drive asset:', err);
      alert('Error: Failed to reference Drive asset');
    }
  };

  const filteredItems = state.items.filter((item: any) =>
    item.name.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  const folders = filteredItems.filter((item: any) => item.type === 'folder');
  const files = filteredItems.filter((item: any) => item.type !== 'folder');

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
        {state.breadcrumb.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center gap-2">
            {index > 0 && <ChevronRight size={16} className="text-muted-foreground" />}
            <button
              onClick={() => navigateUp(index)}
              className="text-primary hover:underline whitespace-nowrap"
            >
              {crumb.name}
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
          {folders.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Folders</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {folders.map((folder: any) => (
                  <button
                    key={folder.id}
                    onClick={() => navigateToFolder(folder)}
                    className="p-4 bg-card border border-border rounded-lg hover:border-primary transition-colors text-left"
                  >
                    <Folder size={32} className="text-primary mb-2" />
                    <div className="text-sm font-medium text-foreground truncate">{folder.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {files.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3">Files</h2>
              {state.viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {files.map((file: any) => (
                    <button
                      key={file.id}
                      onClick={() => selectFile(file)}
                      className={`p-4 bg-card border rounded-lg transition-colors text-left ${
                        state.selectedFile?.id === file.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {file.thumbnailLink && file.mimeType?.startsWith('image/') ? (
                        <img
                          src={`/api/drive/files/${file.id}/thumbnail`}
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
                  {files.map((file: any) => (
                    <button
                      key={file.id}
                      onClick={() => selectFile(file)}
                      className={`w-full p-4 bg-card border rounded-lg transition-colors text-left flex items-center gap-4 ${
                        state.selectedFile?.id === file.id
                          ? 'border-primary ring-2 ring-primary'
                          : 'border-border hover:border-primary'
                      }`}
                    >
                      {file.thumbnailLink && file.mimeType?.startsWith('image/') ? (
                        <img
                          src={`/api/drive/files/${file.id}/thumbnail`}
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

              {/* Load more button */}
              {state.nextPageToken && (
                <button
                  onClick={loadMore}
                  disabled={state.loadingMore}
                  className="mt-4 w-full py-2 bg-muted rounded-lg hover:bg-muted/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {state.loadingMore ? <Loader2 size={16} className="animate-spin" /> : 'Load more'}
                </button>
              )}
            </div>
          )}

          {folders.length === 0 && files.length === 0 && (
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
