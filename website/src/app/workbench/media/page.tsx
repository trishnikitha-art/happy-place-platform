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

  useEffect(() => {
    loadCanonicalData();
    
    // Subscribe to slot registry changes
    const unsubscribe = slotRegistry.subscribe(() => {
      setState(prev => ({ ...prev, registeredSlots: slotRegistry.getAll() }));
    });

    // Listen for slot click events from iframe
    const handleSlotClickEvent = (event: CustomEvent) => {
      const { id } = event.detail;
      const slot = slotRegistry.get(id);
      if (slot) {
        handleSlotClick(slot);
      }
    };

    window.addEventListener('slot-click', handleSlotClickEvent as EventListener);

    // DIAGNOSTIC: Log scroll metrics for media panel
    setTimeout(() => {
      const mediaPanel = document.querySelector('section.overflow-y-auto') as HTMLElement;
      if (mediaPanel) {
        console.log('=== MEDIA PANEL SCROLL DIAGNOSTIC ===');
        console.log('scrollHeight:', mediaPanel.scrollHeight);
        console.log('clientHeight:', mediaPanel.clientHeight);
        console.log('scrollTop:', mediaPanel.scrollTop);
        console.log('computed height:', window.getComputedStyle(mediaPanel).height);
        console.log('computed overflow:', window.getComputedStyle(mediaPanel).overflow);
        console.log('computed overflow-y:', window.getComputedStyle(mediaPanel).overflowY);
        console.log('offsetHeight:', mediaPanel.offsetHeight);
        console.log('Can scroll:', mediaPanel.scrollHeight > mediaPanel.clientHeight);
      }
    }, 1000);

    return () => {
      unsubscribe();
      window.removeEventListener('slot-click', handleSlotClickEvent as EventListener);
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
    
    try {
      if (slotId === 'homepage-hero-slot' || slotId === 'about-owner-portrait-slot') {
        await fetch('/api/admin/brand/hero', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: asset.id }),
        });
      } else if (slotId === 'homepage-owner-portrait-slot') {
        await fetch('/api/admin/brand/portrait', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mediaId: asset.id }),
        });
      } else if (slotId.startsWith('service-card-slot-')) {
        alert('Service card assignment not yet implemented. Needs authority write boundary in services.v1.json');
        return;
      } else if (slotId.includes('before') || slotId.includes('after')) {
        alert('Before/after assignment not yet implemented. Needs projects.v1.json write endpoint');
        return;
      } else {
        return;
      }
      
      setState(prev => ({ ...prev, selectedSlot: slot, selectedAsset: asset }));
      loadCanonicalData();
    } catch (error) {
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
    e.dataTransfer.setData('text/plain', asset.id);
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
            src={`https://happy-place-platform.vercel.app${state.selectedPage}`}
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

            {/* Selected Slot Info */}
            {state.selectedSlot && (
              <div className="mb-4 p-3 bg-surface rounded border border-border">
                <h3 className="font-semibold text-foreground mb-1 text-sm">
                  {state.selectedSlot.page}: {state.selectedSlot.section} - {state.selectedSlot.slotName}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Drag a photo here to assign
                </p>
              </div>
            )}

            {/* Slots for current page */}
            {currentSlots.length > 0 && (
              <div className="mb-4">
                <h3 className="font-semibold text-foreground mb-2 text-sm">Website slots on this page</h3>
                <div className="space-y-1">
                  {currentSlots.map((slot) => {
                    const media = getSlotMedia(slot);
                    const isSelected = state.selectedSlot?.id === slot.id;
                    const hasAsset = state.selectedAsset?.id === media?.id;
                    
                    return (
                      <div
                        key={slot.id}
                        onClick={() => handleSlotClick(slot)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const assetId = e.dataTransfer.getData('text/plain');
                          const asset = state.assets.find(a => a.id === assetId);
                          if (asset) assignAssetToSlot(asset, slot);
                        }}
                        className={`p-2 rounded border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10'
                            : hasAsset
                            ? 'border-honey bg-honey/5'
                            : 'border-border bg-surface hover:border-border-hover'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground text-sm">{slot.slotName}</p>
                            <p className="text-xs text-muted-foreground">{slot.section}</p>
                          </div>
                          {media && (
                            <span className="text-xs text-green-600">Assigned</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

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
