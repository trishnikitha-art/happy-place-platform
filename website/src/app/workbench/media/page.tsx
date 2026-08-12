/**
 * Media Workbench - Semantic Website Workbench
 *
 * Purpose: Map actual website visuals to canonical media assets
 * - LEFT: Actual website components rendered in inspection mode
 * - RIGHT: Media asset management
 * - Mapping: Website element → semantic slot → canonical media ID → physical/Drive evidence
 *
 * Architecture (Option A - Shared-Component Inspection):
 * - Renders actual website components in workbench inspection mode
 * - VisualSlot components register themselves to slotRegistry
 * - Workbench consumes registry to get actual slot positions and mappings
 * - Single source of truth: website components declare their own slots
 *
 * Organization follows website navigation:
 * Home (/) → Services (/services) → Our Work (/our-work) → About (/about) → Reviews (/reviews) → Estimate (/estimate)
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, ExternalLink, Layers, CheckCircle, XCircle, AlertTriangle, Image as ImageIcon, Download } from 'lucide-react';
import { loadVisualAssetRegistry, getDriveOnlyAssets, type VisualAsset } from '@/lib/visual-asset-registry';
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
  websitePanelCollapsed: boolean;
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
    websitePanelCollapsed: false,
    registeredSlots: [],
  });

  const websitePanelRef = useRef<HTMLDivElement>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCanonicalData();
    
    // Subscribe to slot registry changes
    const unsubscribe = slotRegistry.subscribe(() => {
      setState(prev => ({ ...prev, registeredSlots: slotRegistry.getAll() }));
    });

    return () => unsubscribe();
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
      (asset.projectId && asset.projectId.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
      (asset.service && asset.service.toLowerCase().includes(state.searchQuery.toLowerCase())) ||
      asset.tags.some(tag => tag.toLowerCase().includes(state.searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const renderWebsitePage = () => {
    // Use iframe to render actual website pages with VisualSlot registration
    const url = `${window.location.origin}${state.selectedPage}`;
    return (
      <iframe
        src={url}
        className="w-full h-full border-0"
        title="Website Preview"
        sandbox="allow-same-origin allow-scripts"
      />
    );
  };

  const getSlotMedia = (slot: RegisteredSlot) => {
    if (!slot.currentMediaId) return null;
    return getMediaById(slot.currentMediaId);
  };

  const assignAssetToSlot = (asset: VisualAsset, slot: RegisteredSlot) => {
    // TODO: Implement assignment logic to update brand.v1.json or projects.v1.json
    console.log('Assign asset to slot:', asset.id, slot.id);
    
    // For now, just update local state to show selection
    setState(prev => ({ ...prev, selectedSlot: slot, selectedAsset: asset }));
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
    // Find slots that use this asset
    const usingSlots = state.registeredSlots.filter(s => s.currentMediaId === asset.id);
    if (usingSlots.length > 0) {
      setState(prev => ({ ...prev, selectedSlot: usingSlots[0] }));
    }
  };

  const handleDragOver = (e: React.DragEvent, slot: RegisteredSlot) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent, slot: RegisteredSlot) => {
    e.preventDefault();
    const assetId = e.dataTransfer.getData('text/plain');
    const asset = state.assets.find(a => a.id === assetId);
    if (asset) {
      assignAssetToSlot(asset, slot);
    }
  };

  const handleDragStart = (e: React.DragEvent, asset: VisualAsset) => {
    e.dataTransfer.setData('text/plain', asset.id);
    setState(prev => ({ ...prev, selectedAsset: asset }));
  };

  if (state.loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Media Workbench</h1>
        <p className="text-muted-foreground mb-6">Loading website and media...</p>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const currentSlots = state.registeredSlots.filter(s => s.route === state.selectedPage);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="border-b border-border bg-card px-6 py-3 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              <Layers size={20} />
              Media Workbench
            </h1>
            <p className="text-xs text-muted-foreground">
              Map website visuals to canonical media
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setState(prev => ({ ...prev, websitePanelCollapsed: !prev.websitePanelCollapsed }))}
              className="px-3 py-1.5 bg-surface border border-border rounded hover:bg-surface/80 transition-colors flex items-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              {state.websitePanelCollapsed ? 'Show Website' : 'Hide Website'}
            </button>
            <button
              onClick={loadCanonicalData}
              className="px-3 py-1.5 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2 text-sm"
            >
              <RefreshCw size={14} />
              Reload
            </button>
          </div>
        </div>
      </div>

      {/* Page Navigation */}
      <div className="border-b border-border bg-surface px-6 py-2 flex-shrink-0">
        <div className="flex gap-2">
          {(Object.keys(PAGE_LABELS) as PageRoute[]).map((route) => (
            <button
              key={route}
              onClick={() => setState(prev => ({ ...prev, selectedPage: route }))}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
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
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Website Preview */}
        {!state.websitePanelCollapsed && (
          <div 
            ref={websitePanelRef}
            className="w-1/2 border-r border-border bg-white relative"
            style={{ minHeight: 0, overflow: 'hidden' }}
          >
            {/* Iframe handles its own scrolling */}
            {renderWebsitePage()}
              
              {/* Slot highlights overlay - positioned absolutely over iframe */}
              {currentSlots.map((slot) => {
                const media = getSlotMedia(slot);
                const isSelected = state.selectedSlot?.id === slot.id;
                const hasAsset = state.selectedAsset?.id === media?.id;
                
                // Use rect from registry if available, otherwise fallback
                const rect = slot.rect;
                
                return (
                  <div
                    key={slot.id}
                    onClick={() => handleSlotClick(slot)}
                    onDragOver={(e) => handleDragOver(e, slot)}
                    onDrop={(e) => handleDrop(e, slot)}
                    className={`absolute border-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/20 z-20'
                        : hasAsset
                        ? 'border-honey bg-honey/10 z-10'
                        : 'border-primary/30 hover:border-primary/60 bg-primary/5 z-10'
                    }`}
                    style={{
                      // Position based on rect from registry
                      top: rect ? `${rect.top}px` : '10%',
                      left: rect ? `${rect.left}px` : '5%',
                      width: rect ? `${rect.width}px` : '90%',
                      height: rect ? `${rect.height}px` : '80%',
                      pointerEvents: 'auto',
                    }}
                  >
                    <div className={`absolute -top-6 left-0 px-2 py-1 rounded text-xs ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-surface text-foreground'
                    }`}>
                      {slot.section}: {slot.slotName}
                    </div>
                    {media && (
                      <div className="absolute bottom-0 right-0 p-1">
                        <CheckCircle size={16} className="text-green-500" />
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}

        {/* RIGHT: Media Asset Management */}
        <div 
          ref={mediaPanelRef}
          className="flex-1 bg-background overflow-y-auto"
          style={{ minHeight: 0 }}
        >
          <div className="p-4">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="text"
                placeholder="Search media assets..."
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Selected Slot Info */}
            {state.selectedSlot && (
              <div className="mb-4 bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{state.selectedSlot.section}</h3>
                  <span className="text-xs text-muted-foreground">{state.selectedSlot.route}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{state.selectedSlot.slotName}</p>
                <div className="flex items-center gap-2 text-xs">
                  {state.selectedSlot.currentMediaId ? (
                    <>
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-foreground">Assigned</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} className="text-red-500" />
                      <span className="text-foreground">Unassigned</span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Media Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {filteredAssets.map((asset) => {
                const isSelected = state.selectedAsset?.id === asset.id;
                const isUsedInSelectedSlot = state.selectedSlot?.currentMediaId === asset.id;
                
                return (
                  <div
                    key={asset.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, asset)}
                    onClick={() => handleAssetClick(asset)}
                    className={`border rounded-lg bg-card overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      isSelected ? 'ring-2 ring-primary' : 
                      isUsedInSelectedSlot ? 'ring-2 ring-honey' : 
                      'border-border'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-video bg-muted relative">
                      {asset.variants?.original || asset.variants?.webp ? (
                        <img
                          src={asset.variants?.original || asset.variants?.webp}
                          alt={asset.alt || asset.filename}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <ImageIcon size={24} />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-2">
                      <h4 className="font-medium text-foreground text-xs truncate" title={asset.filename}>
                        {asset.filename}
                      </h4>
                      <div className="flex items-center gap-1 mt-1">
                        {asset.physicalStatus === 'PRESENT' && (
                          <CheckCircle size={12} className="text-green-500" />
                        )}
                        {asset.physicalStatus === 'MISSING' && (
                          <XCircle size={12} className="text-red-500" />
                        )}
                        {asset.physicalStatus === 'RECOVERABLE' && (
                          <AlertTriangle size={12} className="text-amber-500" />
                        )}
                        {asset.physicalStatus === 'DRIVE_ONLY' && (
                          <ExternalLink size={12} className="text-cyan-500" />
                        )}
                        <span className="text-xs text-muted-foreground">{asset.physicalStatus}</span>
                      </div>
                      {asset.physicalStatus === 'RECOVERABLE' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // TODO: Implement recovery from Drive
                            console.log('Recover from Drive:', asset.augustDriveId);
                          }}
                          className="mt-2 w-full flex items-center justify-center gap-1 px-2 py-1 bg-honey/10 text-honey text-xs rounded hover:bg-honey/20 transition-colors"
                        >
                          <Download size={10} />
                          Recover
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                No media assets found
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
