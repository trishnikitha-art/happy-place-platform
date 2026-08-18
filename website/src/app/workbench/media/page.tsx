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
import { RefreshCw, Search, Layers } from 'lucide-react';
import { loadVisualAssetRegistry, type VisualAsset } from '@/lib/visual-asset-registry';
import { getMediaById } from '@/lib/media';
import { slotRegistry, type RegisteredSlot } from '@/lib/slot-registry';

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

        console.log('[DND 6] SLOT_DROP_MESSAGE_RECEIVED', {
          slotId,
          assetId,
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

        // Use assetId from the message (not from local state)
        if (assetId) {
          console.log('[DND 7] ASSET_LOOKUP', {
            assetId,
            assetCount: assetsRef.current.length,
            found: !!assetsRef.current.find(a => a.id === assetId),
            sampleIds: assetsRef.current.slice(0, 10).map(a => a.id),
          });
          const asset = assetsRef.current.find(a => a.id === assetId);
          if (asset) {
            console.log('[DND 7] SLOT_ASSIGNMENT_ATTEMPT', {
              slotId,
              assetId,
            });
            try {
              await assignAssetToSlot(asset, slot);
            } catch (error) {
              console.log('[DND 8] SLOT_ASSIGNMENT_FAILURE', {
                slotId,
                assetId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          } else {
            console.log('[DND 7] SLOT_ASSIGNMENT_ATTEMPT - ASSET NOT FOUND', {
              slotId,
              assetId,
            });
          }
        } else {
          console.log('[FORENSIC] parent NO ASSET_ID in drop message', { slotId });
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

  const loadCanonicalData = () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const registry = loadVisualAssetRegistry();
      setState(prev => ({ ...prev, assets: registry, registeredSlots: slotRegistry.getAll() }));
    } catch (err) {
      console.error('Failed to load canonical data:', err);
    } finally {
      setState(prev => ({ ...prev, loading: false }));
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
    const isDriveOnly = asset.driveId && !asset.physicalPath;

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

  const assignAssetToSlot = async (asset: VisualAsset, slot: RegisteredSlot) => {
    const slotId = slot.id;

    console.log('[DND 8] API_REQUEST', {
      slotId,
      assetId: asset.id,
      mediaId: asset.id, // Actual identifier being sent to API
      assetFilename: asset.filename,
    });

    try {
      let response: Response;
      let endpoint: string;
      let requestBody: any;

      if (slotId === 'homepage-hero-slot' || slotId === 'about-owner-portrait-slot') {
        endpoint = '/api/admin/brand/hero';
        requestBody = { mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId === 'homepage-owner-portrait-slot') {
        endpoint = '/api/admin/brand/portrait';
        requestBody = { mediaId: asset.id };
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
      } else if (slotId === 'homepage-owner-portrait-slot' || slotId === 'about-owner-portrait-slot') {
        endpoint = '/api/admin/brand/portrait';
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
      } else if (slotId === 'homepage-owner-portrait-slot' || slotId === 'about-owner-portrait-slot') {
        endpoint = '/api/admin/brand/portrait';
        requestBody = { mediaId: asset.id };
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
      } else if (slotId.startsWith('our-work-gallery-')) {
        // Extract project ID and gallery index from slot ID (e.g., our-work-gallery-exterior-painting-001-0 -> exterior-painting-001, 0)
        const idPart = slotId.replace('our-work-gallery-', '');
        const lastHyphenIndex = idPart.lastIndexOf('-');
        const projectId = idPart.substring(0, lastHyphenIndex);
        const galleryIndex = parseInt(idPart.substring(lastHyphenIndex + 1));
        endpoint = '/api/admin/projects/gallery';
        requestBody = { projectId, galleryIndex, mediaId: asset.id };
        response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });
      } else if (slotId.includes('before') || slotId.includes('after')) {
        alert('Before/after assignment not yet implemented. Needs projects.v1.json write endpoint');
        return;
      } else {
        console.log('[DND 8] UNSUPPORTED_SLOT_TYPE', { slotId });
        return;
      }

      console.log('[DND 8] API_RESPONSE', {
        endpoint,
        status: response.status,
        ok: response.ok,
        requestBody,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('[DND 8] SLOT_ASSIGNMENT_FAILURE', {
          slotId,
          assetId: asset.id,
          status: response.status,
          error: errorText,
        });
        alert(`Assignment failed: ${response.status} - ${errorText}`);
        return;
      }

      const responseBody = await response.json();
      console.log('[DND 8] API_RESPONSE_BODY', {
        slotId,
        assetId: asset.id,
        responseBody,
      });

      console.log('[DND 8] SLOT_ASSIGNMENT_SUCCESS', {
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

  const handleDragStart = (e: React.DragEvent, asset: VisualAsset) => {
    console.log('[DND 1] DRAG_START', {
      assetId: asset.id,
      filename: asset.filename,
      projectId: asset.projectId,
      variants: Object.keys(asset.variants),
    });
    e.dataTransfer.setData('text/plain', asset.id);
    console.log('[DND 2] DATA_TRANSFER_SET', {
      types: e.dataTransfer.types,
      payload: asset.id,
    });
    e.dataTransfer.effectAllowed = 'copy';
    setState(prev => ({ ...prev, selectedAsset: asset }));
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
          <button
            onClick={loadCanonicalData}
            className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2 text-xs"
          >
            <RefreshCw size={12} />
            Reload
          </button>
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
            </div>

            {/* Media Grid */}
            <div className="grid grid-cols-3 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = state.selectedAsset?.id === asset.id;
                const isUsed = state.registeredSlots.some(s => s.currentMediaId === asset.id);
                const isDriveOnly = asset.driveId && !asset.physicalPath;
                
                return (
                  <div
                    key={asset.id}
                    draggable
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
