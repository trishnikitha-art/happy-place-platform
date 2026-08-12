/**
 * Media Workbench - Live Website Mapping Surface
 *
 * Purpose: Map actual website visuals to canonical media assets
 * - LEFT: Live website preview (iframe with actual rendered pages)
 * - RIGHT: Media asset management
 * - Mapping: Website element → semantic slot → canonical media ID → physical/Drive evidence
 *
 * Organization follows website scrolling order:
 * Home → Services → Our Work → About → Reviews → Estimate
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { RefreshCw, Search, ExternalLink, Layers, CheckCircle, XCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { loadVisualAssetRegistry, getDriveOnlyAssets, type VisualAsset } from '@/lib/visual-asset-registry';
import { getMediaById } from '@/lib/media';

type PageRoute = '/' | '/services' | '/our-work' | '/about';

interface WebsiteSlot {
  id: string;
  page: PageRoute;
  section: string;
  element: string;
  description: string;
  currentMediaId: string | null;
  visualElement?: string; // CSS selector or component identifier
}

// Actual website slots derived from real component structure
const WEBSITE_SLOTS: WebsiteSlot[] = [
  // Homepage
  { id: 'home-hero', page: '/', section: 'Hero', element: 'hero-background', description: 'Hero background image', currentMediaId: null },
  { id: 'home-owner-portrait', page: '/', section: 'Hero', element: 'owner-portrait', description: 'Owner portrait in hero', currentMediaId: null },
  { id: 'home-fences-card', page: '/', section: 'Services', element: 'fences-service-card', description: 'Fences service card image', currentMediaId: null },
  { id: 'home-painting-card', page: '/', section: 'Services', element: 'painting-service-card', description: 'Painting service card image', currentMediaId: null },
  { id: 'home-featured-before', page: '/', section: 'Featured Transformation', element: 'before-after-before', description: 'Featured transformation before image', currentMediaId: null },
  { id: 'home-featured-after', page: '/', section: 'Featured Transformation', element: 'before-after-after', description: 'Featured transformation after image', currentMediaId: null },
  
  // Services page
  { id: 'services-fences-card', page: '/services', section: 'Outdoor Structures', element: 'fences-service-card', description: 'Fences service card image', currentMediaId: null },
  { id: 'services-painting-card', page: '/services', section: 'Painting', element: 'painting-service-card', description: 'Painting service card image', currentMediaId: null },
  
  // Our Work page
  { id: 'our-work-featured-before', page: '/our-work', section: 'Featured Transformations', element: 'before-after-before', description: 'Featured transformation before image', currentMediaId: null },
  { id: 'our-work-featured-after', page: '/our-work', section: 'Featured Transformations', element: 'before-after-after', description: 'Featured transformation after image', currentMediaId: null },
  
  // About page
  { id: 'about-owner-portrait', page: '/about', section: 'Hero', element: 'owner-portrait', description: 'Owner portrait', currentMediaId: null },
];

export default function MediaWorkbench() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [selectedPage, setSelectedPage] = useState<PageRoute>('/');
  const [selectedSlot, setSelectedSlot] = useState<WebsiteSlot | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<VisualAsset | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [websitePanelCollapsed, setWebsitePanelCollapsed] = useState(false);
  
  const websitePanelRef = useRef<HTMLDivElement>(null);
  const mediaPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadCanonicalData();
  }, []);

  const loadCanonicalData = () => {
    try {
      setLoading(true);
      const registry = loadVisualAssetRegistry();
      setAssets(registry);
    } catch (err) {
      console.error('Failed to load canonical data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.projectId && asset.projectId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.service && asset.service.toLowerCase().includes(searchQuery.toLowerCase())) ||
      asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const renderWebsitePage = () => {
    // Use iframe to render actual website pages
    const url = `${window.location.origin}${selectedPage}`;
    return (
      <iframe
        src={url}
        className="w-full h-full border-0"
        title="Website Preview"
        sandbox="allow-same-origin allow-scripts"
      />
    );
  };

  const getSlotMedia = (slot: WebsiteSlot) => {
    if (!slot.currentMediaId) return null;
    return getMediaById(slot.currentMediaId);
  };

  const assignAssetToSlot = (asset: VisualAsset, slot: WebsiteSlot) => {
    // TODO: Implement assignment logic
    console.log('Assign asset to slot:', asset.id, slot.id);
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Media Workbench</h1>
        <p className="text-muted-foreground mb-6">Loading website and media...</p>
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      </div>
    );
  }

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
              onClick={() => setWebsitePanelCollapsed(!websitePanelCollapsed)}
              className="px-3 py-1.5 bg-surface border border-border rounded hover:bg-surface/80 transition-colors flex items-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              {websitePanelCollapsed ? 'Show Website' : 'Hide Website'}
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
          {(['/home', '/services', '/our-work', '/about'] as const).map((route) => (
            <button
              key={route}
              onClick={() => setSelectedPage(route as PageRoute)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedPage === route
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background hover:bg-surface'
              }`}
            >
              {route === '/home' ? 'Home' : route.slice(1).charAt(0).toUpperCase() + route.slice(2)}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Two Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Website Preview */}
        {!websitePanelCollapsed && (
          <div 
            ref={websitePanelRef}
            className="w-1/2 border-r border-border bg-white overflow-y-auto"
            style={{ minHeight: 0 }}
          >
            <div className="relative">
              {/* Page overlay with slot indicators */}
              <div className="relative">
                {renderWebsitePage()}
                
                {/* Slot highlights overlay */}
                {WEBSITE_SLOTS.filter(s => s.page === selectedPage).map((slot) => (
                  <div
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    className={`absolute border-2 cursor-pointer transition-all ${
                      selectedSlot?.id === slot.id
                        ? 'border-primary bg-primary/10'
                        : 'border-primary/30 hover:border-primary/60 bg-primary/5'
                    }`}
                    style={{
                      // TODO: Map actual DOM positions to these overlays
                      top: '10%',
                      left: '5%',
                      width: '90%',
                      height: '80%',
                      pointerEvents: 'auto',
                    }}
                  >
                    <div className="absolute -top-6 left-0 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                      {slot.section}: {slot.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            </div>

            {/* Selected Slot Info */}
            {selectedSlot && (
              <div className="mb-4 bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-foreground text-sm">{selectedSlot.section}</h3>
                  <span className="text-xs text-muted-foreground">{selectedSlot.page}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{selectedSlot.description}</p>
                <div className="flex items-center gap-2 text-xs">
                  {selectedSlot.currentMediaId ? (
                    <>
                      <CheckCircle size={14} className="text-green-500" />
                      <span className="text-foreground">Assigned: {selectedSlot.currentMediaId.slice(0, 8)}...</span>
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
              {filteredAssets.map((asset) => (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={() => setSelectedAsset(asset)}
                  onClick={() => setSelectedAsset(asset)}
                  className={`border rounded-lg bg-card overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                    selectedAsset?.id === asset.id ? 'ring-2 ring-primary' : 'border-border'
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
                  </div>
                </div>
              ))}
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
