/**
 * Gallery Management Panel - Workbench
 * 
 * Allows drag reordering of project gallery images
 * Uses complete-array PUT with CAS for atomic mutations
 * Gallery identity is mediaId-based, not index-based
 * 
 * Constitutional Model:
 * - Gallery is ordered array of immutable media IDs
 * - Media identity is immutable
 * - Position is mutable editorial state
 * - Drag changes only local ordered state initially
 * - Confirmation sends complete ordered array through Gallery v2 PUT
 * - CAS conflict returns 409
 * 
 * Required Behavior:
 * - User sees current gallery in authoritative order
 * - Every gallery item has stable mediaId
 * - User can drag an item
 * - UI shows insertion position clearly
 * - Drop changes only local ordered state initially
 * - No server mutation on every dragover
 * - dragover is UI-only
 * - Only completed drop creates a proposed ordered array
 * - Proposed array is validated
 * - Duplicate media IDs are rejected
 * - Original array remains unchanged until confirmation
 * - User gets one explicit confirmation
 * - Confirmation sends the COMPLETE ordered array through Gallery v2 PUT
 * - PUT includes expectedRevision
 * - CAS conflict returns 409
 * - On 409, reload authoritative gallery and show conflict rather than silently overwriting
 * - Successful mutation updates the Workbench
 * - Public projection is refreshed/revalidated
 * - Website order must exactly equal authoritative order
 */

'use client';

import { useState, useEffect } from 'react';
import { GripVertical, ChevronRight, Save, RefreshCw, AlertCircle } from 'lucide-react';

interface GalleryItem {
  mediaId: string;
  thumbnail: string | undefined;
  alt: string | undefined;
  filename: string | undefined;
}

interface GalleryManagementState {
  projectId: string | null;
  projectName: string | null;
  gallery: GalleryItem[];
  currentRevision: number | null;
  loading: boolean;
  error: string | null;
  isSaving: boolean;
  saveError: string | null;
  hasUnsavedChanges: boolean;
  draggedIndex: number | null;
  dropTargetIndex: number | null;
}

export default function GalleryManagementPanel() {
  const [state, setState] = useState<GalleryManagementState>({
    projectId: null,
    projectName: null,
    gallery: [],
    currentRevision: null,
    loading: true,
    error: null,
    isSaving: false,
    saveError: null,
    hasUnsavedChanges: false,
    draggedIndex: null,
    dropTargetIndex: null,
  });

  const [availableProjects, setAvailableProjects] = useState<Array<{ id: string; name: string }>>([]);

  // Load available projects
  useEffect(() => {
    loadAvailableProjects();
  }, []);

  const loadAvailableProjects = async () => {
    try {
      const response = await fetch('/api/admin/projects');
      if (!response.ok) throw new Error('Failed to load projects');
      const data = await response.json();
      setAvailableProjects(data.projects || []);
    } catch (error) {
      console.error('[GALLERY_MANAGEMENT] Failed to load projects:', error);
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Failed to load projects' }));
    }
  };

  // Load gallery for selected project
  const loadGallery = async (projectId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null, saveError: null }));

    try {
      const response = await fetch(`/api/admin/projects/gallery?projectId=${projectId}`);
      if (!response.ok) throw new Error('Failed to load gallery');
      const data = await response.json();

      // Resolve media details for each gallery item
      const galleryItems: GalleryItem[] = (data.gallery || []).map((mediaId: string) => {
        return { mediaId, thumbnail: null, alt: null, filename: null };
      });

      setState(prev => ({
        ...prev,
        projectId,
        projectName: availableProjects.find(p => p.id === projectId)?.name || null,
        gallery: galleryItems,
        currentRevision: data.currentRevision || 0,
        loading: false,
        hasUnsavedChanges: false,
      }));
    } catch (error) {
      console.error('[GALLERY_MANAGEMENT] Failed to load gallery:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load gallery',
      }));
    }
  };

  const handleDragStart = (index: number) => {
    setState(prev => ({ ...prev, draggedIndex: index, dropTargetIndex: null }));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (state.draggedIndex !== null && state.draggedIndex !== index) {
      setState(prev => ({ ...prev, dropTargetIndex: index }));
    }
  };

  const handleDragEnd = () => {
    setState(prev => ({ ...prev, draggedIndex: null, dropTargetIndex: null }));
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    if (state.draggedIndex === null || state.draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }

    // Create new ordered array (local state only, no server mutation)
    const newGallery = [...state.gallery];
    const [draggedItem] = newGallery.splice(state.draggedIndex, 1);
    newGallery.splice(dropIndex, 0, draggedItem);

    console.log('[GALLERY_MANAGEMENT] LOCAL_REORDER', {
      originalLength: state.gallery.length,
      fromIndex: state.draggedIndex,
      toIndex: dropIndex,
      mediaId: draggedItem.mediaId,
    });

    setState(prev => ({
      ...prev,
      gallery: newGallery,
      hasUnsavedChanges: true,
      draggedIndex: null,
      dropTargetIndex: null,
    }));
  };

  const handleSave = async () => {
    if (!state.projectId) return;

    setState(prev => ({ ...prev, isSaving: true, saveError: null }));

    try {
      const mediaIds = state.gallery.map(item => item.mediaId);

      const response = await fetch('/api/admin/projects/gallery', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: state.projectId,
          gallery: mediaIds,
          expectedRevision: state.currentRevision,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        
        if (response.status === 409) {
          // CAS conflict - reload and show conflict
          await loadGallery(state.projectId);
          setState(prev => ({
            ...prev,
            isSaving: false,
            saveError: 'Concurrent modification detected. Your changes were not saved. The gallery has been modified by another operation. Please review the current order and try again.',
          }));
          return;
        }
        
        throw new Error(error.error || error.message || 'Failed to save gallery');
      }

      const result = await response.json();
      
      console.log('[GALLERY_MANAGEMENT] SAVE_SUCCESS', {
        projectId: state.projectId,
        newRevision: result.currentRevision,
        galleryLength: result.gallery?.length || 0,
      });

      setState(prev => ({
        ...prev,
        currentRevision: result.currentRevision,
        hasUnsavedChanges: false,
        isSaving: false,
      }));
    } catch (error) {
      console.error('[GALLERY_MANAGEMENT] SAVE_FAILED:', error);
      setState(prev => ({
        ...prev,
        isSaving: false,
        saveError: error instanceof Error ? error.message : 'Failed to save gallery',
      }));
    }
  };

  const handleReset = async () => {
    if (!state.projectId) return;
    await loadGallery(state.projectId);
  };

  const handleAddToGallery = async (mediaId: string) => {
    if (!state.projectId) return;

    // Validate no duplicate
    if (state.gallery.some(item => item.mediaId === mediaId)) {
      alert('This media is already in the gallery. Each media can only appear once.');
      return;
    }

    const newItem: GalleryItem = {
      mediaId,
      thumbnail: undefined,
      alt: undefined,
      filename: undefined,
    };

    setState(prev => ({
      ...prev,
      gallery: [...prev.gallery, newItem],
      hasUnsavedChanges: true,
    }));
  };

  const handleDeleteFromGallery = (mediaId: string) => {
    if (!confirm('Are you sure you want to remove this item from the gallery?')) {
      return;
    }

    setState(prev => ({
      ...prev,
      gallery: prev.gallery.filter(item => item.mediaId !== mediaId),
      hasUnsavedChanges: true,
    }));
  };

  if (state.loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading gallery management...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground">Gallery Management</h1>
            <span className="text-xs text-muted-foreground">
              {state.projectName ? state.projectName : 'Select a project'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {state.hasUnsavedChanges && (
              <span className="text-xs text-orange-500 font-medium">Unsaved changes</span>
            )}
            <button
              onClick={handleReset}
              disabled={!state.projectId || state.isSaving}
              className="px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} />
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={!state.projectId || !state.hasUnsavedChanges || state.isSaving}
              className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={16} />
              {state.isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <div className="shrink-0 border-b border-border bg-card px-6 py-3">
        <select
          value={state.projectId || ''}
          onChange={(e) => loadGallery(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-border rounded-lg bg-background text-foreground"
        >
          <option value="">Select a project...</option>
          {availableProjects.map(project => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>
      </div>

      {/* Error States */}
      {state.error && (
        <div className="shrink-0 mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 text-red-600" size={20} />
          <div className="text-sm text-red-900">{state.error}</div>
        </div>
      )}

      {state.saveError && (
        <div className="shrink-0 mx-6 mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="shrink-0 text-orange-600" size={20} />
          <div className="text-sm text-orange-900">{state.saveError}</div>
        </div>
      )}

      {/* Gallery Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {!state.projectId ? (
          <div className="text-center text-muted-foreground mt-8">
            Select a project to manage its gallery
          </div>
        ) : state.gallery.length === 0 ? (
          <div className="text-center text-muted-foreground mt-8">
            This project has no gallery images yet
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {state.gallery.map((item, index) => (
              <div
                key={item.mediaId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  bg-card border border-border rounded-lg p-4 cursor-grab active:cursor-grabbing
                  hover:border-primary transition-colors
                  ${state.draggedIndex === index ? 'opacity-50' : ''}
                  ${state.dropTargetIndex === index ? 'border-primary bg-primary/5' : ''}
                `}
              >
                {/* Thumbnail */}
                <div className="aspect-video bg-muted rounded mb-3 overflow-hidden">
                  {item.thumbnail ? (
                    <img
                      src={item.thumbnail}
                      alt={item.alt || item.filename || item.mediaId}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No thumbnail
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate" title={item.mediaId}>
                        {item.mediaId}
                      </p>
                      {item.filename && (
                        <p className="text-xs text-muted-foreground truncate" title={item.filename}>
                          {item.filename}
                        </p>
                      )}
                    </div>
                    <GripVertical className="text-muted-foreground" size={16} />
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Position: {index + 1} of {state.gallery.length}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-border bg-card px-6 py-3">
        <div className="text-xs text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Current Revision: {state.currentRevision}</span>
            <span>{state.gallery.length} images</span>
          </div>
        </div>
      </div>
    </div>
  );
}