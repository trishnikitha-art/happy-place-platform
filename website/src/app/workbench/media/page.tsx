/**
 * Visual Website Editor - Media Runtime Interface
 * 
 * Phase 1: Transform from file manager to visual website editor
 * - Left sidebar: Media library with thumbnail grid
 * - Center: Website canvas rendering actual homepage
 * - Right panel: Placement inspector for selected slots
 * - Drag-and-drop placement from media library to canvas slots
 * - Real-time preview updates without publish
 */

'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Layout,
  Image as ImageIcon,
  Settings,
  Eye,
  RefreshCw
} from 'lucide-react';
import { slotRegistry, SlotRegistration } from '@/lib/editor/slot-registry';
import { placementGraph } from '@/lib/editor/placement-graph';
import { commandBuilder, commandExecutor } from '@/lib/editor/command-pattern';
import { eventSystem } from '@/lib/editor/event-system';

// Dynamically import the actual homepage to avoid server component issues
const HomePage = dynamic(() => import('@/app/page'), { 
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-screen">Loading website...</div>
});

interface GraphData {
  nodes: any[];
  edges: any[];
  version: string;
  generatedAt: string;
  generatedHash: string;
}

interface HeroProjection {
  projectionId: string;
  hero: {
    heroMediaId: string;
    filename: string;
    dimensions: string;
    score: number;
  };
  generatedAt: string;
  generatedHash: string;
  inputHash: string;
}

interface GalleryProjection {
  projectionId: string;
  projects: Array<{
    projectId: string;
    galleryRepresentative: string;
    supportingGalleryEvidence: string[];
    galleryOrder: number;
    coverage: string;
  }>;
  generatedAt: string;
  generatedHash: string;
  inputHash: string;
}

interface MediaAsset {
  mediaId: string;
  filename: string;
  mimeType: string;
  dimensions: string;
  thumbnail: string;
  aiTags: string[];
  usageCount: number;
  status: 'published' | 'staged';
}

interface PlacementSlot {
  id: string;
  page: string;
  component: string;
  slotName: string;
  currentAsset: MediaAsset | null;
  status: 'empty' | 'staged' | 'published';
  constraints: {
    aspectRatio: string;
    responsive: boolean;
    focalPointEnabled: boolean;
    minWidth: number;
    compressionPreset: string;
  };
}

type EditorView = 'canvas' | 'library' | 'inspector';

export default function VisualWebsiteEditor() {
  const [activePanel, setActivePanel] = useState<EditorView>('canvas');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [heroProjection, setHeroProjection] = useState<HeroProjection | null>(null);
  const [galleryProjection, setGalleryProjection] = useState<GalleryProjection | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New state for visual editor
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<PlacementSlot | null>(null);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [placementSlots, setPlacementSlots] = useState<PlacementSlot[]>([]);
  const [editorMode, setEditorMode] = useState(false);
  
  // Keep existing state for operational capabilities
  const [harvesting, setHarvesting] = useState(false);
  const [reconciliationState, setReconciliationState] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [driveStructure, setDriveStructure] = useState<any>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string>('root');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);

  useEffect(() => {
    loadRuntime();
  }, []);

  const loadRuntime = async () => {
    try {
      setLoading(true);
      
      // Load canonical graph assets for media library
      const graphResponse = await fetch('/api/media/graph');
      if (graphResponse.ok) {
        const graphData = await graphResponse.json();
        setAssets(graphData.assets);
        
        // Transform canonical assets into media library format
        const mediaAssets: MediaAsset[] = graphData.assets.map((asset: any) => ({
          mediaId: asset.mediaId,
          filename: asset.filename,
          mimeType: asset.mimeType,
          dimensions: asset.dimensions || 'unknown',
          thumbnail: asset.variants?.web || asset.variants?.original || '/brand/logo.png',
          aiTags: asset.aiTags || [],
          usageCount: asset.usageCount || 0,
          status: asset.status || 'published'
        }));
        setMediaAssets(mediaAssets);
      }
    } catch (err) {
      console.error('Failed to load runtime:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleHarvest = async () => {
    try {
      setHarvesting(true);
      const response = await fetch('/api/drive-sync', { method: 'GET' });
      if (response.ok) {
        await loadRuntime();
      }
    } catch (err) {
      console.error('Failed to harvest:', err);
    } finally {
      setHarvesting(false);
    }
  };

  const handleOAuthClick = () => {
    window.location.href = '/api/drive/oauth/authorize';
  };

  const handleFolderClick = async (folderId: string) => {
    setCurrentFolderId(folderId);
    try {
      const response = await fetch(`/api/drive/files?folderId=${folderId}`);
      if (response.ok) {
        const data = await response.json();
        setDriveFiles(data.files);
      }
    } catch (err) {
      console.error('Failed to load Drive files:', err);
    }
  };

  const handleRegenerateRuntime = async () => {
    try {
      setRegenerating(true);
      const response = await fetch('/api/runtime/regenerate', { method: 'POST' });
      if (response.ok) {
        await loadRuntime();
      }
    } catch (err) {
      console.error('Failed to regenerate runtime:', err);
    } finally {
      setRegenerating(false);
    }
  };

  // Calculate runtime metrics from new assets structure
  const imageNodes = assets || [];
  const projectNodes: any[] = []; // TODO: Load from projects.v1.json
  const serviceNodes: any[] = []; // TODO: Load from services.v1.json
  const belongsToEdges: any[] = []; // TODO: Calculate from asset relationships
  const supportsEdges: any[] = []; // TODO: Calculate from asset relationships

  const unmappedAssets = imageNodes.filter((n: any) => {
    const hasProject = !!n.projectId;
    const hasService = !!n.serviceId;
    return !hasProject || !hasService;
  });

  const featuredCandidates = imageNodes.filter((n: any) => n.placement.includes('homepage-hero'));
  const galleryCandidates = imageNodes.filter((n: any) => n.placement.includes('homepage-gallery'));
  const beforeAfterPairs = imageNodes.filter((n: any) => n.placement.includes('before-after'));

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Visual Website Editor</h1>
        <p className="text-muted-foreground mb-6">Drag-and-drop media placement for HPP</p>
        <div className="text-center py-12 text-muted-foreground">Loading visual editor...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Layout size={24} />
              Visual Website Editor
            </h1>
            <p className="text-sm text-muted-foreground">Drag-and-drop media placement for HPP</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditorMode(!editorMode)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                editorMode 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-surface border border-border hover:bg-muted'
              }`}
            >
              <Eye size={16} />
              {editorMode ? 'Editor Mode' : 'Preview Mode'}
            </button>
            <button
              onClick={handleRegenerateRuntime}
              disabled={regenerating}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
              Publish
            </button>
          </div>
        </div>
      </div>

      {/* Main Editor Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Media Library */}
        <div className="w-80 border-r border-border bg-card flex flex-col flex-shrink-0">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <ImageIcon size={18} />
              Media Library
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Drag assets to canvas slots</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <MediaLibraryGrid 
              assets={mediaAssets}
              selectedAsset={selectedAsset}
              onSelectAsset={setSelectedAsset}
            />
          </div>
        </div>

        {/* Center - Actual Website Runtime with Editor Overlay */}
        <div className="flex-1 bg-surface overflow-auto relative">
          <div className="max-w-full">
            {/* Actual HPP Homepage */}
            <HomePageWrapper editorMode={editorMode} />
            
            {/* Editor Overlay - only visible in editor mode */}
            {editorMode && (
              <EditorOverlay 
                selectedSlot={selectedSlot}
                onSelectSlot={setSelectedSlot}
              />
            )}
          </div>
        </div>

        {/* Right Panel - Placement Inspector */}
        {selectedSlot && (
          <div className="w-80 border-l border-border bg-card flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-foreground flex items-center gap-2">
                <Settings size={18} />
                Placement Inspector
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <PlacementInspector 
                slot={selectedSlot}
                onAssetChange={(asset) => {
                  // Handle asset change for this slot
                  console.log('Asset changed for slot:', selectedSlot.id, 'to:', asset);
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Homepage Wrapper - renders actual HPP homepage
function HomePageWrapper({ editorMode }: { editorMode: boolean }) {
  return (
    <div className={editorMode ? 'pointer-events-none' : ''}>
      <HomePage />
    </div>
  );
}

// Editor Overlay - discovers and highlights editable slots using constitutional registration
function EditorOverlay({ 
  selectedSlot, 
  onSelectSlot 
}: { 
  selectedSlot: PlacementSlot | null; 
  onSelectSlot: (slot: PlacementSlot) => void;
}) {
  const [registeredSlots, setRegisteredSlots] = useState<any[]>([]);

  useEffect(() => {
    // Discover registered slots from components using constitutional law 3
    const slots = slotRegistry.getAllSlots();
    setRegisteredSlots(slots);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent, slot: SlotRegistration) => {
    e.preventDefault();
    try {
      const assetData = e.dataTransfer.getData('application/json');
      if (assetData) {
        const asset: MediaAsset = JSON.parse(assetData);
        
        // Constitutional Law 5: Placement Graph Owns Layout
        // Constitutional Law 9: Every Edit Is A Command
        const existingPlacement = placementGraph.getPlacementForSlot(slot.slotId);
        
        // Create command for asset replacement
        const command = commandBuilder.replaceAsset({
          slotId: slot.slotId,
          newAssetId: asset.mediaId
        });

        // Execute command (this will produce event and update placement graph)
        await commandExecutor.execute(command);

        // Update UI selection (this is UI-only state, not canonical)
        onSelectSlot({
          id: slot.slotId,
          page: slot.page,
          component: slot.component,
          slotName: slot.slotName,
          currentAsset: asset,
          status: 'staged',
          constraints: slot.constraints
        });
      }
    } catch (error) {
      console.error('Failed to parse dropped asset:', error);
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {registeredSlots.map((slot) => (
        <div
          key={slot.slotId}
          className={`absolute border-2 border-dashed border-primary/50 hover:border-primary bg-primary/5 cursor-pointer transition-all pointer-events-auto ${
            selectedSlot?.id === slot.slotId ? 'border-primary ring-2 ring-primary/20' : ''
          }`}
          style={getSlotPosition(slot.slotId)}
          onClick={() => onSelectSlot({
            id: slot.slotId,
            page: slot.page,
            component: slot.component,
            slotName: slot.slotName,
            currentAsset: null,
            status: 'empty',
            constraints: slot.constraints
          })}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, slot)}
        >
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center bg-white/90 p-2 rounded shadow">
              <ImageIcon size={16} className="mx-auto text-primary/70 mb-1" />
              <p className="text-xs text-primary/90">{slot.slotName}</p>
              <p className="text-xs text-primary/50">{slot.constraints.aspectRatio}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Get position for slot overlay using DOM (Constitutional Law 4: DOM is ephemeral)
function getSlotPosition(slotId: string): React.CSSProperties {
  // Use DOM queries to find actual element positions
  // DOM exists only for positioning overlays, not for truth
  if (typeof window === 'undefined') {
    return { display: 'none' };
  }

  const element = document.querySelector(`[data-slot-id="${slotId}"]`);
  if (!element) {
    return { display: 'none' };
  }

  const rect = element.getBoundingClientRect();
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height
  };
}

// Media Library Grid Component
function MediaLibraryGrid({ assets, selectedAsset, onSelectAsset }: { 
  assets: MediaAsset[]; 
  selectedAsset: MediaAsset | null; 
  onSelectAsset: (asset: MediaAsset) => void;
}) {
  const handleDragStart = (e: React.DragEvent, asset: MediaAsset) => {
    e.dataTransfer.setData('application/json', JSON.stringify(asset));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {assets.map((asset) => (
        <div
          key={asset.mediaId}
          onClick={() => onSelectAsset(asset)}
          draggable
          onDragStart={(e) => handleDragStart(e, asset)}
          className={`relative group cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
            selectedAsset?.mediaId === asset.mediaId 
              ? 'border-primary ring-2 ring-primary/20' 
              : 'border-border hover:border-primary/50'
          }`}
        >
          <div className="aspect-square bg-surface">
            <img
              src={asset.thumbnail}
              alt={asset.filename}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <p className="text-xs text-white font-medium truncate">{asset.filename}</p>
              <p className="text-xs text-white/70">{asset.dimensions}</p>
            </div>
          </div>
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              asset.status === 'published' 
                ? 'bg-green-500/20 text-green-600' 
                : 'bg-yellow-500/20 text-yellow-600'
            }`}>
              {asset.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// Placement Inspector Component
function PlacementInspector({ slot, onAssetChange }: { 
  slot: PlacementSlot; 
  onAssetChange: (asset: MediaAsset) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Slot Information */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Slot Information</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Page</span>
            <span className="text-foreground">{slot.page}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Component</span>
            <span className="text-foreground">{slot.component}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Slot</span>
            <span className="text-foreground">{slot.slotName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={`font-medium ${
              slot.status === 'published' ? 'text-green-600' : 
              slot.status === 'staged' ? 'text-yellow-600' : 'text-muted-foreground'
            }`}>
              {slot.status}
            </span>
          </div>
        </div>
      </div>

      {/* Current Asset */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Current Asset</h3>
        {slot.currentAsset ? (
          <div className="bg-surface rounded-lg p-3">
            <img 
              src={slot.currentAsset.thumbnail} 
              alt={slot.currentAsset.filename}
              className="w-full aspect-video object-cover rounded mb-2"
            />
            <p className="text-sm font-medium text-foreground">{slot.currentAsset.filename}</p>
            <p className="text-xs text-muted-foreground">{slot.currentAsset.dimensions}</p>
          </div>
        ) : (
          <div className="bg-surface rounded-lg p-6 text-center">
            <ImageIcon size={32} className="mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No asset placed</p>
          </div>
        )}
      </div>

      {/* Slot Constraints */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Slot Constraints</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Aspect Ratio</span>
            <span className="text-foreground">{slot.constraints.aspectRatio}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Responsive</span>
            <span className="text-foreground">{slot.constraints.responsive ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Focal Point</span>
            <span className="text-foreground">{slot.constraints.focalPointEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Min Width</span>
            <span className="text-foreground">{slot.constraints.minWidth}px</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Compression</span>
            <span className="text-foreground">{slot.constraints.compressionPreset}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="pt-4 border-t border-border">
        <button
          onClick={() => {
            // Handle clear placement
            console.log('Clear placement for slot:', slot.id);
          }}
          className="w-full px-4 py-2 bg-surface border border-border rounded-lg hover:bg-muted transition-colors text-sm"
        >
          Clear Placement
        </button>
      </div>
    </div>
  );
}
