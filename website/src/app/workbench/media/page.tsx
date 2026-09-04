"use client";

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, Layers, Database, FolderOpen, Folder, FileImage, ChevronRight, Loader2, List, AlertCircle, LayoutGrid, Plus, X, Info, MoreVertical } from 'lucide-react';
import { loadVisualAssetRegistry, addDriveAssetToRegistry, type VisualAsset } from '@/lib/visual-asset-registry';
import { slotRegistry, type RegisteredSlot } from '@/lib/slot-registry';
import type { DriveFolder, DriveFile } from '@/lib/drive/drive-discovery';
import { getWebsiteStructure, getPageByRoute, type WebsitePage, type WebsiteSection, type VisualSlotRef } from '@/lib/website-structure';

type PageRoute = '/' | '/services' | '/our-work' | '/about' | '/reviews' | '/estimate';

interface MediaWorkbenchState {
  loading: boolean;
  assets: VisualAsset[];
  selectedPage: PageRoute;
  selectedSlot: RegisteredSlot | null;
  selectedAsset: VisualAsset | null;
  searchQuery: string;
  filter: 'all' | 'used' | 'unused' | 'drive' | 'published' | 'legacy';
  registeredSlots: RegisteredSlot[];
  pendingAssignments: Map<string, { slot: RegisteredSlot; asset: VisualAsset }>;
  isAccepting: boolean;
  driveBrowsing: boolean;
  driveStructure: { myDrive: any; sharedDrives: any[] } | null;
  driveFiles: (DriveFolder | DriveFile)[];
  driveLoading: boolean;
  driveError: string | null;
  driveCurrentFolderId: string;
  driveCurrentDriveId: string | null;
  driveBreadcrumb: { id: string; name: string }[];
  driveSelectedFile: DriveFile | null;
  driveViewMode: 'grid' | 'list';
  driveNextPageToken?: string;
  driveLoadingMore: boolean;
  kvAvailable: boolean;
  kvError: string | null;
  showAddSlotDialog: boolean;
  newSlotId: string;
  newSlotName: string;
  newSlotSection: string;
  websiteStructure: WebsitePage[];
  selectedSlotForContext: { x: number; y: number; slot: VisualSlotRef } | null;
}

const PAGE_LABELS: Record<PageRoute, string> = {
  '/': 'Homepage',
  '/services': 'Services',
  '/our-work': 'Our Work',
  '/about': 'About',
  '/reviews': 'Reviews',
  '/estimate': 'Estimate',
};

export default function MediaWorkbench() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);
  const assetsRef = useRef<VisualAsset[]>([]);
  const registeredSlotsRef = useRef<RegisteredSlot[]>([]);

  const [state, setState] = useState<MediaWorkbenchState>({
    loading: true,
    assets: [],
    selectedPage: '/',
    selectedSlot: null,
    selectedAsset: null,
    searchQuery: '',
    filter: 'all',
    registeredSlots: [],
    pendingAssignments: new Map(),
    isAccepting: false,
    driveBrowsing: false,
    driveStructure: null,
    driveFiles: [],
    driveLoading: false,
    driveError: null,
    driveCurrentFolderId: 'root',
    driveCurrentDriveId: null,
    driveBreadcrumb: [{ id: 'root', name: 'My Drive' }],
    driveSelectedFile: null,
    driveViewMode: 'grid',
    driveNextPageToken: undefined,
    driveLoadingMore: false,
    kvAvailable: true,
    kvError: null,
    showAddSlotDialog: false,
    newSlotId: '',
    newSlotName: '',
    newSlotSection: 'Hero',
    websiteStructure: [],
    selectedSlotForContext: null,
  });

  // Keep refs in sync with state
  useEffect(() => {
    assetsRef.current = state.assets;
  }, [state.assets]);

  useEffect(() => {
    registeredSlotsRef.current = state.registeredSlots;
  }, [state.registeredSlots]);

  const loadCanonicalData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Load static visual asset registry (media.v1.json)
      const staticRegistry = await loadVisualAssetRegistry();
      
      // Load dynamic media from KV (Drive records) - fail-closed if KV unavailable
      // Server-side API route to avoid exposing KV credentials to browser
      let dynamicMediaList: any[] = [];
      try {
        const response = await fetch('/api/workbench/media-authority', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'list' }),
        });
        
        if (response.ok) {
          const data = await response.json();
          dynamicMediaList = data.media || [];
          console.log('[WORKBENCH] KV_MEDIA_LOADED', { count: dynamicMediaList.length });
        } else {
          console.warn('[WORKBENCH] KV_UNAVAILABLE', { status: response.status });
          setState(prev => ({ 
            ...prev, 
            kvAvailable: false, 
            kvError: `KV authority unavailable (${response.status})` 
          }));
        }
      } catch (error) {
        console.warn('[WORKBENCH] KV_ERROR', error);
        setState(prev => ({ 
          ...prev, 
          kvAvailable: false, 
          kvError: error instanceof Error ? error.message : 'Unknown KV error' 
        }));
      }
      
      // Merge static and dynamic media (dynamic wins on ID collision)
      const mergedRegistry = [...staticRegistry];
      dynamicMediaList.forEach((dynamicMedia: any) => {
        const existingIndex = mergedRegistry.findIndex(a => a.id === dynamicMedia.id);
        if (existingIndex >= 0) {
          mergedRegistry[existingIndex] = dynamicMedia;
        } else {
          mergedRegistry.push(dynamicMedia);
        }
      });
      
      setState(prev => ({ 
        ...prev, 
        assets: mergedRegistry, 
        loading: false 
      }));
      
      console.log('[WORKBENCH] CANONICAL_DATA_LOADED', {
        staticCount: staticRegistry.length,
        dynamicCount: dynamicMediaList.length,
        mergedCount: mergedRegistry.length,
      });
    } catch (error) {
      console.error('[WORKBENCH] LOAD_ERROR', error);
      setState(prev => ({ 
        ...prev, 
        loading: false,
        kvAvailable: false,
        kvError: error instanceof Error ? error.message : 'Unknown error'
      }));
    }
  };

  const handleSlotClick = (slot: RegisteredSlot) => {
    console.log('[WORKBENCH] SLOT_CLICKED', {
      slotId: slot.id,
      route: slot.route,
      page: slot.page,
      section: slot.section,
      slotName: slot.slotName,
      currentMediaId: slot.currentMediaId,
    });
    
    setState(prev => ({ ...prev, selectedSlot: slot }));
    
    // If slot has media, select that media
    if (slot.currentMediaId) {
      const asset = state.assets.find(a => a.id === slot.currentMediaId);
      if (asset) {
        setState(prev => ({ ...prev, selectedAsset: asset }));
      }
    }
  };

  const handleAssetClick = (asset: VisualAsset) => {
    setState(prev => ({ ...prev, selectedAsset: asset }));
    const usingSlots = (state.registeredSlots || []).filter(s => s.currentMediaId === asset.id);
    if (usingSlots.length > 0) {
      setState(prev => ({ ...prev, selectedSlot: usingSlots[0] }));
    }
  };

  const handleDragStart = (e: React.DragEvent, asset: VisualAsset | any, driveFile?: any) => {
    console.log('[DND] DRAG_START', {
      isDriveFile: !!driveFile,
      assetId: asset?.id,
      fileId: driveFile?.id,
      filename: driveFile?.name || asset?.filename,
      source: driveFile ? 'google-drive' : asset?.source,
    });
    
    // If this is a Drive file that's not yet ingested, emit Drive identity
    if (driveFile && driveFile.id) {
      const driveReference = {
        source: 'google-drive' as const,
        fileId: driveFile.id,
        sharedDriveId: state.driveCurrentDriveId || undefined,
        name: driveFile.name,
        mimeType: driveFile.mimeType, // Do NOT default - must be provided by Drive
        modifiedTime: driveFile.modifiedTime,
        webViewUrl: driveFile.webViewLink,
      };
      
      e.dataTransfer.setData(
        'application/x-workbench-asset',
        JSON.stringify(driveReference)
      );
      
      e.dataTransfer.setData('text/plain', `drive:${driveFile.id}`);
      
      console.log('[DND] DATA_TRANSFER_SET', {
        type: 'drive-reference',
        driveReference,
      });
    } else if (asset) {
      // Existing asset - use asset ID
      const assetId = asset.id;
      
      e.dataTransfer.setData(
        'application/x-workbench-asset',
        JSON.stringify({
          assetId,
          source: asset.source,
        })
      );
      
      e.dataTransfer.setData('text/plain', assetId);
      
      console.log('[DND] DATA_TRANSFER_SET', {
        type: 'asset-reference',
        assetId,
        source: asset.source,
      });
    }

    e.dataTransfer.effectAllowed = 'copy';
    if (asset) {
      setState(prev => ({ ...prev, selectedAsset: asset }));
    }
  };

  const handleDriveDropToSlot = async (
    slot: RegisteredSlot,
    media: VisualAsset,
    currentMediaId: string | null,
    requestId: string
  ) => {
    console.log('[DND] HANDLE_DRIVE_DROP_TO_SLOT', {
      requestId,
      slotId: slot.id,
      slotName: slot.slotName,
      mediaId: media.id,
      mediaFilename: media.filename,
      currentMediaId,
    });

    if (!confirm(`Replace "${slot.slotName}" with "${media.filename}"?`)) {
      console.log('[DND] DROP_CANCELLED_BY_USER', { requestId });
      return;
    }

    try {
      setState(prev => ({ ...prev, isAccepting: true }));

      // Call assignment API to make the assignment
      const response = await fetch('/api/workbench/assign-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slotId: slot.id,
          mediaId: media.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to assign media');
      }

      const result = await response.json();
      console.log('[DND] ASSIGNMENT_SUCCESS', {
        requestId,
        slotId: slot.id,
        mediaId: media.id,
        result,
      });

      // Update local state
      setState(prev => {
        const updatedSlots = prev.registeredSlots.map(s =>
          s.id === slot.id ? { ...s, currentMediaId: media.id } : s
        );
        return {
          ...prev,
          registeredSlots: updatedSlots,
          selectedSlot: { ...slot, currentMediaId: media.id },
        };
      });

      // Force iframe reload to pick up authority changes after assignment
      if (iframeRef.current) {
        console.log('[DND] IFRAME_RELOAD_TRIGGERED', {
          slotId: slot.id,
          assetId: media.id,
        });
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch (error) {
      console.error('[DND] ASSIGNMENT_ERROR', { requestId, error });
      alert(`Failed to assign media: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setState(prev => ({ ...prev, isAccepting: false }));
    }
  };

  const materializeDriveFile = async (
    applicationData: any,
    slot: RegisteredSlot,
    requestId: string
  ) => {
    console.log('[DND] MATERIALIZING_DRIVE_FILE', {
      requestId,
      fileId: applicationData.fileId,
      sharedDriveId: applicationData.sharedDriveId,
      slotId: slot.id,
    });

    try {
      setState(prev => ({ ...prev, isAccepting: true }));

      // Call materialization API
      const response = await fetch('/api/workbench/materialize-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: applicationData.fileId,
          sharedDriveId: applicationData.sharedDriveId,
          fileName: applicationData.name,
          mimeType: applicationData.mimeType,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to materialize Drive file');
      }

      const result = await response.json();
      console.log('[DND] MATERIALIZATION_SUCCESS', {
        requestId,
        assetId: result.asset.id,
        filename: result.asset.filename,
      });

      // Add to registry
      addDriveAssetToRegistry(result.asset);

      // Reload canonical data to include new asset
      await loadCanonicalData();

      // Now assign to slot
      const asset = result.asset;
      await handleDriveDropToSlot(slot, asset, slot.currentMediaId, requestId);
    } catch (error) {
      console.error('[DND] MATERIALIZATION_ERROR', { requestId, error });
      alert(`Failed to materialize Drive file: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setState(prev => ({ ...prev, isAccepting: false }));
    }
  };

  const verifyMediaMaterializationComplete = async (assetId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/workbench/verify-materialization?assetId=${assetId}`);
      if (!response.ok) {
        console.warn('[DND] VERIFICATION_FAILED', { assetId, status: response.status });
        return false;
      }
      const result = await response.json();
      return result.complete === true;
    } catch (error) {
      console.error('[DND] VERIFICATION_ERROR', { assetId, error });
      return false;
    }
  };

  const loadDriveStructure = async () => {
    try {
      setState(prev => ({ ...prev, driveLoading: true, driveError: null }));
      
      const response = await fetch('/api/drive/discovery');
      if (!response.ok) {
        throw new Error('Failed to load Drive structure');
      }
      
      const structure = await response.json();
      setState(prev => ({ 
        ...prev, 
        driveStructure: structure, 
        driveLoading: false 
      }));
      
      console.log('[WORKBENCH] DRIVE_STRUCTURE_LOADED', structure);
    } catch (error) {
      console.error('[WORKBENCH] DRIVE_STRUCTURE_ERROR', error);
      setState(prev => ({ 
        ...prev, 
        driveLoading: false, 
        driveError: error instanceof Error ? error.message : 'Failed to load Drive structure' 
      }));
    }
  };

  const loadDriveFiles = async (folderId: string, pageToken?: string, driveId?: string | null) => {
    try {
      setState(prev => ({ ...prev, driveLoading: true, driveError: null }));
      
      const params = new URLSearchParams({ folderId });
      if (pageToken) params.append('pageToken', pageToken);
      if (driveId) params.append('driveId', driveId);
      
      const response = await fetch(`/api/drive/files?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to load Drive files');
      }
      
      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        driveFiles: pageToken ? [...(prev.driveFiles || []), ...(data.items || [])] : (data.items || []),
        driveNextPageToken: data.nextPageToken,
        driveLoading: false,
      }));
      
      console.log('[WORKBENCH] DRIVE_FILES_LOADED', { 
        count: data.items?.length || 0, 
        hasMore: !!data.nextPageToken 
      });
    } catch (error) {
      console.error('[WORKBENCH] DRIVE_FILES_ERROR', error);
      setState(prev => ({ 
        ...prev, 
        driveLoading: false, 
        driveError: error instanceof Error ? error.message : 'Failed to load Drive files' 
      }));
    }
  };

  const selectDriveFile = (file: DriveFile) => {
    setState(prev => ({ ...prev, driveSelectedFile: file }));
  };

  const navigateToFolder = (folder: DriveFolder) => {
    setState(prev => ({
      ...prev,
      driveCurrentFolderId: folder.id,
      driveBreadcrumb: [...prev.driveBreadcrumb, { id: folder.id, name: folder.name }],
      driveFiles: [],
      driveNextPageToken: undefined,
    }));
    loadDriveFiles(folder.id, undefined, state.driveCurrentDriveId);
  };

  const navigateBreadcrumb = (index: number) => {
    const target = state.driveBreadcrumb[index];
    setState(prev => ({
      ...prev,
      driveCurrentFolderId: target.id,
      driveBreadcrumb: prev.driveBreadcrumb.slice(0, index + 1),
      driveFiles: [],
      driveNextPageToken: undefined,
    }));
    loadDriveFiles(target.id, undefined, state.driveCurrentDriveId);
  };

  const loadMoreDriveFiles = () => {
    if (state.driveNextPageToken && !state.driveLoadingMore) {
      setState(prev => ({ ...prev, driveLoadingMore: true }));
      loadDriveFiles(state.driveCurrentFolderId, state.driveNextPageToken, state.driveCurrentDriveId);
    }
  };

  const cancelAssignment = () => {
    setState(prev => ({ ...prev, pendingAssignments: new Map() }));
  };

  const removePendingAssignment = (slotId: string) => {
    setState(prev => {
      const newAssignments = new Map(prev.pendingAssignments);
      newAssignments.delete(slotId);
      return { ...prev, pendingAssignments: newAssignments };
    });
  };

  const openAddSlotDialog = () => {
    setState(prev => ({ 
      ...prev, 
      showAddSlotDialog: true,
      newSlotId: `custom-slot-${Date.now()}`,
      newSlotName: '',
      newSlotSection: 'Hero'
    }));
  };

  const closeAddSlotDialog = () => {
    setState(prev => ({ 
      ...prev, 
      showAddSlotDialog: false,
      newSlotId: '',
      newSlotName: '',
      newSlotSection: 'Hero'
    }));
  };

  const addNewSlot = () => {
    const { newSlotId, newSlotName, newSlotSection, selectedPage } = state;
    
    if (!newSlotId.trim() || !newSlotName.trim()) {
      alert('Please provide both a slot ID and slot name');
      return;
    }

    // Check if slot ID already exists
    const existingSlot = state.registeredSlots.find(s => s.id === newSlotId);
    if (existingSlot) {
      alert(`Slot ID "${newSlotId}" already exists on route "${existingSlot.route}"`);
      return;
    }

    // Add slot to registry
    const newSlot: Omit<RegisteredSlot, 'element'> = {
      id: newSlotId.trim(),
      route: selectedPage,
      page: PAGE_LABELS[selectedPage],
      section: newSlotSection,
      slotName: newSlotName.trim(),
      currentMediaId: null,
      component: 'CustomSlot',
    };

    slotRegistry.addSlot(newSlot);
    
    console.log('[WORKBENCH] NEW_SLOT_ADDED', {
      slotId: newSlot.id,
      route: newSlot.route,
      page: newSlot.page,
      section: newSlot.section,
      slotName: newSlot.slotName,
    });

    alert(`Visual slot "${newSlotName}" added successfully.\n\nSlot ID: ${newSlotId}\nRoute: ${selectedPage}\nSection: ${newSlotSection}\n\nNote: This is a programmatic slot. To use it in the website, you must add a VisualSlot component with this ID to the corresponding page component.`);

    closeAddSlotDialog();
    loadCanonicalData(); // Refresh to show the new slot
  };

  const handleSlotRightClick = (e: React.MouseEvent, slot: VisualSlotRef) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ 
      ...prev, 
      selectedSlotForContext: { x: e.clientX, y: e.clientY, slot }
    }));
  };

  const closeContextMenu = () => {
    setState(prev => ({ ...prev, selectedSlotForContext: null }));
  };

  // Close context menu on click outside
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const removeSlot = (slotId: string, route: string) => {
    if (!confirm(`Remove visual slot "${slotId}"?\n\nThis will remove the slot from the registry. Any media assignments to this slot will also be removed.`)) {
      return;
    }

    slotRegistry.removeSlot(slotId, route);
    
    console.log('[WORKBENCH] SLOT_REMOVED', {
      slotId,
      route,
    });

    alert(`Visual slot "${slotId}" removed successfully.`);

    loadCanonicalData(); // Refresh to show updated slots
  };

  // Main effect for loading data and setting up event listeners
  useEffect(() => {
    console.log('[WORKBENCH] MESSAGE_LISTENER_ATTACHING');

    loadCanonicalData();

    // Load website structure for slot grid
    const structure = getWebsiteStructure();
    setState(prev => ({ ...prev, websiteStructure: structure }));

    // Subscribe to slot registry changes
    const unsubscribe = slotRegistry.subscribe(() => {
      const allSlots = slotRegistry.getAll();
      console.log('[FORENSIC] WORKBENCH REGISTRY UPDATE', {
        slotCount: allSlots.length,
        slotIds: allSlots.map(s => ({ id: s.id, currentMediaId: s.currentMediaId })),
      });
      setState(prev => ({ ...prev, registeredSlots: allSlots }));
    });

    // Listen for slot click events from iframe
    const handleSlotClickEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { id } = customEvent.detail;
      console.log('[FORENSIC] WORKBENCH SLOT CLICK EVENT', { slotId: id });
      const slot = slotRegistry.get(id);
      if (slot) {
        console.log('[FORENSIC] WORKBENCH SLOT CLICK RESOLVED', {
          slotId: slot.id,
          currentMediaId: slot.currentMediaId,
        });
        handleSlotClick(slot);
      } else {
        console.log('[FORENSIC] WORKBENCH SLOT CLICK NOT FOUND', { slotId: id });
      }
    };

    // Listen for gallery delete events from iframe
    const handleDeleteGalleryEvent = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { slotId } = customEvent.detail;
      console.log('[DELETE GALLERY] EVENT_RECEIVED', { slotId });

      // Directly execute the delete logic
      if (!confirm('Are you sure you want to delete this gallery image? This will remove the media assignment from the gallery slot.')) {
        return;
      }

      try {
        const slot = state.registeredSlots.find(s => s.id === slotId);
        if (!slot || slot.section !== 'Gallery') {
          alert('This delete action is only available for gallery slots.');
          return;
        }

        // Parse slot ID to get project ID and mediaId
        // Format: our-work-gallery::{projectId}::{mediaId}
        const idPart = slotId.replace('our-work-gallery::', '');
        const lastDoubleColonIndex = idPart.lastIndexOf('::');
        const projectId = idPart.substring(0, lastDoubleColonIndex);
        const mediaId = idPart.substring(lastDoubleColonIndex + 2);
        console.log('[DELETE GALLERY] PARSED_SLOT', { slotId, projectId, mediaId });

        // FIX: Use atomic PUT authority instead of legacy DELETE
        // Get current gallery, remove by mediaId, PUT complete array
        const getResponse = await fetch(`/api/admin/projects/gallery?projectId=${projectId}`);
        if (!getResponse.ok) {
          throw new Error('Failed to fetch current gallery');
        }
        const galleryData = await getResponse.json();
        const currentGallery = galleryData.gallery || [];
        const currentRevision = galleryData.currentRevision || 0;

        // Remove media by mediaId (stable identity, not index)
        const newGallery = currentGallery.filter((id: string) => id !== mediaId);

        const response = await fetch('/api/admin/projects/gallery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, gallery: newGallery, expectedRevision: currentRevision }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to delete gallery assignment');
        }

        const result = await response.json();
        console.log('[DELETE GALLERY] SUCCESS', { projectId, galleryLength: result.gallery?.length || 0, staged: result.staged });

        // Provide clear feedback about staging status
        if (result.staged) {
          alert(`Gallery change staged successfully.\n\nStatus: ${result.persistence === 'kv' ? 'Staged for deployment' : 'Development mode (immediate)'}\nTransaction ID: ${result.transactionId}\n\nNote: In production, staged changes require clicking "CONFIRM ALL" in the Workbench to deploy.`);
        } else {
          alert(`Gallery change saved immediately (development mode).`);
        }

        // Reload canonical data after successful deletion
        loadCanonicalData();
      } catch (error) {
        console.error('[DELETE GALLERY] ERROR', error);
        alert(`Failed to delete gallery assignment: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Listen for gallery add events from iframe
    const handleAddToGalleryEvent = async (event: Event) => {
      const customEvent = event as CustomEvent;
      const { slotId, projectId } = customEvent.detail;
      console.log('[ADD TO GALLERY] EVENT_RECEIVED', { slotId, projectId });

      // Prompt user to select media to add
      const asset = state.selectedAsset;
      if (!asset) {
        alert('Please select a media asset from the Workbench panel first.');
        return;
      }

      if (!confirm(`Add "${asset.filename}" to gallery? This will append it to the project's gallery without replacing existing photos.`)) {
        return;
      }

      try {
        // FIX: Use atomic PUT authority instead of legacy POST
        // Get current gallery, append mediaId, PUT complete array with CAS
        const getResponse = await fetch(`/api/admin/projects/gallery?projectId=${projectId}`);
        if (!getResponse.ok) {
          throw new Error('Failed to fetch current gallery');
        }
        const galleryData = await getResponse.json();
        const currentGallery = galleryData.gallery || [];
        const currentRevision = galleryData.currentRevision || 0;

        // Append mediaId to gallery
        const newGallery = [...currentGallery, asset.id];

        const response = await fetch('/api/admin/projects/gallery', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId, gallery: newGallery, expectedRevision: currentRevision }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to add to gallery');
        }

        const result = await response.json();
        console.log('[ADD TO GALLERY] SUCCESS', { projectId, mediaId: asset.id, galleryLength: result.gallery?.length || 0, staged: result.staged });

        // Provide clear feedback about staging status
        if (result.staged) {
          alert(`Successfully added "${asset.filename}" to gallery.\n\nStatus: ${result.persistence === 'kv' ? 'Staged for deployment' : 'Development mode (immediate)'}\nTransaction ID: ${result.transactionId}\nGallery now has ${result.gallery?.length || 0} photos.\n\nNote: In production, staged changes require clicking "CONFIRM ALL" in the Workbench to deploy.`);
        } else {
          alert(`Successfully added "${asset.filename}" to gallery (development mode). Gallery now has ${result.gallery?.length || 0} photos.`);
        }

        // Reload canonical data after successful add
        loadCanonicalData();
      } catch (error) {
        console.error('[ADD TO GALLERY] ERROR', error);
        alert(`Failed to add to gallery: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Listen for iframe messages (SLOT_REGISTER and SLOT_CLICK)
    const handleMessage = async (event: MessageEvent) => {
      const iframeWindow = iframeRef.current?.contentWindow;
      console.log('[WB_FORENSIC] RAW_MESSAGE_DATA', {
        data: event.data,
        keys: event.data && typeof event.data === 'object' ? Object.keys(event.data) : [],
        type: event.data?.type,
        dataString: JSON.stringify(event.data),
        timestamp: Date.now(),
      });

      console.log('[WB_FORENSIC] MESSAGE_RECEIVED', {
        eventType: event.type,
        eventOrigin: event.origin,
        expectedOrigin: window.location.origin,
        originMatch: event.origin === window.location.origin,
        sourceMatchesIframe: iframeWindow === event.source,
        iframeExists: !!iframeRef.current,
        iframeContentWindowExists: !!iframeWindow,
        eventSourceExists: !!event.source,
        messageType: event.data?.type,
        messageKeys: event.data ? Object.keys(event.data) : [],
        slotId: event.data?.slot?.id,
        iframeSrc: iframeRef.current?.src,
        timestamp: Date.now(),
      });

      // Filter: Only process Workbench protocol messages from same origin
      // Note: iframe.source reference may not be stable, so rely on origin + message type
      if (!event.data || typeof event.data.type !== 'string') {
        console.log('[WB_FORENSIC] MESSAGE_REJECTED', {
          reason: 'INVALID_DATA_TYPE',
          hasData: !!event.data,
          dataType: typeof event.data,
          typeType: typeof event.data?.type,
        });
        return;
      }

      // Accept messages from same origin (security)
      if (event.origin !== window.location.origin) {
        console.log('[WB_FORENSIC] MESSAGE_REJECTED', {
          reason: 'ORIGIN_MISMATCH',
          expectedOrigin: window.location.origin,
          actualOrigin: event.origin,
        });
        return;
      }

      console.log('[WB_FORENSIC] MESSAGE_ACCEPTED', {
        reason: 'VALID_ORIGIN_AND_TYPE',
        messageType: event.data.type,
      });

      const messageType = event.data.type;

      // Filter to only process application's known message types
      const knownMessageTypes = ['SLOT_REGISTER', 'SLOT_DROP', 'SLOT_CLICK', 'REFRESH_SLOTS'];
      if (!knownMessageTypes.includes(messageType)) {
        console.log('[WB_FORENSIC] MESSAGE_REJECTED', {
          reason: 'UNKNOWN_MESSAGE_TYPE',
          messageType,
          knownMessageTypes,
        });
        return;
      }

      if (messageType === 'SLOT_REGISTER') {
        console.log('[WB_FORENSIC] SLOT_REGISTER_RECEIVED', {
          slotId: event.data.slot?.id,
          route: event.data.slot?.route,
          page: event.data.slot?.page,
          section: event.data.slot?.section,
          slotName: event.data.slot?.slotName,
          currentMediaId: event.data.slot?.currentMediaId,
          component: event.data.slot?.component,
          currentRegisteredSlots: state.registeredSlots.length,
          timestamp: Date.now(),
        });

        console.log('[WORKBENCH] REGISTER_TO_PARENT_REGISTRY');

        console.log('[SLOT] REGISTER_RECEIVED_IN_PARENT', {
          slotId: event.data.slot?.id,
          route: event.data.slot?.route,
          currentRegisteredSlots: state.registeredSlots.length,
          origin: event.origin,
        });
        
        // Store iframe slot directly from payload (iframe and parent have separate JS contexts)
        const iframeSlot: RegisteredSlot = {
          id: event.data.slot.id,
          route: event.data.slot.route,
          page: event.data.slot.page,
          section: event.data.slot.section,
          slotName: event.data.slot.slotName,
          currentMediaId: event.data.slot.currentMediaId,
          element: null, // iframe element not accessible from parent
          component: event.data.slot.component,
        };

        slotRegistry.register(iframeSlot);

        console.log('[WORKBENCH] PARENT_REGISTRY_REGISTERED', {
          registeredCount: slotRegistry.getAll().length,
          slotIds: slotRegistry.getAll().map(s => s.id),
        });

        // Update React state to reflect new registration (UPSERT, not append)
        setState(prev => {
          // Check if slot already exists
          const existingIndex = prev.registeredSlots.findIndex(s => s.id === iframeSlot.id);
          let newRegisteredSlots;
          
          if (existingIndex >= 0) {
            // Replace existing slot
            newRegisteredSlots = [...prev.registeredSlots];
            newRegisteredSlots[existingIndex] = iframeSlot;
            console.log('[WB_FORENSIC] SLOT_REGISTER_UPSERTED', {
              slotId: iframeSlot.id,
              action: 'REPLACED',
              existingIndex,
            });
          } else {
            // Append new slot
            newRegisteredSlots = [...prev.registeredSlots, iframeSlot];
            console.log('[WB_FORENSIC] SLOT_REGISTER_UPSERTED', {
              slotId: iframeSlot.id,
              action: 'APPENDED',
            });
          }
          
          console.log('[WORKBENCH] REGISTERED_SLOTS_STATE', {
            count: newRegisteredSlots.length,
            slotIds: newRegisteredSlots.map(s => s.id),
          });
          console.log('[SLOT] REGISTRY_STATE', {
            slotId: event.data.slot?.id,
            previousCount: prev.registeredSlots.length,
            newCount: newRegisteredSlots.length,
            allSlots: newRegisteredSlots.map(s => ({ id: s.id, route: s.route })),
          });
          return {
            ...prev,
            registeredSlots: newRegisteredSlots,
          };
        });
      } else if (messageType === 'SLOT_CLICK') {
        console.log('[WB_FORENSIC] SLOT_CLICK_RECEIVED', {
          type: messageType,
          origin: event.origin,
          slotId: event.data.slot?.id,
          route: event.data.slot?.route,
          page: event.data.slot?.page,
          section: event.data.slot?.section,
          slotName: event.data.slot?.slotName,
          currentMediaId: event.data.slot?.currentMediaId,
          component: event.data.slot?.component,
          timestamp: Date.now(),
        });
        // Use payload directly instead of slotRegistry.get (separate JS contexts)
        const slot: RegisteredSlot = {
          id: event.data.slot.id,
          route: event.data.slot.route,
          page: event.data.slot.page,
          section: event.data.slot.section,
          slotName: event.data.slot.slotName,
          currentMediaId: event.data.slot.currentMediaId,
          element: null,
          component: event.data.slot.component,
        };
        console.log('[FORENSIC] parent selected slot', {
          id: slot.id,
          page: slot.page,
          section: slot.section,
          slotName: slot.slotName,
          currentMediaId: slot.currentMediaId,
        });
        handleSlotClick(slot);
      } else if (messageType === 'SLOT_DROP') {
        const requestId = `drop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        console.log('[WB_FORENSIC] SLOT_DROP_RECEIVED', {
          requestId,
          messageType,
          origin: event.origin,
          slotId: event.data.slot?.id,
          assetId: event.data.assetId,
          applicationData: event.data.applicationData,
          applicationDataKeys: event.data.applicationData ? Object.keys(event.data.applicationData) : [],
          registeredSlotsCount: state.registeredSlots.length,
          registeredSlots: state.registeredSlots.map(s => ({ id: s.id, route: s.route })),
          timestamp: Date.now(),
        });

        const slotId = event.data.slot?.id;
        const assetId = event.data.assetId;
        const applicationData = event.data.applicationData;

        console.log('[DND] SLOT_DROP_MESSAGE_RECEIVED', {
          requestId,
          slotId,
          assetId,
          applicationData,
          registeredSlotsCount: registeredSlotsRef.current.length,
          registeredSlots: registeredSlotsRef.current.map(s => ({ id: s.id, route: s.route })),
        });

        console.log('[WB_FORENSIC] DROP_SLOT_LOOKUP', {
          requestId,
          requestedSlotId: slotId,
          registeredSlotIds: registeredSlotsRef.current.map(s => s.id),
          matchedSlot: registeredSlotsRef.current.find(s => s.id === slotId),
          lookupSuccess: !!registeredSlotsRef.current.find(s => s.id === slotId),
          timestamp: Date.now(),
        });

        // Use payload directly instead of slotRegistry.get (separate JS contexts)
        const slot: RegisteredSlot = {
          id: event.data.slot.id,
          route: event.data.slot.route,
          page: event.data.slot.page,
          section: event.data.slot.section,
          slotName: event.data.slot.slotName,
          currentMediaId: event.data.slot.currentMediaId,
          element: null,
          component: event.data.slot.component,
        };

        console.log('[DND] TARGET_SLOT_RESOLVED', {
          requestId,
          slotId: slot.id,
          slotName: slot.slotName,
          route: slot.route,
          currentMediaId: slot.currentMediaId,
          slotResolved: !!slot,
          slotFromPayload: !!event.data.slot,
          slotIdMatch: event.data.slot?.id === slot.id,
        });

        // Handle Drive file (direct drag from Drive)
        // CONSTITUTIONAL FIX: Invoke materialization instead of creating assignable DriveReference
        if (applicationData?.source === 'google-drive' && applicationData?.fileId) {
          console.log('[WB_FORENSIC] DRIVE_MATERIALIZATION_PATH', {
            requestId,
            fileId: applicationData.fileId,
            sharedDriveId: applicationData.sharedDriveId,
            slotId,
            timestamp: Date.now(),
          });
          
          console.log('[DND] DRIVE_FILE_DETECTED', {
            requestId,
            fileId: applicationData.fileId,
            sharedDriveId: applicationData.sharedDriveId,
            slotId,
          });
          
          console.log('[DND] DRIVE_FILE_VALIDATED', {
            requestId,
            hasFileId: !!applicationData.fileId,
            hasSharedDriveId: !!applicationData.sharedDriveId,
            hasSlotId: !!slotId,
            hasMimeType: !!applicationData.mimeType,
          });

          // CRITICAL: Fail closed if Drive did not provide MIME type
          // Do NOT proceed with materialization without knowing file type
          if (!applicationData.mimeType) {
            console.error('[DND] DRIVE_FILE_REJECTED', {
              requestId,
              fileId: applicationData.fileId,
              reason: 'MISSING_MIME_TYPE',
            });
            alert('Cannot use this file: Drive did not provide MIME type information');
            return;
          }
          
          // Check if Drive file already exists as PublishedMediaAsset
          // CRITICAL FIX: Use the same provenance fields that ingestion writes
          // Ingestion writes: provenance.driveFileId and provenance.sharedDriveId
          // Workbench must match on the same fields
          const existingAsset = assetsRef.current.find(a => {
            const assetDriveFileId = a.provenance?.driveFileId;
            const assetSharedDriveId = a.provenance?.sharedDriveId;
            const fileId = applicationData.fileId;
            const sharedDriveId = applicationData.sharedDriveId;

            // Match both fileId and sharedDriveId for shared files
            if (sharedDriveId) {
              return assetDriveFileId === fileId && assetSharedDriveId === sharedDriveId;
            }
            // Match fileId only for non-shared files
            return assetDriveFileId === fileId && !assetSharedDriveId;
          });

          if (existingAsset) {
            console.log('[DND] DRIVE_ALREADY_MATERIALIZED', { requestId, assetId: existingAsset.id });

            // P0 FIX: Verify existing asset is materially complete before using it
            // If it's incomplete (missing renditions, synthetic hash), re-materialize it
            const isComplete = await verifyMediaMaterializationComplete(existingAsset.id);
            if (!isComplete) {
              console.log('[DND] DRIVE_ASSET_INCOMPLETE - RE-MATERIALIZING', {
                requestId,
                assetId: existingAsset.id,
                reason: 'Existing asset fails materialization completeness check',
              });
              // Re-materialize instead of using incomplete asset
              materializeDriveFile(applicationData, slot, requestId);
              return;
            }

            // Use existing PublishedMediaAsset - route through replacement confirmation
            handleDriveDropToSlot(slot, existingAsset, slot.currentMediaId, requestId);
          } else {
            console.log('[DND] DRIVE_MATERIALIZATION_REQUIRED', {
              requestId,
              fileId: applicationData.fileId,
              sharedDriveId: applicationData.sharedDriveId,
            });
            // Invoke materialization via ingest API, then route through replacement confirmation
            materializeDriveFile(applicationData, slot, requestId);
          }
          return;
        }

        // Use assetId from the message (for regular assets)
        if (assetId) {
          console.log('[DND] ASSET_LOOKUP', {
            requestId,
            requestedAssetId: assetId,
            registryCount: assetsRef.current.length,
          });

          const asset = assetsRef.current.find(a => a.id === assetId);
          if (!asset) {
            console.error('[DND] ASSET_NOT_FOUND', {
              requestId,
              requestedAssetId: assetId,
              registryCount: assetsRef.current.length,
              sampleIds: assetsRef.current.slice(0, 30).map(a => ({
                id: a.id,
                filename: a.filename,
                source: a.source,
                driveFileId: a.drive?.fileId,
              })),
            });

            alert(`Asset not found: ${assetId.substring(0, 50)}...`);
            return;
          }

          const canonicalAssetId = asset.id;
          console.log('[DND] ASSET_RESOLVED', {
            requestId,
            requestedAssetId: assetId,
            canonicalAssetId,
            filename: asset.filename,
            source: asset.source,
          });

          handleDriveDropToSlot(slot, asset, slot.currentMediaId, requestId);
        } else {
          console.error('[DND] NO_ASSET_ID', { requestId });
        }
      } else if (messageType === 'REFRESH_SLOTS') {
        console.log('[WB_FORENSIC] REFRESH_SLOTS_RECEIVED');
        loadCanonicalData();
      }
    };

    window.addEventListener('slot-click', handleSlotClickEvent);
    window.addEventListener('delete-gallery', handleDeleteGalleryEvent);
    window.addEventListener('add-to-gallery', handleAddToGalleryEvent);
    window.addEventListener('message', handleMessage);

    return () => {
      unsubscribe();
      window.removeEventListener('slot-click', handleSlotClickEvent);
      window.removeEventListener('delete-gallery', handleDeleteGalleryEvent);
      window.removeEventListener('add-to-gallery', handleAddToGalleryEvent);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  // Filter assets based on search and filter state
  const filteredAssets = (state.assets || []).filter(asset => {
    // Search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      const matchesSearch = 
        asset.filename.toLowerCase().includes(query) ||
        asset.id.toLowerCase().includes(query) ||
        (asset.alt && asset.alt.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Category filter
    switch (state.filter) {
      case 'used':
        return (state.registeredSlots || []).some(s => s.currentMediaId === asset.id);
      case 'unused':
        return !(state.registeredSlots || []).some(s => s.currentMediaId === asset.id);
      case 'drive':
        return asset.classification === 'DRIVE_ONLY';
      case 'published':
        return asset.classification === 'PUBLISHED';
      case 'legacy':
        return asset.classification !== 'PUBLISHED' && asset.classification !== 'DRIVE_ONLY';
      default:
        return true;
    }
  });

  if (state.loading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="text-center">
          <Layers className="mx-auto h-12 w-12 animate-spin text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Loading workbench...</p>
        </div>
      </div>
    );
  }

  // KV Authority Unavailable - Show blocking error
  if (!state.kvAvailable) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-4">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">AUTHORITY UNAVAILABLE</h2>
          <p className="text-muted-foreground mb-4">
            KV media authority is not accessible. The Workbench cannot perform authoritative mutations without live KV connectivity.
          </p>
          <div className="bg-destructive/10 border border-destructive rounded-lg p-4 text-left">
            <p className="text-sm text-destructive font-mono">
              Error: {state.kvError || 'Unknown KV error'}
            </p>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Static data is displayed as read-only evidence. Please resolve KV connectivity to enable authoritative media operations.
          </p>
        </div>
      </div>
    );
  }

  const currentSlots = (state.registeredSlots || []).filter(s => s.route === state.selectedPage);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Minimal Toolbar */}
      <div className="shrink-0 border-b border-border bg-card px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Layers size={18} />
              Media Workbench
            </h1>
            <span className="text-xs text-muted-foreground">
              Map website visuals to media
            </span>
          </div>
          <div className="flex items-center gap-2">
            {state.pendingAssignments.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {state.pendingAssignments.size} pending change{state.pendingAssignments.size > 1 ? 's' : ''}
                </span>
                <button
                  onClick={cancelAssignment}
                  className="px-2 py-1 bg-surface text-foreground rounded hover:bg-surface/80 transition-colors text-xs"
                >
                  Clear All
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement deploy all
                    alert('Deploy all pending changes - not yet implemented');
                  }}
                  className="px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-xs"
                >
                  Confirm All
                </button>
              </div>
            )}
            <button
              onClick={loadCanonicalData}
              className="p-1.5 bg-surface text-foreground rounded hover:bg-surface/80 transition-colors"
              title="Refresh media"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={openAddSlotDialog}
              className="px-2 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-xs"
            >
              <Plus size={14} className="inline mr-1" />
              Add Slot
            </button>
          </div>
        </div>
      </div>

      {/* Add Slot Dialog */}
      {state.showAddSlotDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Add Visual Slot</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Slot ID</label>
                <input
                  type="text"
                  value={state.newSlotId}
                  onChange={(e) => setState(prev => ({ ...prev, newSlotId: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
                  placeholder="e.g., custom-hero-banner"
                />
                <p className="text-xs text-muted-foreground mt-1">Unique identifier for this slot</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slot Name</label>
                <input
                  type="text"
                  value={state.newSlotName}
                  onChange={(e) => setState(prev => ({ ...prev, newSlotName: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
                  placeholder="e.g., Hero Banner"
                />
                <p className="text-xs text-muted-foreground mt-1">Human-readable name for this slot</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Section</label>
                <select
                  value={state.newSlotSection}
                  onChange={(e) => setState(prev => ({ ...prev, newSlotSection: e.target.value }))}
                  className="w-full px-3 py-2 border border-border rounded bg-background text-foreground text-sm"
                >
                  <option value="Hero">Hero</option>
                  <option value="Gallery">Gallery</option>
                  <option value="Services">Services</option>
                  <option value="About">About</option>
                  <option value="Testimonials">Testimonials</option>
                  <option value="Featured">Featured</option>
                  <option value="Other">Other</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">Section this slot belongs to</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-surface p-3 rounded">
                <Info size={14} className="inline mr-1" />
                <span>Route: {state.selectedPage} ({PAGE_LABELS[state.selectedPage]})</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={closeAddSlotDialog}
                className="px-4 py-2 bg-surface text-foreground rounded hover:bg-surface/80 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={addNewSlot}
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm"
              >
                Add Slot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Context Menu */}
      {state.selectedSlotForContext && (
        <div
          className="fixed z-50 bg-background border border-border rounded-lg shadow-lg py-1 min-w-40"
          style={{ left: state.selectedSlotForContext.x, top: state.selectedSlotForContext.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              setState(prev => ({ 
                ...prev, 
                newSlotId: `custom-slot-${Date.now()}`, 
                newSlotName: '', 
                newSlotSection: 'Hero',
                selectedSlotForContext: null
              }));
              setState(prev => ({ ...prev, showAddSlotDialog: true }));
            }}
            className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-accent transition-colors"
          >
            Add Visual Slot
          </button>
          <button
            onClick={() => {
              if (!state.selectedSlotForContext) return;
              const slotId = state.selectedSlotForContext.slot.id;
              if (!confirm(`Delete visual slot "${slotId}"?\n\nThis will remove the slot from the visual structure. The underlying media asset will NOT be deleted.\n\nDo you want to proceed?`)) {
                return;
              }

              slotRegistry.removeSlot(slotId, state.selectedPage);
              
              console.log('[WORKBENCH] SLOT_DELETED', {
                slotId,
                route: state.selectedPage,
              });

              alert(`Visual slot "${slotId}" removed successfully.\n\nNote: The underlying media asset was not deleted.`);
              setState(prev => ({ ...prev, selectedSlotForContext: null }));
              loadCanonicalData();
            }}
            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            Delete Visual Slot
          </button>
        </div>
      )}

      {/* Page Navigation - Compact */}
      <div className="shrink-0 border-b border-border bg-surface px-4 py-1">
        <div className="flex gap-1">
          {(Object.keys(PAGE_LABELS) as PageRoute[]).map((route) => (
              <button
                key={route}
                onClick={() => setState(prev => ({ ...prev, selectedPage: route }))}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  state.selectedPage === route
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-surface'
                }`}
              >
                {PAGE_LABELS[route]}
              </button>
            ))}
          </div>
        </div>

      {/* Pending Assignments Bar */}
      {state.pendingAssignments.size > 0 && (
        <div className="shrink-0 border-b border-border bg-card px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-foreground">
              Pending Changes ({state.pendingAssignments.size})
            </span>
            <button
              onClick={cancelAssignment}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(state.pendingAssignments.values()).map((assignment) => (
              <div
                key={assignment.slot.id}
                className="flex items-center gap-2 px-2 py-1 bg-surface rounded text-xs"
              >
                <span className="text-muted-foreground">{assignment.slot.slotName}</span>
                <span className="text-primary">→</span>
                <span className="text-foreground">{assignment.asset.filename}</span>
                <button
                  onClick={() => removePendingAssignment(assignment.slot.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content - Two Panel Layout */}
      <div className="flex-1 grid grid-cols-2 min-h-0">
          {/* LEFT: Website Preview with Slot Grid Overlay */}
          <section className="min-h-0 min-w-0 overflow-y-auto bg-white h-full relative">
            {/* Slot Grid Overlay */}
            <div className="absolute inset-0 bg-black/5 p-4 overflow-y-auto pointer-events-none z-10">
              <div className="pointer-events-auto">
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <LayoutGrid size={14} />
                  Visual Slots for {PAGE_LABELS[state.selectedPage]}
                </h3>
                {(() => {
                  const currentPage = getPageByRoute(state.selectedPage);
                  if (!currentPage) return <p className="text-xs text-muted-foreground">No structure defined for this route</p>;
                  
                  return currentPage.sections.map(section => (
                    <div key={section.id} className="mb-4">
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                        {section.name}
                      </h4>
                      {section.visualSlots.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic mb-2">No slots in this section</p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {section.visualSlots.map(slot => (
                            <div
                              key={slot.id}
                              className="relative p-2 bg-background border border-border rounded hover:border-primary cursor-pointer transition-colors"
                              onContextMenu={(e) => handleSlotRightClick(e, slot)}
                              onClick={() => {
                                const registeredSlot = state.registeredSlots.find(s => s.id === slot.id);
                                if (registeredSlot) {
                                  handleSlotClick(registeredSlot);
                                }
                              }}
                              onDragOver={(e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'copy';
                              }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                const assetId = e.dataTransfer.getData('text/plain');
                                if (!assetId) return;

                                const asset = state.assets.find(a => a.id === assetId);
                                if (!asset) return;

                                const registeredSlot = state.registeredSlots.find(s => s.id === slot.id);
                                if (!registeredSlot) return;

                                handleAssetClick(asset);
                                const requestId = crypto.randomUUID();
                                handleDriveDropToSlot(registeredSlot, asset, registeredSlot.currentMediaId, requestId);
                              }}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-medium text-foreground truncate">{slot.name}</span>
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                  slot.status === 'OCCUPIED' ? 'bg-green-100 text-green-800' :
                                  slot.status === 'EMPTY' ? 'bg-gray-100 text-gray-800' :
                                  slot.status === 'BROKEN' ? 'bg-red-100 text-red-800' :
                                  slot.status === 'DYNAMIC' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {slot.status}
                                </span>
                              </div>
                              <div className="text-xs text-muted-foreground truncate">
                                {slot.currentMediaFilename || 'No media assigned'}
                              </div>
                              {slot.currentMediaId && (
                                <div className="text-xs text-primary truncate mt-1">
                                  {slot.currentMediaId}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ));
                })()}
              </div>
            </div>
            
            {/* Website Preview Iframe */}
            <iframe
              ref={iframeRef}
              src={`${window.location.origin}${state.selectedPage}?workbench=true`}
              className="w-full h-full border-0"
              title="Website Preview"
              sandbox="allow-same-origin allow-scripts allow-popups"
              onLoad={() => console.log('[SLOT] IFRAME_LOADED', {
                iframeSrc: `${window.location.origin}${state.selectedPage}?workbench=true`,
                contentWindowExists: !!iframeRef.current?.contentWindow,
              })}
            />
          </section>

          {/* RIGHT: Media Asset Management */}
        <section 
        ref={mediaPanelRef}
        className="min-h-0 min-w-0 overflow-y-auto bg-background h-full"
        >
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
              <input
                type="text"
                placeholder="Search photos..."
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-1 mb-4">
              {(['all', 'used', 'unused', 'drive', 'published', 'legacy'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setState(prev => ({ ...prev, filter }))}
                  className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                    state.filter === filter
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface hover:bg-surface/80'
                  }`}
                >
                  {filter}
                </button>
              ))}
              <button
                onClick={() => {
                  setState(prev => ({ ...prev, driveBrowsing: !prev.driveBrowsing }));
                  if (!state.driveBrowsing) {
                    loadDriveStructure();
                  }
                }}
                className={`px-2 py-1 rounded text-xs capitalize transition-colors ${
                  state.driveBrowsing
                    ? 'bg-blue-500 text-white'
                    : 'bg-surface hover:bg-surface/80'
                }`}
              >
                {state.driveBrowsing ? 'Close Drive' : 'Browse Drive'}
              </button>
            </div>

            {/* Drive Browser */}
            {state.driveBrowsing && (
              <div className="mb-4 p-4 bg-surface rounded-lg">
                {state.driveError && (
                  <div className="mb-4 p-3 bg-destructive/10 text-destructive text-sm rounded">
                    {state.driveError}
                  </div>
                )}
                
                {!state.driveStructure && !state.driveLoading && (
                  <button
                    onClick={loadDriveStructure}
                    className="w-full py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Database className="inline mr-2" size={16} />
                    Load Drive Structure
                  </button>
                )}

                {state.driveStructure && (
                  <div className="space-y-3">
                    {/* Drive selection */}
                    <div className="flex gap-2">
                      {state.driveStructure!.myDrive && (
                        <button
                          onClick={() => {
                            setState(prev => ({
                              ...prev,
                              driveCurrentFolderId: state.driveStructure!.myDrive.id || 'root',
                              driveCurrentDriveId: null,
                              driveBreadcrumb: [{ id: state.driveStructure!.myDrive.id || 'root', name: state.driveStructure!.myDrive.name || 'My Drive' }],
                              driveFiles: [],
                              driveNextPageToken: undefined,
                              driveSelectedFile: null,
                            }));
                            loadDriveFiles(state.driveStructure!.myDrive.id || 'root', undefined, null);
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg hover:border-primary transition-colors text-left"
                        >
                          <FolderOpen className="inline mr-2" size={16} />
                          {state.driveStructure!.myDrive.name}
                        </button>
                      )}
                      {state.driveStructure!.sharedDrives?.map((drive: any) => (
                        <button
                          key={drive.id}
                          onClick={() => {
                            setState(prev => ({
                              ...prev,
                              driveCurrentFolderId: drive.id,
                              driveCurrentDriveId: drive.id,
                              driveBreadcrumb: [{ id: drive.id, name: drive.name }],
                              driveFiles: [],
                              driveNextPageToken: undefined,
                              driveSelectedFile: null,
                            }));
                            loadDriveFiles(drive.id, undefined, drive.id);
                          }}
                          className="flex-1 px-3 py-2 bg-background border border-border rounded-lg hover:border-primary transition-colors text-left"
                        >
                          <FolderOpen className="inline mr-2" size={16} />
                          {drive.name}
                        </button>
                      ))}
                    </div>

                    {/* Breadcrumb */}
                    {state.driveBreadcrumb.length > 1 && (
                      <div className="flex items-center gap-1 text-sm">
                        {state.driveBreadcrumb.map((crumb, index) => (
                          <button
                            key={crumb.id}
                            onClick={() => navigateBreadcrumb(index)}
                            className="hover:text-primary transition-colors"
                          >
                            {crumb.name}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Files */}
                    {(state.driveFiles || []).filter((item: any) => item.type !== 'folder').length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2">Files</h3>
                        {state.driveViewMode === 'grid' ? (
                          <div className="grid grid-cols-3 gap-2">
                            {(state.driveFiles || []).filter((item: any) => item.type !== 'folder').map((file: any) => {
                              // Check if this Drive file has already been ingested
                              const existingAsset = state.assets.find(a => a.drive?.fileId === file.id);
                              const isIngested = !!existingAsset;

                              return (
                                <button
                                  key={file.id}
                                  draggable={true}
                                  data-asset-id={file.id}
                                  onDragStart={(e) => handleDragStart(e, existingAsset, file)}
                                  onClick={() => selectDriveFile(file)}
                                  className={`p-3 bg-background border rounded-lg transition-colors text-left ${
                                    state.driveSelectedFile?.id === file.id
                                      ? 'border-primary ring-2 ring-primary'
                                      : 'border-border hover:border-primary'
                                  } cursor-grab`}
                                >
                                  {file.thumbnailLink && file.mimeType?.startsWith('image/') ? (
                                    <img
                                      src={`/api/drive/files/${file.id}/thumbnail${state.driveCurrentDriveId ? `?driveId=${state.driveCurrentDriveId}` : ''}`}
                                      alt={file.name}
                                      className="w-full aspect-square object-cover rounded mb-2"
                                      draggable={false}
                                    />
                                  ) : (
                                    <div className="w-full aspect-square bg-muted rounded mb-2 flex items-center justify-center">
                                      <FileImage size={24} className="text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="text-sm font-medium text-foreground truncate">{file.name}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown date'}
                                  </div>
                                  {isIngested && (
                                    <div className="text-xs text-green-600 font-medium mt-1">✓ Ingested</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {(state.driveFiles || []).filter((item: any) => item.type !== 'folder').map((file: any) => {
                              // Check if this Drive file has already been ingested
                              const existingAsset = state.assets.find(a => a.drive?.fileId === file.id);
                              const isIngested = !!existingAsset;

                              return (
                                <button
                                  key={file.id}
                                  draggable={true}
                                  data-asset-id={file.id}
                                  onDragStart={(e) => handleDragStart(e, existingAsset, file)}
                                  onClick={() => selectDriveFile(file)}
                                  className={`w-full p-3 bg-background border rounded-lg transition-colors text-left flex items-center gap-3 ${
                                    state.driveSelectedFile?.id === file.id
                                      ? 'border-primary ring-2 ring-primary'
                                      : 'border-border hover:border-primary'
                                  } cursor-grab`}
                                >
                                  {file.thumbnailLink && file.mimeType?.startsWith('image/') ? (
                                    <img
                                      src={`/api/drive/files/${file.id}/thumbnail${state.driveCurrentDriveId ? `?driveId=${state.driveCurrentDriveId}` : ''}`}
                                      alt={file.name}
                                      className="w-12 h-12 object-cover rounded"
                                      draggable={false}
                                    />
                                  ) : (
                                    <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                                      <FileImage size={18} className="text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-foreground">{file.name}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : 'Unknown date'}
                                    </div>
                                  </div>
                                  {isIngested && (
                                    <div className="text-xs text-green-600 font-medium">✓</div>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {state.driveNextPageToken && (
                          <button
                            onClick={loadMoreDriveFiles}
                            disabled={state.driveLoadingMore}
                            className="w-full mt-2 py-2 bg-surface text-foreground rounded hover:bg-surface/80 transition-colors text-sm disabled:opacity-50"
                          >
                            {state.driveLoadingMore ? 'Loading...' : 'Load More'}
                          </button>
                        )}
                      </div>
                    )}

                    {(state.driveFiles || []).filter((item: any) => item.type !== 'folder').length === 0 && !state.driveLoading && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No files in this folder
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Media Grid */}
            <div className="grid grid-cols-3 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = state.selectedAsset?.id === asset.id;
                const isUsed = state.registeredSlots.some(s => s.currentMediaId === asset.id);
                const isDriveOnly = asset.classification === 'DRIVE_ONLY';
                const isPublished = asset.classification === 'PUBLISHED';
                const isLegacy = asset.classification !== 'PUBLISHED' && asset.classification !== 'DRIVE_ONLY';

                return (
                  <div
                    key={asset.id}
                    draggable
                    data-asset-id={asset.id}
                    onDragStart={(e) => handleDragStart(e, asset)}
                    onClick={() => handleAssetClick(asset)}
                    className={`relative aspect-[4/3] rounded-lg overflow-hidden cursor-pointer transition-all ${
                      isSelected
                        ? 'ring-2 ring-primary ring-offset-2'
                        : 'hover:ring-2 hover:ring-primary/50 hover:ring-offset-2'
                    }`}
                  >
                    {asset.variants?.thumbnail ? (
                      <img
                        src={asset.variants.thumbnail}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : asset.variants?.web ? (
                      <img
                        src={asset.variants.web}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : asset.variants?.webp || asset.variants?.original ? (
                      <img
                        src={asset.variants.webp || asset.variants.original}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <FileImage size={24} className="text-muted-foreground" />
                      </div>
                    )}
                    
                    {/* Status badges */}
                    <div className="absolute top-1 right-1 flex gap-1">
                      {isUsed && (
                        <span className="px-1.5 py-0.5 bg-green-500 text-white text-xs rounded-full">
                          Used
                        </span>
                      )}
                      {isDriveOnly && (
                        <span className="px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                          Drive
                        </span>
                      )}
                      {isPublished && (
                        <span className="px-1.5 py-0.5 bg-purple-500 text-white text-xs rounded-full">
                          Published
                        </span>
                      )}
                      {isLegacy && (
                        <span className="px-1.5 py-0.5 bg-gray-500 text-white text-xs rounded-full">
                          Legacy
                        </span>
                      )}
                    </div>

                    {/* Filename overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white truncate">{asset.filename}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-8">
                <FileImage size={48} className="mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">No media assets found</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}