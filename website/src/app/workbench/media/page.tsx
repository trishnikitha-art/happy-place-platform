/**
 * Media Workbench - Read-Only Semantic Media Dashboard v2
 * 
 * Purpose: Visual asset administration with semantic bridge to actual website
 * - Shows ALL visual assets (35 total, not just 16 reconciled)
 * - Three-panel layout: Metadata | Library | Website Preview
 * - Independent scroll zones for desktop touchpad workflow
 * - Semantic slot ↔ canonical media asset mapping
 * - Real website structure visualization
 * - Drag-and-drop slot targeting foundation
 * - Optimized desktop density for media review
 * 
 * Architecture:
 * - Uses visual-asset-registry.ts for complete asset inventory
 * - Uses website-structure.ts for route/section/slot hierarchy
 * - Reuses existing authorities (no duplication)
 * - Read-only projection of real website
 */

'use client';

import { useState, useEffect } from 'react';
import { Layout, Image as ImageIcon, RefreshCw, Search, ChevronDown, ChevronUp, ExternalLink, Globe, Layers, AlertTriangle, CheckCircle, XCircle, HelpCircle, FileQuestion, MapPin, Folder, Box } from 'lucide-react';
import { loadVisualAssetRegistry, getWebsiteVisualSlots, getEmptySlots, getAugust3RecoverableAssets, getDriveOnlyAssets, type VisualAsset } from '@/lib/visual-asset-registry';
import { getWebsiteStructure, getPageByRoute, getAllEmptySlots, type WebsitePage, type VisualSlotRef } from '@/lib/website-structure';

export default function MediaWorkbench() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState<VisualAsset[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedDetails, setExpandedDetails] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<VisualAsset | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState('/');
  const [selectedSlot, setSelectedSlot] = useState<VisualSlotRef | null>(null);
  const [draggedAsset, setDraggedAsset] = useState<VisualAsset | null>(null);

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

  const websiteStructure = getWebsiteStructure();
  const currentPage = getPageByRoute(selectedRoute);
  const emptySlots = getAllEmptySlots();
  const augustAssets = getAugust3RecoverableAssets();
  const driveOnlyAssets = getDriveOnlyAssets();

  const filteredAssets = assets.filter((asset) => {
    const matchesSearch = 
      asset.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (asset.projectId && asset.projectId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (asset.service && asset.service.toLowerCase().includes(searchQuery.toLowerCase())) ||
      asset.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesFilter = selectedFilter === 'All' ||
      (selectedFilter === 'Present+Mapped' && asset.classification === 'PRESENT_MAPPED') ||
      (selectedFilter === 'Present+Unmapped' && asset.classification === 'PRESENT_UNMAPPED') ||
      (selectedFilter === 'ReferencedMissing' && asset.classification === 'REFERENCED_MISSING') ||
      (selectedFilter === 'AugustRecoverable' && asset.classification === 'AUGUST_RECOVERABLE') ||
      (selectedFilter === 'OrphanedVariant' && asset.classification === 'ORPHANED_VARIANT') ||
      (selectedFilter === 'DriveOnly' && asset.classification === 'DRIVE_ONLY');

    return matchesSearch && matchesFilter;
  });

  const toggleDetails = (mediaId: string) => {
    setExpandedDetails(expandedDetails === mediaId ? null : mediaId);
  };

  const selectAsset = (asset: VisualAsset) => {
    setSelectedAsset(asset);
  };

  const handleDragStart = (asset: VisualAsset) => {
    setDraggedAsset(asset);
  };

  const handleDragEnd = () => {
    setDraggedAsset(null);
  };

  const handleDragOverSlot = (slot: VisualSlotRef) => {
    if (draggedAsset && slot.acceptDrop) {
      setSelectedSlot(slot);
    }
  };

  const handleDragLeaveSlot = () => {
    setSelectedSlot(null);
  };

  const getClassificationBadge = (classification: VisualAsset['classification']) => {
    const badges = {
      'PRESENT_MAPPED': { label: 'Present + Mapped', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
      'PRESENT_UNMAPPED': { label: 'Present + Unmapped', color: 'bg-blue-500/10 text-blue-500', icon: HelpCircle },
      'REFERENCED_MISSING': { label: 'Referenced Missing', color: 'bg-red-500/10 text-red-500', icon: XCircle },
      'AUGUST_RECOVERABLE': { label: 'August Recoverable', color: 'bg-amber-500/10 text-amber-500', icon: AlertTriangle },
      'DRIVE_ONLY': { label: 'Drive Only', color: 'bg-cyan-500/10 text-cyan-500', icon: ExternalLink },
      'ORPHANED_VARIANT': { label: 'Orphaned Variant', color: 'bg-purple-500/10 text-purple-500', icon: Layers },
      'UNKNOWN': { label: 'Unknown', color: 'bg-gray-500/10 text-gray-500', icon: HelpCircle },
    };
    const badge = badges[classification];
    const Icon = badge.icon;
    return (
      <span className={`text-xs ${badge.color} px-2 py-1 rounded flex items-center gap-1`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  const getPhysicalStatusBadge = (status: VisualAsset['physicalStatus']) => {
    const badges = {
      'PRESENT': { label: 'Present', color: 'bg-green-500/10 text-green-500', icon: CheckCircle },
      'MISSING': { label: 'Missing', color: 'bg-red-500/10 text-red-500', icon: XCircle },
      'RECOVERABLE': { label: 'Recoverable', color: 'bg-amber-500/10 text-amber-500', icon: AlertTriangle },
      'DRIVE_ONLY': { label: 'Drive Only', color: 'bg-cyan-500/10 text-cyan-500', icon: ExternalLink },
    };
    const badge = badges[status];
    const Icon = badge.icon;
    return (
      <span className={`text-xs ${badge.color} px-2 py-1 rounded flex items-center gap-1`}>
        <Icon size={12} />
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Media Workbench</h1>
        <p className="text-muted-foreground mb-6">Semantic media library for HPP</p>
        <div className="text-center py-12 text-muted-foreground">Loading media...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Toolbar - Fixed height, no scroll */}
      <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0 sticky top-0 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layout size={24} />
              Media Workbench
            </h1>
            <p className="text-sm text-muted-foreground">
              {assets.length} visual assets · {augustAssets.length} August recoverable · {driveOnlyAssets.length} Drive only · {emptySlots.length} empty slots
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="px-4 py-2 bg-surface border border-border rounded-lg hover:bg-surface/80 transition-colors flex items-center gap-2"
            >
              <Layers size={16} />
              {sidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
            </button>
            <button
              onClick={loadCanonicalData}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Reload
            </button>
          </div>
        </div>
      </div>

      {/* Search and Filters - Fixed height, no scroll */}
      <div className="border-b border-border bg-surface px-6 py-4 flex-shrink-0">
        <div className="flex gap-4 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
            <input
              type="text"
              placeholder="Search by filename, project, service, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="All">All ({assets.length})</option>
            <option value="Present+Mapped">Present + Mapped</option>
            <option value="Present+Unmapped">Present + Unmapped</option>
            <option value="ReferencedMissing">Referenced Missing</option>
            <option value="AugustRecoverable">August Recoverable ({augustAssets.length})</option>
            <option value="DriveOnly">Drive Only ({driveOnlyAssets.length})</option>
            <option value="OrphanedVariant">Orphaned Variant</option>
          </select>
        </div>
      </div>

      {/* Three-Panel Layout - Natural scroll */}
      <div className="flex flex-1">
        {/* Left Panel: Media Metadata - Natural scroll */}
        {sidebarOpen && (
          <div className="w-80 flex-shrink-0 border-r border-border bg-surface overflow-y-auto">
            <div className="p-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">Asset Details</h2>
              {selectedAsset ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                    {selectedAsset.variants?.original || selectedAsset.variants?.webp ? (
                      <img
                        src={selectedAsset.variants?.original || selectedAsset.variants?.webp}
                        alt={selectedAsset.alt || selectedAsset.filename}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                        <ImageIcon size={32} />
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{selectedAsset.filename}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{selectedAsset.id}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {getClassificationBadge(selectedAsset.classification)}
                    {getPhysicalStatusBadge(selectedAsset.physicalStatus)}
                  </div>
                  <div className="space-y-2 text-xs">
                    {selectedAsset.projectId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Project:</span>
                        <span className="text-foreground">{selectedAsset.projectId}</span>
                      </div>
                    )}
                    {selectedAsset.service && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="text-foreground">{selectedAsset.service}</span>
                      </div>
                    )}
                    {selectedAsset.augustDriveId && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">August Drive ID:</span>
                        <span className="text-foreground font-mono">{selectedAsset.augustDriveId}</span>
                      </div>
                    )}
                    {selectedAsset.id && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Canonical ID:</span>
                        <span className="text-foreground font-mono">{selectedAsset.id.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                  {selectedAsset.usageSlots.length > 0 && (
                    <div>
                      <span className="text-muted-foreground block mb-2 text-xs">Semantic Slots:</span>
                      <div className="space-y-1">
                        {selectedAsset.usageSlots.map(slot => (
                          <div key={slot.id} className="bg-background rounded p-2 border border-border">
                            <div className="text-xs font-mono text-primary mb-1">{slot.slotName}</div>
                            <div className="text-xs text-muted-foreground">{slot.route} → {slot.page}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  Select an asset to view details
                </div>
              )}
            </div>
          </div>
        )}

        {/* Center Panel: Media + Semantic Usage Library - Independent scroll, optimized density */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-6xl mx-auto">
            <div className="mb-3 text-sm text-muted-foreground">
              Showing {filteredAssets.length} of {assets.length} media assets
            </div>

            {/* Compact grid for desktop efficiency */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filteredAssets.map((asset) => (
                <div 
                  key={asset.id} 
                  draggable
                  onDragStart={() => handleDragStart(asset)}
                  onDragEnd={handleDragEnd}
                  className={`border rounded-lg bg-card overflow-hidden cursor-pointer transition-all hover:shadow-lg ${selectedAsset?.id === asset.id ? 'ring-2 ring-primary' : 'border-border'} ${draggedAsset?.id === asset.id ? 'opacity-50' : ''}`}
                  onClick={() => selectAsset(asset)}
                >
                  {/* Compact thumbnail */}
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

                  {/* Compact info */}
                  <div className="p-2">
                    <h3 className="font-semibold text-foreground mb-1 text-xs truncate" title={asset.filename}>{asset.filename}</h3>
                    
                    {/* Compact badges */}
                    <div className="flex flex-wrap gap-1 mb-1">
                      {getClassificationBadge(asset.classification)}
                    </div>

                    {/* Project/service indicators */}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      {asset.projectId && (
                        <span className="truncate" title={asset.projectId}>
                          <Folder size={10} className="inline mr-1" />
                          {asset.projectId.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredAssets.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No media assets found matching your search
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Website Preview with Real Structure - Natural scroll */}
        <div className="w-96 flex-shrink-0 border-l border-border bg-surface overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4 flex items-center gap-2">
              <Globe size={16} />
              Website Structure
            </h2>

            {/* Route selector */}
            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-2">Select Page:</label>
              <select
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {websiteStructure.map(page => (
                  <option key={page.route} value={page.route}>{page.title}</option>
                ))}
              </select>
            </div>

            {/* Page structure visualization */}
            {currentPage && (
              <div className="space-y-4">
                {currentPage.sections.map(section => (
                  <div key={section.id} className="bg-background rounded-lg border border-border overflow-hidden">
                    <div className="px-3 py-2 border-b border-border bg-surface-muted">
                      <div className="text-xs font-semibold text-foreground flex items-center gap-2">
                        <MapPin size={12} />
                        {section.name}
                      </div>
                      <div className="text-xs text-muted-foreground">{section.component}</div>
                    </div>
                    
                    {section.visualSlots.length > 0 ? (
                      <div className="p-2 space-y-2">
                        {section.visualSlots.map(slot => (
                          <div
                            key={slot.id}
                            onDragOver={() => handleDragOverSlot(slot)}
                            onDragLeave={handleDragLeaveSlot}
                            className={`rounded p-2 border-2 transition-all ${
                              selectedSlot?.id === slot.id 
                                ? 'border-primary bg-primary/5' 
                                : slot.status === 'EMPTY' || slot.status === 'BROKEN' || slot.status === 'RECOVERABLE'
                                  ? 'border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50'
                                  : 'border-border'
                            } ${draggedAsset && slot.acceptDrop ? 'cursor-move' : ''}`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-semibold text-foreground">{slot.name}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                slot.status === 'OCCUPIED' ? 'bg-green-500/10 text-green-500' :
                                slot.status === 'EMPTY' ? 'bg-gray-500/10 text-gray-500' :
                                slot.status === 'BROKEN' ? 'bg-red-500/10 text-red-500' :
                                'bg-amber-500/10 text-amber-500'
                              }`}>
                                {slot.status}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground mb-1">
                              {slot.currentMediaFilename || 'No media assigned'}
                            </div>
                            {draggedAsset && selectedSlot?.id === slot.id && (
                              <div className="text-xs text-primary font-semibold mt-2">
                                Drop "{draggedAsset.filename}" here
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        No visual slots in this section
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Empty slots summary */}
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <FileQuestion size={14} />
                Empty/Recoverable Slots ({emptySlots.length})
              </h3>
              <div className="space-y-2">
                {emptySlots.slice(0, 5).map(slot => (
                  <div key={slot.id} className="bg-background rounded p-2 border border-border">
                    <div className="text-xs font-semibold text-foreground">{slot.name}</div>
                    <div className="text-xs text-muted-foreground">{slot.status}</div>
                  </div>
                ))}
                {emptySlots.length > 5 && (
                  <div className="text-xs text-muted-foreground text-center pt-2">
                    +{emptySlots.length - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
