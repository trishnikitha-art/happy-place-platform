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
import { RefreshCw, Search, Layers, Database, FolderOpen, Folder, FileImage, ChevronRight, Loader2, List, AlertCircle } from 'lucide-react';
import { loadVisualAssetRegistry, addDriveAssetToRegistry, type VisualAsset } from '@/lib/visual-asset-registry';
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
  });

  const mediaPanelRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const assetsRef = useRef<VisualAsset[]>([]);
  const registeredSlotsRef = useRef<RegisteredSlot[]>([]);
  const deploymentInProgressRef = useRef<boolean>(false); // Prevent deployment stacking

  // Keep assetsRef in sync with state.assets (avoids stale closure in message listener)
  useEffect(() => {
    assetsRef.current = state.assets;
  }, [state.assets]);

  // Keep registeredSlotsRef in sync with state.registeredSlots (avoids stale closure in message listener)
  useEffect(() => {
    registeredSlotsRef.current = state.registeredSlots;
  }, [state.registeredSlots]);

  useEffect(() => {
    console.log('[WORKBENCH] MESSAGE_LISTENER_ATTACHING');

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
          // CRITICAL FIX: fileId and sharedDriveId are not interchangeable identities
          // Must match on (fileId AND sharedDriveId) or fileId only (for non-shared files)
          const existingAsset = assetsRef.current.find(a => {
            const assetDriveId = a.provenance?.august3_driveId;
            const fileId = applicationData.fileId;
            const sharedDriveId = applicationData.sharedDriveId;

            // Match both fileId and sharedDriveId for shared files
            if (sharedDriveId) {
              return assetDriveId === fileId && a.provenance?.drive_canonical === true;
            }
            // Match fileId only for non-shared files
            return assetDriveId === fileId && a.provenance?.drive_canonical === true;
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
          
          // Resolve to canonical ID (handles legacy URL-based assetIds)
          const canonicalAssetId = resolveAssetId(assetId, assetsRef.current);
          
          console.log('[DND] ASSET_ID_RESOLUTION', {
            requestId,
            rawAssetId: assetId,
            canonicalAssetId,
            resolutionMethod: canonicalAssetId === assetId ? 'direct' : 'variant-fallback',
          });
          
          if (!canonicalAssetId) {
            console.log('[DND_ERROR] ASSET_LOOKUP_FAILED', {
              requestId,
              stage: 'ASSET_LOOKUP',
              slotId,
              requestedAssetId: assetId,
              registryCount: assetsRef.current.length,
            });
            
            // Log sample registry IDs for debugging
            console.log('[DND] REGISTRY_IDS', {
              requestId,
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
            requestId,
            canonicalAssetId,
            found: !!asset,
            filename: asset?.filename,
            source: asset?.source,
          });
          
          if (asset) {
            // Gallery duplicate prevention: check if mediaId is already in another gallery slot
            if (slotId.startsWith('our-work-gallery-') || slotId.startsWith('project-gallery-')) {
              const existingGallerySlot = registeredSlotsRef.current.find(s => 
                s.section === 'Gallery' && 
                s.currentMediaId === canonicalAssetId && 
                s.id !== slotId
              );
              if (existingGallerySlot) {
                alert(`This media is already assigned to ${existingGallerySlot.slotName}. Each gallery image can only be used once.`);
                return;
              }
            }

            console.log('[WB_FORENSIC] ASSIGNMENT_STAGED', {
              requestId,
              slotId,
              canonicalAssetId,
              currentMediaId: slot.currentMediaId,
              timestamp: Date.now(),
            });

            console.log('[DND] STAGE_ASSIGNMENT', {
              requestId,
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
              requestId,
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

          // FIX: Use atomic PUT authority instead of legacy DELETE
          // Get current gallery, remove at galleryIndex, PUT complete array
          const getResponse = await fetch(`/api/admin/projects/gallery?projectId=${projectId}`);
          if (!getResponse.ok) {
            throw new Error('Failed to fetch current gallery');
          }
          const galleryData = await getResponse.json();
          const currentGallery = galleryData.gallery || [];
          const currentRevision = galleryData.currentRevision || 0;
          
          // Remove media at galleryIndex
          const newGallery = currentGallery.filter((_: string, i: number) => i !== galleryIndex);
          
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
          console.log('[DELETE GALLERY] SUCCESS', { projectId, galleryLength: result.gallery?.length || 0 });

          // Reload canonical data after successful deletion
          loadCanonicalData();
        } catch (error) {
          console.error('[DELETE GALLERY] ERROR', error);
          alert(`Failed to delete gallery assignment: ${error instanceof Error ? error.message : String(error)}`);
        }
      } else if (event.data.type === 'add-to-gallery') {
        // Handle add-to-gallery request from Our Work page
        const { slotId, projectId } = event.data;
        console.log('[ADD TO GALLERY] MESSAGE_RECEIVED', { slotId, projectId });

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
          console.log('[ADD TO GALLERY] SUCCESS', { projectId, mediaId: asset.id, galleryLength: result.gallery?.length || 0 });

          // Reload canonical data after successful add
          loadCanonicalData();
          
          alert(`Successfully added "${asset.filename}" to gallery. Gallery now has ${result.gallery?.length || 0} photos.`);
        } catch (error) {
          console.error('[ADD TO GALLERY] ERROR', error);
          alert(`Failed to add to gallery: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    };
    window.addEventListener('message', handleMessage);

    console.log('[WORKBENCH] MESSAGE_LISTENER_ATTACHED');

    return () => {
      unsubscribe();
      window.removeEventListener('slot-click', handleSlotClickEvent as EventListener);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  const loadCanonicalData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      
      // Load static visual asset registry (media.v1.json)
      const staticRegistry = await loadVisualAssetRegistry();
      
      // Load dynamic media from KV (Drive records) - fail-closed if KV unavailable
      let dynamicMediaList: any[] = [];
      try {
        const { getPublishedMediaAssets } = await import('@/lib/visual-asset-registry');
        dynamicMediaList = await getPublishedMediaAssets();
        setState(prev => ({ ...prev, kvAvailable: true, kvError: null }));
      } catch (error) {
        console.error('[WORKBENCH] KV media authority unavailable - AUTHORITY UNAVAILABLE:', error);
        // Set KV unavailable state - this is a blocking error for authoritative mutations
        setState(prev => ({ 
          ...prev, 
          kvAvailable: false, 
          kvError: error instanceof Error ? error.message : 'KV authority unavailable'
        }));
        // Continue with static registry as read-only evidence - no authoritative mutations allowed
      }
      
      // Combine static + dynamic media for complete inventory
      const combinedRegistry = [...staticRegistry];
      
      // Add KV Drive records that aren't already in static registry
      for (const dynamicMedia of dynamicMediaList) {
        const exists = staticRegistry.some(a => a.id === dynamicMedia.id);
        if (!exists) {
          const driveAsset = await addDriveAssetToRegistry(dynamicMedia);
          combinedRegistry.push(driveAsset);
        }
      }
      
      console.log('[WORKBENCH] COMBINED_REGISTRY_LOADED', {
        staticCount: staticRegistry.length,
        dynamicCount: dynamicMediaList.length,
        combinedCount: combinedRegistry.length,
      });
      
      setState(prev => ({ ...prev, assets: combinedRegistry, registeredSlots: slotRegistry.getAll() }));
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
    
    // NO AUTOMATIC INGESTION: Selection is just selection
    // Materialization must be explicit via "Ingest as Media" button
    console.log('[WORKBENCH] Drive file selected (no automatic ingestion)', {
      fileId: file.id,
      name: file.name,
    });
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
          
          // COMPLETE THE SLOT ASSIGNMENT TRANSITION
          // If a slot was selected when Drive file was ingested, assign the new asset to it
          if (state.selectedSlot) {
            console.log('[WORKBENCH] Auto-assigning newly ingested Drive asset to selected slot', {
              slotId: state.selectedSlot.id,
              mediaId: driveAsset.id,
              slotName: state.selectedSlot.slotName,
            });
            handleSlotAssignment(state.selectedSlot.id, driveAsset.id);
            alert(`Drive asset created and assigned to ${state.selectedSlot.slotName}: ${driveAsset.id}`);
          } else {
            alert(`Drive asset created: ${driveAsset.id}`);
          }
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
    const isDriveOnly = asset.classification === 'DRIVE_ONLY';
    const isPublished = asset.classification === 'PUBLISHED';
    const isLegacy = asset.classification !== 'PUBLISHED' && asset.classification !== 'DRIVE_ONLY';

    switch (state.filter) {
      case 'used': return isUsed;
      case 'unused': return !isUsed;
      case 'drive': return isDriveOnly;
      case 'published': return isPublished;
      case 'legacy': return isLegacy;
      default: return true;
    }
  });

  const getSlotMedia = async (slot: RegisteredSlot) => {
    if (!slot.currentMediaId) return null;
    // P0 FIX: Resolve media from already-loaded Workbench asset state instead of direct KV access
    // Browser must not access KV credentials directly - use server API boundary or local asset state
    const media = state.assets.find(a => a.id === slot.currentMediaId);
    return media || null;
  };

  // Compatibility fallback: resolve URL-based assetIds to canonical IDs
  function resolveAssetId(rawId: string, assets: VisualAsset[]): string | null {
    // Direct match - canonical ID
    const direct = assets.find(a => a.id === rawId);
    if (direct) {
      return direct.id;
    }
    
    // Fallback: match against filename (for Drive file names being used as IDs)
    const byFilename = assets.find(a => a.filename === rawId);
    if (byFilename) {
      return byFilename.id;
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
    if (state.isAccepting) return; // Prevent double-click
    if (deploymentInProgressRef.current) {
      console.log('[DEPLOY TRIGGER] DEPLOYMENT_ALREADY_IN_PROGRESS - blocking duplicate');
      alert('A deployment is already in progress. Please wait for it to complete.');
      return;
    }

    console.log('[WB_FORENSIC] CONFIRM_STARTED', {
      count: state.pendingAssignments.size,
      timestamp: Date.now(),
    });

    deploymentInProgressRef.current = true;
    setState(prev => ({ ...prev, isAccepting: true }));

    console.log('[DND] CONFIRMING_ASSIGNMENTS', {
      count: state.pendingAssignments.size,
      assignments: Array.from(state.pendingAssignments.values()).map(a => ({
        slotId: a.slot.id,
        assetId: a.asset.id,
        currentMediaId: a.slot.currentMediaId,
      })),
    });

    // Track success/failure and errors
    let successCount = 0;
    let failureCount = 0;
    const failures: Array<{slotId: string, assetId: string, error: string}> = [];

    // Generate single transaction ID for entire confirmation batch
    const deploymentTransactionId = `WBDEP-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    console.log('[DND] DEPLOYMENT_TRANSACTION_GENERATED', { deploymentTransactionId });

    // Process all pending assignments with shared transaction ID
    for (const { slot, asset } of state.pendingAssignments.values()) {
      try {
        console.log('[DND] SLOT_ASSIGNMENT_PERSIST', {
          slotId: slot.id,
          assetId: asset.id,
          slotName: slot.slotName,
          transactionId: deploymentTransactionId,
        });
        
        const result = await assignAssetToSlot(asset, slot, deploymentTransactionId);
        
        // CRITICAL: Only log success and increment successCount after verifying persistence succeeded
        // assignAssetToSlot throws on failure, so reaching this line means persistence succeeded
        successCount++;
        
        console.log('[DND] SLOT_ASSIGNMENT_SUCCESS', {
          slotId: slot.id,
          assetId: asset.id,
          transactionId: deploymentTransactionId,
          result,
        });
      } catch (error) {
        failureCount++;
        failures.push({
          slotId: slot.id,
          assetId: asset.id,
          error: error instanceof Error ? error.message : String(error)
        });
        console.error('[DND] SLOT_ASSIGNMENT_FAILED', {
          slotId: slot.id,
          assetId: asset.id,
          error: error instanceof Error ? error.message : String(error),
        });
        // Do not alert here - collect all failures and report summary at end
      }
    }

    // Only proceed with deployment if all assignments succeeded
    if (failureCount > 0) {
      console.log('[DEPLOY TRIGGER] SKIPPED_DUE_TO_FAILURES', { successCount, failureCount, failures });
      setState(prev => ({ ...prev, isAccepting: false, pendingAssignments: new Map() }));
      
      // Build detailed error message
      const failureDetails = failures.map(f => 
        `• ${f.slotId}: ${f.error}`
      ).join('\n');
      
      alert(`Acceptance incomplete: ${successCount} succeeded, ${failureCount} failed. Deployment cancelled.\n\nFailed assignments:\n${failureDetails}`);
      return;
    }

    // Clear all pending assignments after successful processing
    setState(prev => ({ ...prev, pendingAssignments: new Map() }));

    // Commit to GitHub after successful assignment persistence
    console.log('[DEPLOY API] COMMITTING_TO_GITHUB');
    try {
      const deployResponse = await fetch('/api/admin/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          reason: `Workbench media changes accepted (${successCount} assignments)`,
          transactionIds: [deploymentTransactionId]
        }),
      });

      if (deployResponse.ok) {
        const deployData = await deployResponse.json();
        console.log('[DEPLOY API] SUCCESS', { 
          commitSha: deployData.commitSha,
          commitUrl: deployData.commitUrl,
          message: deployData.message,
          status: deployData.status,
          verificationPassed: deployData.verificationPassed
        });
        
        // Handle COMMITTED_DEPLOYING status - poll for actual Vercel deployment
        if (deployData.status === 'COMMITTED_DEPLOYING') {
          console.log('[DEPLOY API] WAITING_FOR_VERCEL_DEPLOYMENT', { commitSha: deployData.commitSha });
          
          // Poll deployment status with exponential backoff
          let deploymentReady = false;
          let pollAttempts = 0;
          const maxPollAttempts = 30; // 30 seconds max wait
          const pollInterval = 1000; // 1 second initial interval
          
          while (!deploymentReady && pollAttempts < maxPollAttempts) {
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            pollAttempts++;
            
            try {
              const statusResponse = await fetch(`/api/admin/deploy/status?commitSha=${deployData.commitSha}`);
              if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                console.log('[DEPLOY API] STATUS_POLL', { 
                  attempt: pollAttempts, 
                  status: statusData.status,
                  vercelStatus: statusData.vercelStatus 
                });
                
                if (statusData.status === 'PUBLISHED' || statusData.vercelStatus === 'success') {
                  deploymentReady = true;
                  console.log('[DEPLOY API] VERCEL_DEPLOYMENT_READY', { 
                    commitSha: deployData.commitSha,
                    vercelStatus: statusData.vercelStatus 
                  });
                }
              }
            } catch (error) {
              console.error('[DEPLOY API] STATUS_POLL_FAILED', { attempt: pollAttempts, error });
            }
          }
          
          if (deploymentReady) {
            // Force iframe refresh AFTER Vercel deployment succeeds
            console.log('[DND] SLOT_REFRESH_AFTER_VERCEL_DEPLOY', {
              iframeExists: !!iframeRef.current,
              commitSha: deployData.commitSha,
            });
            
            if (iframeRef.current) {
              console.log('[DND] IFRAME_REFRESH_TRIGGERED');
              if (iframeRef.current.contentWindow) {
                iframeRef.current.contentWindow.postMessage({ type: 'REFRESH_SLOTS' }, window.location.origin);
              }
            }
            
            alert(`Your changes are live and saved.\n\n${deployData.message}\n\nCommit SHA: ${deployData.commitSha}\n\nVercel deployment completed successfully.`);
          } else {
            alert(`Your changes are safely committed to GitHub.\n\n${deployData.message}\n\nCommit SHA: ${deployData.commitSha}\n\nVercel deployment is still in progress. Refresh the page in a few moments to see changes.`);
          }
        } else if (deployData.status === 'PUBLISHED') {
          // Directly published (shouldn't happen with new logic, but handle for compatibility)
          console.log('[DND] SLOT_REFRESH_ALREADY_PUBLISHED', {
            iframeExists: !!iframeRef.current,
            commitSha: deployData.commitSha,
          });
          
          if (iframeRef.current) {
            console.log('[DND] IFRAME_REFRESH_TRIGGERED');
            if (iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage({ type: 'REFRESH_SLOTS' }, window.location.origin);
            }
          }
          
          alert(`Your changes are live and saved.\n\n${deployData.message}\n\nCommit SHA: ${deployData.commitSha}`);
        } else if (deployData.status === 'COMMITTED_NEEDS_RECONCILIATION') {
          alert(`Your changes are safely saved. Publishing is still being completed automatically.\n\n${deployData.message}\n\nError: ${deployData.verificationError || 'Unknown verification error'}`);
        } else {
          alert(`Your changes are live and saved.\n\n${deployData.message}\n\nCommit SHA: ${deployData.commitSha}`);
        }
      } else {
        const errorData = await deployResponse.json();
        console.error('[DEPLOY API] FAILED', { error: errorData });
        alert(`Your changes were not published. Nothing was lost. Try again.\n\nGitHub commit failed: ${errorData.error || errorData.message}`);
      }
    } catch (error) {
      console.error('[DEPLOY API] ERROR', error);
      alert(`Your changes were not published. Nothing was lost. Try again.\n\nGitHub commit failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setState(prev => ({ ...prev, isAccepting: false }));
      deploymentInProgressRef.current = false; // Allow new deployments
    }
  };

  const cancelAssignment = () => {
    console.log('[DND CONFIRM] CANCEL_ASSIGNMENTS');
    setState(prev => ({ ...prev, pendingAssignments: new Map() }));
    deploymentInProgressRef.current = false; // Clear deployment flag on cancel
  };

  const handleSlotAssignment = (slotId: string, assetId: string) => {
    // ENFORCE KV AUTHORITY BOUNDARY: Prevent assignments when KV is unavailable
    if (!state.kvAvailable) {
      alert(`AUTHORITY UNAVAILABLE: KV media authority is not accessible. Cannot perform authoritative assignments without live KV connectivity.\n\nError: ${state.kvError || 'Unknown KV error'}\n\nPlease resolve KV connectivity to enable media operations.`);
      console.error('[WORKBENCH] ASSIGNMENT_REJECTED: KV authority unavailable', {
        slotId,
        assetId,
        kvError: state.kvError,
      });
      return;
    }

    // Use registeredSlotsRef.current instead of stale state.registeredSlots
    const slot = registeredSlotsRef.current.find(s => s.id === slotId);
    const asset = assetsRef.current.find(a => a.id === assetId);
    
    console.log('[WB_FORENSIC] ASSIGNMENT_INPUT', {
      slotId,
      resolvedSlotId: slot?.id,
      mediaId: assetId,
      source: asset?.source || 'unknown',
      classification: asset?.classification || 'unknown',
      lifecycleState: asset?.lifecycleState || 'unknown',
      driveFileId: asset?.drive?.fileId,
      sharedDriveId: asset?.drive?.driveId,
      slotFound: !!slot,
      assetFound: !!asset,
      registeredSlotsCount: registeredSlotsRef.current.length,
      assetsCount: assetsRef.current.length,
      kvAvailable: state.kvAvailable,
      timestamp: Date.now(),
    });
    
    if (!slot || !asset) {
      console.error('[WORKBENCH] Assignment failed: slot or asset not found', { slotId, assetId });
      return;
    }

    // ENFORCE ASSIGNABILITY BOUNDARY: Only PUBLISHED assets can be assigned
    // Legacy assets (PRESENT_MAPPED, PRESENT_UNMAPPED, etc.) must be promoted first
    if (asset.classification !== 'PUBLISHED') {
      alert(`This asset is not in a published state. Only fully materialized PublishedMediaAsset can be assigned.\n\nCurrent classification: ${asset.classification}\n\nLegacy assets must be promoted to PublishedMediaAsset before assignment.`);
      console.log('[WORKBENCH] ASSIGNMENT_REJECTED: Asset not PUBLISHED', {
        assetId,
        classification: asset.classification,
        lifecycleState: asset.lifecycleState,
        source: asset.source,
      });
      return;
    }

    // Additional constitutional gate: enforce PublishedMediaAsset contract
    if (asset.source !== 'local' || asset.lifecycleState !== 'published') {
      alert(`This asset does not meet PublishedMediaAsset requirements.\n\nSource: ${asset.source}\nLifecycle: ${asset.lifecycleState}\n\nOnly local published assets can be assigned.`);
      console.log('[WORKBENCH] ASSIGNMENT_REJECTED: Asset not PublishedMediaAsset', {
        assetId,
        source: asset.source,
        lifecycleState: asset.lifecycleState,
      });
      return;
    }
    
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
      
    console.log('[WB_FORENSIC] ASSIGNMENT_STAGED', {
      slotId,
      mediaId: assetId,
      source: asset.source,
      timestamp: Date.now(),
    });
      
    console.log('[DND] ASSIGNMENT_STAGED', {
      slotId,
      assetId,
      pendingCount: state.pendingAssignments.size + 1,
    });
  };

  const removePendingAssignment = (slotId: string) => {
    setState(prev => {
      const newPendingAssignments = new Map(prev.pendingAssignments);
      newPendingAssignments.delete(slotId);
      return { ...prev, pendingAssignments: newPendingAssignments };
    });
  };

  const materializeDriveFile = async (driveFile: any, slot: RegisteredSlot, requestId?: string) => {
    console.log('[DND] DRIVE_MATERIALIZATION_STARTED', {
      requestId,
      fileId: driveFile.fileId,
      sharedDriveId: driveFile.sharedDriveId,
      slotId: slot.id,
    });

    try {
      console.log('[DND] DRIVE_INGEST_STARTED', {
        requestId,
        fileId: driveFile.fileId,
        sharedDriveId: driveFile.sharedDriveId,
      });
      
      // Use ingest API to materialize Drive file into PublishedMediaAsset
      const response = await fetch('/api/drive/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          driveId: driveFile.fileId,
          driveIdParameter: driveFile.sharedDriveId,
        }),
      });

      console.log('[DND] DRIVE_INGEST_RESPONSE', {
        requestId,
        httpStatus: response.status,
      });

      const result = await response.json();

      if (result.success && result.media) {
        console.log('[DND] DRIVE_MATERIALIZATION_SUCCESS', {
          requestId,
          mediaId: result.media.id,
          lifecycleState: result.media.lifecycleState,
          source: result.media.source,
          hasVariants: !!result.media.variants,
          slotId: slot.id,
        });

        // Verify this is actually a PublishedMediaAsset
        if (result.media.source !== 'local' || result.media.lifecycleState !== 'published') {
          console.error('[DND] MATERIALIZATION_INVALID_STATE', {
            requestId,
            mediaId: result.media.id,
            source: result.media.source,
            lifecycleState: result.media.lifecycleState,
          });
          alert('Materialization failed: asset is not in published state');
          return;
        }

        // Add the newly materialized PublishedMediaAsset to assetsRef.current
        assetsRef.current = [...assetsRef.current, result.media];
        
        // Also update React state to include the new asset
        setState(prev => ({
          ...prev,
          assets: [...prev.assets, result.media],
        }));

        console.log('[DND] SLOT_STATE_UPDATED', {
          requestId,
          assetCount: assetsRef.current.length,
        });

        // Reload dynamic media from KV to pick up new PublishedMediaAsset
        try {
          const { getPublishedMediaAssets } = await import('@/lib/visual-asset-registry');
          await getPublishedMediaAssets();
        } catch (error) {
          console.warn('[DND] KV media authority unavailable - skipping dynamic reload:', error);
          // Continue without dynamic reload - KV unavailability is not a DND blocking error
        }

        console.log('[DND] THUMBNAIL_RENDER_PATH', {
          requestId,
          thumbnailUrl: result.media.variants?.thumbnail,
          webUrl: result.media.variants?.web,
        });

        // Route through existing replacement confirmation
        handleDriveDropToSlot(slot, result.media, slot.currentMediaId, requestId);
      } else {
        console.error('[DND] DRIVE_MATERIALIZATION_FAILED', { requestId, result });
        alert(`Materialization failed: ${result.error || result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[DND] DRIVE_MATERIALIZATION_ERROR', { requestId, error });
      alert(`Materialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  /**
   * P0 FIX: Verify media materialization completeness before using an asset
   * Calls an API endpoint that uses the authoritative materialization contract
   * (shape + real hash, no Blob proof - used during ingest context)
   */
  const verifyMediaMaterializationComplete = async (mediaId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/admin/media/verify-complete?mediaId=${encodeURIComponent(mediaId)}&materializationOnly=true`);
      if (response.ok) {
        const data = await response.json();
        return data.complete === true;
      }
      return false;
    } catch (error) {
      console.error('[DND] VERIFICATION_ERROR', { mediaId, error });
      return false;
    }
  };

  const handleDriveDropToSlot = (slot: RegisteredSlot, asset: VisualAsset, currentMediaId: string | null, requestId?: string) => {
    console.log('[DND] DRIVE_DROP_TO_SLOT', {
      requestId,
      slotId: slot.id,
      slotName: slot.slotName,
      assetId: asset.id,
      assetFilename: asset.filename,
      currentMediaId,
      hasVariants: !!asset.variants,
      thumbnailUrl: asset.variants?.thumbnail,
      webUrl: asset.variants?.web,
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

    // Stage the assignment directly using the already-resolved slot and asset
    // Do NOT use handleSlotAssignment which performs its own stale lookup
    console.log('[WB_FORENSIC] ASSIGNMENT_INPUT', {
      requestId,
      slotId: slot.id,
      resolvedSlotId: slot.id,
      mediaId: asset.id,
      source: asset.source,
      driveFileId: asset.drive?.fileId,
      sharedDriveId: asset.drive?.driveId,
      slotFound: true,
      assetFound: true,
      timestamp: Date.now(),
    });

    console.log('[DND] REACT_STATE_UPDATE_STARTED', {
      requestId,
      slotId: slot.id,
    });

    setState(prev => {
      const newPendingAssignments = new Map(prev.pendingAssignments);
      newPendingAssignments.set(slot.id, { slot, asset });
      return { ...prev, pendingAssignments: newPendingAssignments };
    });
    
    console.log('[DND] REACT_STATE_UPDATE_COMPLETED', {
      requestId,
      slotId: slot.id,
    });

    console.log('[WB_FORENSIC] ASSIGNMENT_STAGED', {
      requestId,
      slotId: slot.id,
      mediaId: asset.id,
      source: asset.source,
      timestamp: Date.now(),
    });

    console.log('[DND] ASSIGNMENT_STAGED', {
      requestId,
      slotId: slot.id,
      assetId: asset.id,
      pendingCount: state.pendingAssignments.size + 1,
    });
  };

  const assignAssetToSlot = async (asset: VisualAsset, slot: RegisteredSlot, transactionId?: string) => {
    const slotId = slot.id;

    console.log('[WB_FORENSIC] ASSIGNMENT_API_REQUEST', {
      requestId: transactionId,
      slotId,
      assetId: asset.id,
      mediaId: asset.id,
      assetFilename: asset.filename,
      timestamp: Date.now(),
    });

    console.log('[DND] API_REQUEST', {
      requestId: transactionId,
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
        requestBody = { mediaId: asset.id, transactionId, slotId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId === 'homepage-owner-portrait-slot' || slotId === 'about-owner-portrait-slot') {
        endpoint = '/api/admin/brand/portrait';
        requestBody = { mediaId: asset.id, transactionId, slotId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('homepage-featured-project-')) {
        // Extract project ID from slot ID (e.g., homepage-featured-project-exterior-painting-001 -> exterior-painting-001)
        const projectId = slotId.replace('homepage-featured-project-', '');
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('homepage-service-card-slot-')) {
        // Extract service slug from slot ID (e.g., homepage-service-card-slot-painting -> painting)
        const serviceSlug = slotId.replace('homepage-service-card-slot-', '');
        endpoint = '/api/admin/services/card';
        requestBody = { serviceSlug, mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('our-work-project-card-')) {
        // Extract project ID from slot ID (e.g., our-work-project-card-exterior-painting-001 -> exterior-painting-001)
        const projectId = slotId.replace('our-work-project-card-', '');
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('services-') && slotId.includes('-project-card-')) {
        // Extract project ID from service project card slot
        const projectId = slotId.split('-project-card-')[1];
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('services-') && slotId.includes('-related-service-card-')) {
        // Extract service slug from slot ID (e.g., services-painting-related-service-card-fences -> fences)
        const serviceSlug = slotId.split('-related-service-card-')[1];
        endpoint = '/api/admin/services/card';
        requestBody = { serviceSlug, mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('services-page-service-card-')) {
        // Extract service slug from slot ID (e.g., services-page-service-card-painting -> painting)
        const serviceSlug = slotId.replace('services-page-service-card-', '');
        endpoint = '/api/admin/services/card';
        requestBody = { serviceSlug, mediaId: asset.id, transactionId };
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
        
        // FIX: Use atomic PUT authority instead of legacy POST
        // Get current gallery, apply mutation, PUT complete array with CAS
        const getResponse = await fetch(`/api/admin/projects/gallery?projectId=${projectId}`);
        if (!getResponse.ok) {
          throw new Error('Failed to fetch current gallery');
        }
        const galleryData = await getResponse.json();
        const currentGallery = galleryData.gallery || [];
        const currentRevision = galleryData.currentRevision || 0;
        
        // Replace media at galleryIndex
        const newGallery = [...currentGallery];
        newGallery[galleryIndex] = asset.id;
        
        endpoint = '/api/admin/projects/gallery';
        requestBody = { projectId, gallery: newGallery, expectedRevision: currentRevision, transactionId };
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('project-hero-')) {
        // Extract project ID from slot ID (e.g., project-hero-fences-001 -> fences-001)
        const projectId = slotId.replace('project-hero-', '');
        endpoint = '/api/admin/projects/card';
        requestBody = { projectId, mediaId: asset.id, transactionId };
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
        
        // FIX: Use atomic PUT authority instead of legacy POST
        // Get current gallery, apply mutation, PUT complete array with CAS
        const getResponse = await fetch(`/api/admin/projects/gallery?projectId=${projectId}`);
        if (!getResponse.ok) {
          throw new Error('Failed to fetch current gallery');
        }
        const galleryData = await getResponse.json();
        const currentGallery = galleryData.gallery || [];
        const currentRevision = galleryData.currentRevision || 0;
        
        // Replace media at galleryIndex
        const newGallery = [...currentGallery];
        newGallery[galleryIndex] = asset.id;
        
        endpoint = '/api/admin/projects/gallery';
        requestBody = { projectId, gallery: newGallery, expectedRevision: currentRevision, transactionId };
        response = await fetch(endpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('slider-left-')) {
        // Extract project ID from slot ID (e.g., slider-left-fences-001 -> fences-001)
        const projectId = slotId.replace('slider-left-', '');
        endpoint = '/api/admin/projects/before-after';
        requestBody = { projectId, side: 'before', mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.startsWith('slider-right-')) {
        // Extract project ID from slot ID (e.g., slider-right-fences-001 -> fences-001)
        const projectId = slotId.replace('slider-right-', '');
        endpoint = '/api/admin/projects/before-after';
        requestBody = { projectId, side: 'after', mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.includes('before') || slotId.includes('after')) {
        throw new Error('Before/after assignment not yet implemented. Needs projects.v1.json write endpoint');
      } else if (slotId === 'homepage-bottom-visual-slot' || slotId === 'about-bottom-visual-slot') {
        // New bottom visual slots - use service card assignment system
        const serviceSlug = slotId === 'homepage-bottom-visual-slot' ? 'homepage-bottom-visual' : 'about-bottom-visual';
        endpoint = '/api/admin/services/card';
        requestBody = { serviceSlug, mediaId: asset.id, transactionId };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else {
        console.log('[DND] UNSUPPORTED_SLOT_TYPE', { slotId });
        throw new Error(`Unsupported slot type: ${slotId}`);
      }

      console.log('[DND] API_RESPONSE', {
        requestId: transactionId,
        endpoint,
        status: response.status,
        ok: response.ok,
        requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[DND] SLOT_ASSIGNMENT_FAILURE', {
          requestId: transactionId,
          slotId,
          assetId: asset.id,
          status: response.status,
          error: errorText,
        });
        
        // Parse error for better user feedback
        let userMessage = `Assignment failed (${response.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error === 'Asset must be materialized') {
            userMessage = 'This asset must be materialized before assignment. Please use the ingest workflow to convert Drive assets to PublishedMediaAsset.';
          } else if (errorJson.error === 'Invalid media lifecycle state') {
            userMessage = 'This asset is not in a published state. Only fully materialized PublishedMediaAsset can be assigned.';
          } else if (errorJson.error === 'Concurrent modification detected' || response.status === 409) {
            userMessage = 'Gallery has been modified by another operation. Please reload the page and try again.';
          } else if (errorJson.message) {
            userMessage = errorJson.message;
          }
        } catch {
          // Not JSON, use raw text
          userMessage = `Assignment failed: ${response.status} - ${errorText}`;
        }
        
        // CRITICAL: Throw error to signal failure to caller
        // The caller will catch this and increment failureCount instead of successCount
        throw new Error(userMessage);
      }

      console.log('[WB_FORENSIC] ASSIGNMENT_API_SUCCESS', {
        requestId: transactionId,
        slotId,
        assetId: asset.id,
        endpoint,
        status: response.status,
        timestamp: Date.now(),
      });

      const responseBody = await response.json();
      console.log('[DND] API_RESPONSE_BODY', {
        requestId: transactionId,
        slotId,
        assetId: asset.id,
        responseBody,
      });

      return responseBody;

    } catch (error) {
      console.error('[DND] ASSIGNMENT_ERROR', error);
      alert(`Failed to assign ${asset.filename} to ${slot.slotName}: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  };

  const handleSlotClick = async (slot: RegisteredSlot) => {
    setState(prev => ({ ...prev, selectedSlot: slot }));
    const media = await getSlotMedia(slot);
    if (media) {
      const asset = state.assets.find(a => a.id === media.id);
      if (asset) {
        setState(prev => ({ ...prev, selectedAsset: asset }));
      }
    }
    
    // Force iframe reload to pick up authority changes after assignment
    if (iframeRef.current) {
      console.log('[DND] IFRAME_RELOAD_TRIGGERED', {
        slotId: slot.id,
        assetId: media?.id,
      });
      iframeRef.current.src = iframeRef.current.src;
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
                  disabled={state.isAccepting}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2 text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {state.isAccepting ? 'ACCEPTING...' : 'CONFIRM ALL'}
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
                    ) : asset.drive?.fileId ? (
                      <img
                        src={`/api/drive/files/${asset.drive.fileId}/thumbnail${asset.drive.driveId ? `?driveId=${asset.drive.driveId}` : ''}`}
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
                    {isPublished && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs rounded">
                        Assignable
                      </div>
                    )}
                    {isLegacy && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-amber-500 text-white text-xs rounded">
                        Legacy
                      </div>
                    )}
                    {isUsed && !isDriveOnly && (
                      <div className="absolute top-2 right-2 px-2 py-1 bg-gray-500 text-white text-xs rounded">
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
