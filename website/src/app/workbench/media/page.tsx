/**
 * Media Workbench - Semantic Website Workbench
 *
 * Purpose: Map actual website visuals to canonical media assets
 * - LEFT: Live website preview (iframe for server components)
 * - RIGHT: Media asset management
 * - Mapping: Website element → semantic slot → canonical media ID → physical/Drive evidence
 *
 * Architecture (iframe for preview, simple slot registry):
 * - Renders actual website pages in iframe (necessary for server components)
 * - VisualSlot components register themselves to slotRegistry via postMessage
 * - Workbench receives slot identity (no coordinates, no overlays)
 * - Interaction: click slot → select media, click media → show slot usage
 * - Single source of truth: website components declare their own slots
 *
 * Organization follows website navigation:
 * Home → Services → Our Work → About → Reviews → Estimate
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, Layers, Database, FolderOpen, Folder, FileImage, ChevronRight, Loader2, List } from 'lucide-react';
import { loadVisualAssetRegistry, addDriveAssetToRegistry, type VisualAsset } from '@/lib/visual-asset-registry';
import { getMediaById } from '@/lib/media';
import { slotRegistry, type RegisteredSlot } from '@/lib/slot-registry';
import type { DriveFolder, DriveFile } from '@/lib/drive/drive-discovery';

type PageRoute = '/' | '/services' | '/our-work' | '/about' | '/reviews' | '/estimate';

interface MediaWorkbenchState {
  loading: boolean;
  assets: VisualAsset[];
  selectedPage: PageRoute;
  selectedSlot: RegisteredSlot | null;
  selectedAsset: VisualAsset | null;
  searchQuery: string;
  filter: 'all' | 'used' | 'unused' | 'drive';
  registeredSlots: RegisteredSlot[];
  pendingAssignments: Map<string, { slot: RegisteredSlot; asset: VisualAsset }>;
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
}

const PAGE_LABELS: Record<PageRoute, string> = {
  '/': 'Home',
  '/services': 'Services',
  '/our-work': 'Our Work',
  '/about': 'About',
  '/reviews': 'Reviews',
  '/estimate': 'Estimate',
};

export default function MediaWorkbench() {
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
  });

  const mediaPanelRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const assetsRef = useRef<VisualAsset[]>([]);

  // Keep assetsRef in sync with state.assets (avoids stale closure in message listener)
  useEffect(() => {
    assetsRef.current = state.assets;
  }, [state.assets]);

  useEffect(() => {
    loadCanonicalData();

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
    const handleSlotClickEvent = (event: CustomEvent) => {
      const { id } = event.detail;
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

    window.addEventListener('slot-click', handleSlotClickEvent as EventListener);

    // Listen for iframe messages (SLOT_REGISTER and SLOT_CLICK)
    const handleMessage = async (event: MessageEvent) => {
      // Filter: Only process Workbench protocol messages
      if (!event.data || typeof event.data.type !== 'string') {
        return;
      }

      const messageType = event.data.type;

      if (messageType === 'SLOT_REGISTER') {
        console.log('[FORENSIC] WORKBENCH MESSAGE RECEIVED', {
          type: messageType,
          origin: event.origin,
          slotId: event.data.slot?.id,
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
      } else if (messageType === 'SLOT_CLICK') {
        console.log('[FORENSIC] WORKBENCH MESSAGE RECEIVED', {
          type: messageType,
          origin: event.origin,
          slotId: event.data.slot?.id,
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
        const slotId = event.data.slot?.id;
        const assetId = event.data.assetId;
        const applicationData = event.data.applicationData;

        console.log('[DND] SLOT_DROP_MESSAGE_RECEIVED', {
          slotId,
          assetId,
          applicationData,
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

        // Handle Drive reference (direct drag from Drive without ingestion)
        if (applicationData?.source === 'google-drive' && applicationData?.fileId) {
          console.log('[DND] DRIVE_REFERENCE_DETECTED', {
            fileId: applicationData.fileId,
            sharedDriveId: applicationData.sharedDriveId,
            slotId,
          });
          
          // Check if Drive file already exists in local assets
          const existingAsset = assetsRef.current.find(a => 
            a.drive?.fileId === applicationData.fileId && 
            a.drive?.driveId === applicationData.sharedDriveId
          );
          
          if (existingAsset) {
            console.log('[DND] DRIVE_REFERENCE_EXISTS', { assetId: existingAsset.id });
            // Use existing asset - route through existing replacement confirmation
            handleDriveDropToSlot(slot, existingAsset, slot.currentMediaId);
          } else {
            console.log('[DND] DRIVE_REFERENCE_CREATE', {
              fileId: applicationData.fileId,
              sharedDriveId: applicationData.sharedDriveId,
            });
            // Create Drive reference via API, then route through replacement confirmation
            createDriveReference(applicationData, slot);
          }
          return;
        }

        // Use assetId from the message (for regular assets)
        if (assetId) {
          console.log('[DND] ASSET_LOOKUP', {
            requestedAssetId: assetId,
            registryCount: assetsRef.current.length,
          });
          
          // Resolve to canonical ID (handles legacy URL-based assetIds)
          const canonicalAssetId = resolveAssetId(assetId, assetsRef.current);
          
          console.log('[DND] ASSET_ID_RESOLUTION', {
            rawAssetId: assetId,
            canonicalAssetId,
            resolutionMethod: canonicalAssetId === assetId ? 'direct' : 'variant-fallback',
          });
          
          if (!canonicalAssetId) {
            console.log('[DND_ERROR] ASSET_LOOKUP_FAILED', {
              stage: 'ASSET_LOOKUP',
              slotId,
              requestedAssetId: assetId,
              registryCount: assetsRef.current.length,
            });
            
            // Log sample registry IDs for debugging
            console.log('[DND] REGISTRY_IDS', {
              ids: assetsRef.current.slice(0, 30).map(a => ({
                id: a.id,
                filename: a.filename,
                source: a.source,
                driveFileId: a.drive?.fileId,
              })),
            });
            
            alert(`Asset not found: ${assetId.substring(0, 50)}...`);
            return;
          }
          
          const asset = assetsRef.current.find(a => a.id === canonicalAssetId);
          
          console.log('[DND] ASSET_LOOKUP_SUCCESS', {
            canonicalAssetId,
            found: !!asset,
            filename: asset?.filename,
            source: asset?.source,
          });
          
          if (asset) {
            // Gallery duplicate prevention: check if mediaId is already in another gallery slot
            if (slotId.startsWith('our-work-gallery-') || slotId.startsWith('project-gallery-')) {
              const existingGallerySlot = state.registeredSlots.find(s => 
                s.section === 'Gallery' && 
                s.currentMediaId === canonicalAssetId && 
                s.id !== slotId
              );
              if (existingGallerySlot) {
                alert(`This media is already assigned to ${existingGallerySlot.slotName}. Each gallery image can only be used once.`);
                return;
              }
            }

            console.log('[DND] STAGE_ASSIGNMENT', {
              slotId,
              canonicalAssetId,
              currentMediaId: slot.currentMediaId,
            });
            
            // GALLERY DUPLICATE PREVENTION: Check if this mediaId is already assigned to another gallery slot
            if (slot.section === 'Gallery') {
              const existingGalleryAssignment = Array.from(state.pendingAssignments.values()).find(
                p => p.slot.section === 'Gallery' && p.asset.id === canonicalAssetId && p.slot.id !== slot.id
              );
              if (existingGalleryAssignment) {
                alert(`This media is already assigned to ${existingGalleryAssignment.slot.slotName}. A media asset can only appear in one gallery slot.`);
                return;
              }
            }
            
            // STAGE the assignment (upsert by slot ID - latest wins for same slot)
            handleSlotAssignment(slot.id, canonicalAssetId);
          } else {
            console.log('[DND 7] SLOT_ASSIGNMENT_ATTEMPT - ASSET NOT FOUND', {
              slotId,
              assetId,
            });
          }
        } else {
          console.log('[FORENSIC] parent NO ASSET_ID in drop message', { slotId });
        }
      } else if (event.data.type === 'delete-gallery') {
        // Handle delete request from Our Work page
        const { slotId } = event.data;
        console.log('[DELETE GALLERY] MESSAGE_RECEIVED', { slotId });
        
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

          // Parse slot ID to get project ID and gallery index
          // Format: our-work-gallery-{projectId}-{index}
          const idPart = slotId.replace('our-work-gallery-', '');
          const lastHyphenIndex = idPart.lastIndexOf('-');
          const projectId = idPart.substring(0, lastHyphenIndex);
          const galleryIndex = parseInt(idPart.substring(lastHyphenIndex + 1), 10);

          console.log('[DELETE GALLERY] PARSED_SLOT', { slotId, projectId, galleryIndex });

          const response = await fetch('/api/admin/projects/gallery', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, galleryIndex }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete gallery assignment');
          }

          // Reload canonical data after successful deletion
          loadCanonicalData();
        } catch (error) {
          console.error('[DELETE GALLERY] ERROR', error);
          alert(`Failed to delete gallery assignment: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      unsubscribe();
      window.removeEventListener('slot-click', handleSlotClickEvent as EventListener);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const loadCanonicalData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const registry = await loadVisualAssetRegistry();
      setState(prev => ({ ...prev, assets: registry, registeredSlots: slotRegistry.getAll() }));
    } catch (err) {
      console.error('Failed to load canonical data:', err);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
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
      setState(prev => ({ ...prev, driveStructure: structure }));
    } catch (error) {
      console.error('Failed to load Drive structure:', error);
      setState(prev => ({ ...prev, driveError: error instanceof Error ? error.message : 'Unknown error' }));
    } finally {
      setState(prev => ({ ...prev, driveLoading: false }));
    }
  };

  const loadDriveFiles = async (folderId: string = 'root', pageToken?: string, driveId?: string | null) => {
    try {
      setState(prev => ({ ...prev, driveLoading: true, driveError: null }));
      const params = new URLSearchParams({ folderId });
      if (pageToken) params.set('pageToken', pageToken);
      if (driveId) params.set('driveId', driveId);

      const response = await fetch(`/api/drive/files?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load Drive files');
      }
      const result = await response.json();

      setState(prev => ({
        ...prev,
        driveFiles: pageToken ? [...prev.driveFiles, ...result.items] : result.items,
        driveNextPageToken: result.nextPageToken,
        driveLoading: false,
        driveLoadingMore: false,
      }));
    } catch (error) {
      console.error('Failed to load Drive files:', error);
      setState(prev => ({ ...prev, driveError: error instanceof Error ? error.message : 'Unknown error', driveLoading: false, driveLoadingMore: false }));
    }
  };

  const navigateToFolder = async (folder: DriveFolder) => {
    setState(prev => ({
      ...prev,
      driveCurrentFolderId: folder.id,
      driveBreadcrumb: [...prev.driveBreadcrumb, { id: folder.id, name: folder.name }],
      driveFiles: [],
      driveNextPageToken: undefined,
      driveSelectedFile: null,
      driveLoading: true,
    }));
    await loadDriveFiles(folder.id, undefined, state.driveCurrentDriveId);
  };

  const navigateUp = (index: number) => {
    const newBreadcrumb = state.driveBreadcrumb.slice(0, index + 1);
    const target = newBreadcrumb[newBreadcrumb.length - 1];
    
    setState(prev => ({
      ...prev,
      driveCurrentFolderId: target.id,
      driveBreadcrumb: newBreadcrumb,
      driveFiles: [],
      driveNextPageToken: undefined,
      driveSelectedFile: null,
      driveLoading: true,
    }));
    
    // Preserve the current driveId throughout breadcrumb navigation
    loadDriveFiles(target.id, undefined, state.driveCurrentDriveId);
  };

  const loadMoreDriveFiles = () => {
    if (state.driveNextPageToken && !state.driveLoadingMore) {
      setState(prev => ({ ...prev, driveLoadingMore: true }));
      loadDriveFiles(state.driveCurrentFolderId, state.driveNextPageToken, state.driveCurrentDriveId);
    }
  };

  const selectDriveFile = async (file: DriveFile) => {
    setState(prev => ({ ...prev, driveSelectedFile: file }));
    
    // AUTOMATIC INGESTION: Immediately ingest when file is selected
    await useDriveFile(file);
  };

  const useDriveFile = async (file: DriveFile) => {
    try {
      console.log('[WORKBENCH] Starting Drive file ingestion', {
        fileId: file.id,
        driveId: state.driveCurrentDriveId,
        filename: file.name,
        mimeType: file.mimeType,
        size: file.size,
        environment: process.env.NODE_ENV,
      });

      const requestBody = { 
        driveId: file.id,
        driveIdParameter: state.driveCurrentDriveId, // Pass Shared Drive ID if present
      };
      
      const endpoint = '/api/drive/ingest';
      console.log('[WORKBENCH] API request', {
        endpoint,
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      console.log('[WORKBENCH] API response', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        contentType: response.headers.get('content-type'),
      });
      
      // Get response text first for debugging
      const responseText = await response.text();
      console.log('[WORKBENCH] Response body (first 500 chars)', {
        preview: responseText.substring(0, 500),
        length: responseText.length,
        isHTML: responseText.startsWith('<!DOCTYPE') || responseText.startsWith('<html'),
      });
      
      // Parse JSON only if it looks like JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[WORKBENCH] JSON parse failed', {
          error: parseError,
          responseText: responseText.substring(0, 1000),
        });
        
        // Return structured error with actual response info
        alert(`API Error (Status ${response.status}):
Expected JSON but received ${responseText.startsWith('<!DOCTYPE') ? 'HTML' : 'non-JSON'} response

URL: ${endpoint}
Status: ${response.status} ${response.statusText}
Content-Type: ${response.headers.get('content-type') || 'unknown'}

First 200 chars of response:
${responseText.substring(0, 200)}`);
        return;
      }
      
      console.log('[WORKBENCH] Ingestion response parsed', {
        success: data.success,
        action: data.action,
        error: data.error,
        stage: data.stage,
        message: data.message,
        mediaId: data.media?.id,
        requestId: data.requestId,
      });
      
      if (response.ok) {
        console.log('[WORKBENCH] Ingestion succeeded', {
          action: data.action,
          mediaId: data.media?.id,
        });
        
        // Add the newly ingested asset to the registry
        if (data.action === 'created' && data.media) {
          const driveAsset = await addDriveAssetToRegistry(data.media);
          
          console.log('[DND] CANONICAL_ASSET', {
            id: driveAsset.id,
            source: driveAsset.source,
            filename: driveAsset.filename,
            driveFileId: driveAsset.drive?.fileId,
            sharedDriveId: driveAsset.drive?.driveId,
            thumbnail: driveAsset.variants?.thumbnail,
          });
          
          setState(prev => ({ 
            ...prev, 
            assets: [...prev.assets, driveAsset],
            driveBrowsing: false, 
            driveSelectedFile: null 
          }));
          alert(`Drive asset created: ${data.media.id}`);
        } else if (data.action === 'existing') {
          alert(`Drive asset already exists: ${data.media.id}`);
          loadCanonicalData(); // Reload to show existing asset
        }
      } else {
        console.error('[WORKBENCH] Ingestion failed with error:', data);
        const errorDetails = `
Status: ${response.status} ${response.statusText}
Error: ${data.error || 'UNKNOWN'}
Stage: ${data.stage || 'UNKNOWN'}
Message: ${data.message || 'Unknown error'}
Details: ${data.details || 'None'}
Request ID: ${data.requestId || 'None'}
        `.trim();
        alert(errorDetails);
      }
    } catch (error) {
      console.error('[WORKBENCH] Failed to use Drive file:', error);
      alert(`Error: Failed to use Drive asset

${error instanceof Error ? error.message : 'Unknown error'}

This may be due to:
- Network error
- Authentication redirect
- API endpoint not found
- Vercel Blob/KV not configured

Check browser console for detailed logs.`);
    }
  };

  const filteredAssets = state.assets.filter((asset) => {
    const matchesSearch = 
      asset.filename.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
      asset.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    const usedSlots = state.registeredSlots.filter(s => s.currentMediaId === asset.id);
    const isUsed = usedSlots.length > 0;
    const isDriveOnly = asset.source === 'google-drive' && asset.drive?.fileId;

    switch (state.filter) {
      case 'used': return isUsed;
      case 'unused': return !isUsed;
      case 'drive': return isDriveOnly;
      default: return true;
    }
  });

  const getSlotMedia = (slot: RegisteredSlot) => {
    if (!slot.currentMediaId) return null;
    return getMediaById(slot.currentMediaId);
  };

  // Compatibility fallback: resolve URL-based assetIds to canonical IDs
  function resolveAssetId(rawId: string, assets: VisualAsset[]): string | null {
    // Direct match - canonical ID
    const direct = assets.find(a => a.id === rawId);
    if (direct) {
      return direct.id;
    }
    
    // Fallback: match against variant URLs (for legacy URL-based assetIds)
    const byVariant = assets.find(a =>
      Object.values(a.variants ?? {}).some(
        value => value === rawId
      )
    );
    
    return byVariant?.id ?? null;
  }

  const confirmAssignment = async () => {
    if (state.pendingAssignments.size === 0) return;

    console.log('[DND] CONFIRMING_ASSIGNMENTS', {
      count: state.pendingAssignments.size,
      assignments: Array.from(state.pendingAssignments.values()).map(a => ({
        slotId: a.slot.id,
        assetId: a.asset.id,
        currentMediaId: a.slot.currentMediaId,
      })),
    });

    // Process all pending assignments
    for (const { slot, asset } of state.pendingAssignments.values()) {
      try {
        console.log('[DND] SLOT_ASSIGNMENT_PERSIST', {
          slotId: slot.id,
          assetId: asset.id,
          slotName: slot.slotName,
        });
        
        await assignAssetToSlot(asset, slot);
        
        console.log('[DND] SLOT_ASSIGNMENT_SUCCESS', {
          slotId: slot.id,
          assetId: asset.id,
        });
      } catch (error) {
        console.error('[DND] SLOT_ASSIGNMENT_FAILED', {
          slotId: slot.id,
          assetId: asset.id,
          error: error instanceof Error ? error.message : String(error),
        });
        alert(`Failed to assign ${asset.filename} to ${slot.slotName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Clear all pending assignments after processing
    setState(prev => ({ ...prev, pendingAssignments: new Map() }));
    
    // Force iframe refresh to pick up authority changes
    console.log('[DND] SLOT_REFRESH', {
      iframeExists: !!iframeRef.current,
    });
    
    if (iframeRef.current) {
      console.log('[DND] IFRAME_REFRESH_TRIGGERED');
      // Send refresh message to iframe for immediate slot update
      if (iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage({ type: 'REFRESH_SLOTS' }, '*');
      }
    }
  };

  const cancelAssignment = () => {
    console.log('[DND CONFIRM] CANCEL_ASSIGNMENTS');
    setState(prev => ({ ...prev, pendingAssignments: new Map() }));
  };

  const handleSlotAssignment = (slotId: string, assetId: string) => {
    const slot = state.registeredSlots.find(s => s.id === slotId);
    const asset = assetsRef.current.find(a => a.id === assetId);
    
    if (slot && asset) {
      console.log('[DND] SLOT_ASSIGNMENT', {
        slotId,
        assetId,
        slotName: slot.slotName,
        assetFilename: asset.filename,
        currentMediaId: slot.currentMediaId,
      });
      
      // Stage the assignment
      setState(prev => {
        const newPendingAssignments = new Map(prev.pendingAssignments);
        newPendingAssignments.set(slotId, { slot, asset });
        return { ...prev, pendingAssignments: newPendingAssignments };
      });
      
      console.log('[DND] ASSIGNMENT_STAGED', {
        slotId,
        assetId,
        pendingCount: state.pendingAssignments.size + 1,
      });
    } else {
      console.error('[DND] SLOT_ASSIGNMENT_FAILED', {
        slotId,
        assetId,
        slotFound: !!slot,
        assetFound: !!asset,
      });
    }
  };

  const removePendingAssignment = (slotId: string) => {
    setState(prev => {
      const newPendingAssignments = new Map(prev.pendingAssignments);
      newPendingAssignments.delete(slotId);
      return { ...prev, pendingAssignments: newPendingAssignments };
    });
  };

  const createDriveReference = async (driveReference: any, slot: RegisteredSlot) => {
    console.log('[DND] CREATE_DRIVE_REFERENCE', {
      fileId: driveReference.fileId,
      sharedDriveId: driveReference.sharedDriveId,
      slotId: slot.id,
    });

    try {
      const response = await fetch('/api/drive/reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: driveReference.fileId,
          sharedDriveId: driveReference.sharedDriveId,
        }),
      });

      const result = await response.json();

      if (result.success && result.media) {
        console.log('[DND] DRIVE_REFERENCE_SUCCESS', {
          mediaId: result.media.id,
          slotId: slot.id,
        });

        // Add to local assets
        setState(prev => ({
          ...prev,
          assets: [...prev.assets, result.media],
        }));

        // Route through existing replacement confirmation
        handleDriveDropToSlot(slot, result.media, slot.currentMediaId);
      } else {
        console.error('[DND] DRIVE_REFERENCE_FAILED', result);
        alert(`Failed to create Drive reference: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[DND] DRIVE_REFERENCE_ERROR', error);
      alert(`Failed to create Drive reference: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDriveDropToSlot = (slot: RegisteredSlot, asset: VisualAsset, currentMediaId: string | null) => {
    console.log('[DND] DRIVE_DROP_TO_SLOT', {
      slotId: slot.id,
      slotName: slot.slotName,
      assetId: asset.id,
      assetFilename: asset.filename,
      currentMediaId,
    });

    // If slot already has media, show replacement confirmation
    if (currentMediaId) {
      const currentAsset = assetsRef.current.find(a => a.id === currentMediaId);
      const currentName = currentAsset?.filename || 'current image';
      const newName = asset.filename;

      const confirmed = confirm(
        `Replace current image?\n\nCurrent: ${currentName}\nNew: ${newName}`
      );

      if (!confirmed) {
        console.log('[DND] REPLACEMENT_CANCELLED', { slotId: slot.id });
        return;
      }

      console.log('[DND] REPLACEMENT_CONFIRMED', { slotId: slot.id });
    }

    // Stage the assignment through existing confirmation system
    handleSlotAssignment(slot.id, asset.id);
  };

  const assignAssetToSlot = async (asset: VisualAsset, slot: RegisteredSlot) => {
    const slotId = slot.id;

    console.log('[DND] API_REQUEST', {
      slotId,
      assetId: asset.id,
      mediaId: asset.id,
      assetFilename: asset.filename,
    });

    try {
      let response: Response;
      let endpoint: string;
      let requestBody: any;

      if (slotId === 'homepage-hero-slot' || slotId === 'hero-background') {
        endpoint = '/api/admin/brand/hero';
        requestBody = { mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId === 'homepage-owner-portrait-slot' || slotId === 'about-owner-portrait-slot') {
        endpoint = '/api/admin/brand/portrait';
        requestBody = { mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('homepage-featured-project-')) {
        // Extract project ID from slot ID (e.g., homepage-featured-project-exterior-painting-001 -> exterior-painting-001)
        const projectId = slotId.replace('homepage-featured-project-', '');
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('homepage-service-card-slot-')) {
        // Extract service slug from slot ID (e.g., homepage-service-card-slot-painting -> painting)
        const serviceSlug = slotId.replace('homepage-service-card-slot-', '');
        endpoint = '/api/admin/services/card';
        requestBody = { serviceSlug, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('our-work-project-card-')) {
        // Extract project ID from slot ID (e.g., our-work-project-card-exterior-painting-001 -> exterior-painting-001)
        const projectId = slotId.replace('our-work-project-card-', '');
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('services-') && slotId.includes('-project-card-')) {
        // Extract project ID from service project card slot
        const projectId = slotId.split('-project-card-')[1];
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('services-') && slotId.includes('-related-service-card-')) {
        // Extract service slug from slot ID (e.g., services-painting-related-service-card-fences -> fences)
        const serviceSlug = slotId.split('-related-service-card-')[1];
        endpoint = '/api/admin/services/card';
        requestBody = { serviceSlug, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('services-page-service-card-')) {
        // Extract service slug from slot ID (e.g., services-page-service-card-painting -> painting)
        const serviceSlug = slotId.replace('services-page-service-card-', '');
        endpoint = '/api/admin/services/card';
        requestBody = { serviceSlug, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('our-work-gallery-')) {
        // Extract project ID and gallery index from slot ID (e.g., our-work-gallery-exterior-painting-001-0 -> exterior-painting-001, 0)
        const idPart = slotId.replace('our-work-gallery-', '');
        const lastHyphenIndex = idPart.lastIndexOf('-');
        const projectId = idPart.substring(0, lastHyphenIndex);
        const galleryIndex = parseInt(idPart.substring(lastHyphenIndex + 1), 10);
        console.log('[DND 8] GALLERY_SLOT_PARSED', { slotId, projectId, galleryIndex });
        endpoint = '/api/admin/projects/gallery';
        requestBody = { projectId, galleryIndex, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('project-hero-')) {
        // Extract project ID from slot ID (e.g., project-hero-fences-001 -> fences-001)
        const projectId = slotId.replace('project-hero-', '');
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('project-gallery-')) {
        // Extract project ID and gallery index from slot ID (e.g., project-gallery-fences-001-0 -> fences-001, 0)
        const idPart = slotId.replace('project-gallery-', '');
        const lastHyphenIndex = idPart.lastIndexOf('-');
        const projectId = idPart.substring(0, lastHyphenIndex);
        const galleryIndex = parseInt(idPart.substring(lastHyphenIndex + 1), 10);
        console.log('[DND 8] PROJECT_GALLERY_SLOT_PARSED', { slotId, projectId, galleryIndex });
        endpoint = '/api/admin/projects/gallery';
        requestBody = { projectId, galleryIndex, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('slider-left-')) {
        // Extract project ID from slot ID (e.g., slider-left-fences-001 -> fences-001)
        const projectId = slotId.replace('slider-left-', '');
        endpoint = '/api/admin/projects/before-after';
        requestBody = { projectId, side: 'before', mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('slider-right-')) {
        // Extract project ID from slot ID (e.g., slider-right-fences-001 -> fences-001)
        const projectId = slotId.replace('slider-right-', '');
        endpoint = '/api/admin/projects/before-after';
        requestBody = { projectId, side: 'after', mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.includes('before') || slotId.includes('after')) {
        alert('Before/after assignment not yet implemented. Needs projects.v1.json write endpoint');
        return;
      } else {
        console.log('[DND] UNSUPPORTED_SLOT_TYPE', { slotId });
        return;
      }

      console.log('[DND] API_RESPONSE', {
        endpoint,
        status: response.status,
        ok: response.ok,
        requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[DND] SLOT_ASSIGNMENT_FAILURE', {
          slotId,
          assetId: asset.id,
          status: response.status,
          error: errorText,
        });
        alert(`Assignment failed: ${response.status} - ${errorText}`);
        return;
      }

      const responseBody = await response.json();
      console.log('[DND] API_RESPONSE_BODY', {
        slotId,
        assetId: asset.id,
        responseBody,
      });

      console.log('[DND] SLOT_ASSIGNMENT_SUCCESS', {
        slotId,
        assetId: asset.id,
      });

      setState(prev => ({ ...prev, selectedSlot: slot, selectedAsset: asset }));
      loadCanonicalData();

      // Force iframe reload to pick up authority changes
      if (iframeRef.current) {
        console.log('[DND 9] IFRAME_RELOAD_TRIGGERED', {
          slotId,
          assetId: asset.id,
        });
        // Send refresh message to iframe for immediate slot update
        if (iframeRef.current.contentWindow) {
          iframeRef.current.contentWindow.postMessage({ type: 'REFRESH_SLOTS' }, '*');
        }
        // Also trigger reload as fallback
        iframeRef.current.src = iframeRef.current.src;
      }
    } catch (error) {
      console.log('[DND 8] SLOT_ASSIGNMENT_FAILURE', {
        slotId,
        assetId: asset.id,
        error: error instanceof Error ? error.message : String(error),
      });
      console.error('Failed to assign asset to slot:', error);
      alert('Failed to assign asset. Check console for details.');
    }
  };

  const handleSlotClick = (slot: RegisteredSlot) => {
    setState(prev => ({ ...prev, selectedSlot: slot }));
    const media = getSlotMedia(slot);
    if (media) {
      const asset = state.assets.find(a => a.id === media.id);
      if (asset) {
        setState(prev => ({ ...prev, selectedAsset: asset }));
      }
    }
  };

  const handleAssetClick = (asset: VisualAsset) => {
    setState(prev => ({ ...prev, selectedAsset: asset }));
    const usingSlots = state.registeredSlots.filter(s => s.currentMediaId === asset.id);
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
    if (driveFile && driveFile.mimeType) {
      const driveReference = {
        source: 'google-drive' as const,
        fileId: driveFile.id,
        sharedDriveId: state.driveCurrentDriveId || undefined,
        name: driveFile.name,
        mimeType: driveFile.mimeType,
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
          fileId: asset.drive?.fileId ?? null,
          sharedDriveId: asset.drive?.driveId ?? null,
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

  const currentSlots = state.registeredSlots.filter(s => s.route === state.selectedPage);

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
                  onClick={confirmAssignment}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2 text-xs"
                >
                  CONFIRM ALL
                </button>
              </div>
            )}
            <button
              onClick={loadCanonicalData}
              className="px-3 py-1 bg-surface text-foreground rounded hover:bg-surface/80 transition-colors flex items-center gap-2 text-xs"
            >
              <RefreshCw size={12} />
              Reload
            </button>
          </div>
        </div>
      </div>

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
                  title="Remove from pending"
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
        {/* LEFT: Website Preview */}
        <section className="min-h-0 min-w-0 overflow-y-auto bg-white h-full">
          <iframe
            ref={iframeRef}
            src={`${window.location.origin}${state.selectedPage}?workbench=true`}
            className="w-full h-full border-0"
            title="Website Preview"
            sandbox="allow-same-origin allow-scripts"
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
              {(['all', 'used', 'unused', 'drive'] as const).map((filter) => (
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
                          <Database className="inline mr-2" size={16} />
                          {drive.name}
                        </button>
                      ))}
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
                      {state.driveBreadcrumb.map((crumb, index) => (
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

                    {/* View toggle */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setState(prev => ({ ...prev, driveViewMode: prev.driveViewMode === 'grid' ? 'list' : 'grid' }))}
                        className="p-2 bg-background border border-border rounded hover:border-primary transition-colors"
                      >
                        {state.driveViewMode === 'grid' ? <List size={20} /> : <FileImage size={20} />}
                      </button>
                    </div>

                    {state.driveLoading && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Loading Drive files...
                      </div>
                    )}

                    {/* Folders */}
                    {state.driveFiles.filter((item: any) => item.type === 'folder').length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2">Folders</h3>
                        <div className="grid grid-cols-3 gap-2">
                          {state.driveFiles.filter((item: any) => item.type === 'folder').map((folder: any) => (
                            <button
                              key={folder.id}
                              onClick={() => navigateToFolder(folder)}
                              className="p-3 bg-background border border-border rounded-lg hover:border-primary transition-colors text-left"
                            >
                              <Folder className="inline mr-2" size={20} />
                              <div className="text-sm font-medium text-foreground truncate">{folder.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Files */}
                    {state.driveFiles.filter((item: any) => item.type !== 'folder').length > 0 && (
                      <div>
                        <h3 className="text-xs font-semibold text-muted-foreground mb-2">Files</h3>
                        {state.driveViewMode === 'grid' ? (
                          <div className="grid grid-cols-3 gap-2">
                            {state.driveFiles.filter((item: any) => item.type !== 'folder').map((file: any) => {
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
                                  {file.thumbnailLink ? (
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
                            {state.driveFiles.filter((item: any) => item.type !== 'folder').map((file: any) => {
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
                                  {file.thumbnailLink ? (
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
                                    {isIngested && (
                                      <div className="text-xs text-green-600 font-medium">✓ Ingested</div>
                                    )}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Load more */}
                        {state.driveNextPageToken && (
                          <button
                            onClick={loadMoreDriveFiles}
                            disabled={state.driveLoadingMore}
                            className="mt-3 w-full py-2 bg-background border border-border rounded-lg hover:border-primary transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {state.driveLoadingMore ? <Loader2 size={16} className="animate-spin" /> : 'Load more'}
                          </button>
                        )}
                      </div>
                    )}

                    {state.driveFiles.length === 0 && !state.driveLoading && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        No files in this folder
                      </div>
                    )}

                    {/* Selected file actions */}
                    {state.driveSelectedFile && (
                      <div className="mt-4 p-3 bg-background border border-border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-foreground">{state.driveSelectedFile.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {state.driveSelectedFile.mimeType} • {state.driveSelectedFile.size ? `${(state.driveSelectedFile.size / 1024).toFixed(1)} KB` : 'Unknown size'}
                          </div>
                        </div>
                        <button
                          onClick={() => state.driveSelectedFile && useDriveFile(state.driveSelectedFile)}
                          className="px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          Ingest as Media
                        </button>
                      </div>
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
                const isDriveOnly = asset.drive?.fileId && !asset.physicalPath;
                
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
                    ) : asset.variants?.webp || asset.variants?.original ? (
                      <img
                        src={asset.variants.webp || asset.variants.original}
                        alt={asset.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface flex items-center justify-center">
                        <Layers className="text-muted-foreground" size={32} />
                      </div>
                    )}
                    
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-xs text-white font-medium truncate">
                        {asset.filename}
                      </p>
                    </div>

                    {isDriveOnly && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                        Drive
                      </div>
                    )}
                    {isUsed && !isDriveOnly && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                        Used
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No photos found
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
