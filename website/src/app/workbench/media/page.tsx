/**
 * Media Manager - Constitutional Media Runtime Interface
 * 
 * Exposes the HPP media constitutional runtime:
 * - Harvest (sync status, drive connection)
 * - Canonical Graph (unmapped assets, coverage, relationships)
 * - Projects (membership, representative, gallery, hero, before/after)
 * - Hero (current, candidates, scores)
 * - Gallery (approve, reject, order, coverage)
 * - Before/After (pairing, repair, merge, split)
 * - Metadata (editable fields)
 * - Publish (regenerate, validate, commit, deploy)
 */

'use client';

import { useState, useEffect } from 'react';
import { 
  HardDrive, 
  Database, 
  Network, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Star, 
  Crown, 
  Images, 
  Split, 
  Edit, 
  Play, 
  RefreshCw,
  Upload,
  Download,
  FileText,
  GitBranch,
  Rocket,
  Lock,
  Globe
} from 'lucide-react';

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

type RuntimePanel = 'harvest' | 'graph' | 'projects' | 'hero' | 'gallery' | 'before-after' | 'metadata' | 'publish';

export default function MediaManagerPage() {
  const [activePanel, setActivePanel] = useState<RuntimePanel>('harvest');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [heroProjection, setHeroProjection] = useState<HeroProjection | null>(null);
  const [galleryProjection, setGalleryProjection] = useState<GalleryProjection | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // New state for operational capabilities
  const [harvesting, setHarvesting] = useState(false);
  const [selectedNode, setSelectedNode] = useState<any>(null);
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
      
      // Check authentication status
      const authResponse = await fetch('/api/drive/auth/status');
      if (authResponse.ok) {
        const authData = await authResponse.json();
        setIsAuthenticated(authData.authenticated);

        // If authenticated, load Drive structure
        if (authData.authenticated) {
          const discoveryResponse = await fetch('/api/drive/discovery');
          if (discoveryResponse.ok) {
            const discoveryData = await discoveryResponse.json();
            setDriveStructure(discoveryData);
          }
        }
      }

      // Load reconciliation state
      const reconciliationResponse = await fetch('/api/media/reconciliation');
      if (reconciliationResponse.ok) {
        const reconciliationData = await reconciliationResponse.json();
        setReconciliationState(reconciliationData);
      }

      // Load canonical graph assets
      const graphResponse = await fetch('/api/media/graph');
      if (graphResponse.ok) {
        const graphData = await graphResponse.json();
        setAssets(graphData.assets);
      }

      // Load hero projection
      const heroResponse = await fetch('/api/runtime/projections/hero');
      if (heroResponse.ok) {
        const heroData = await heroResponse.json();
        setHeroProjection(heroData);
      }

      // Load gallery projection
      const galleryResponse = await fetch('/api/runtime/projections/gallery');
      if (galleryResponse.ok) {
        const galleryData = await galleryResponse.json();
        setGalleryProjection(galleryData);
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
        <h1 className="text-3xl font-bold text-foreground mb-2">Media Runtime</h1>
        <p className="text-muted-foreground mb-6">Constitutional media runtime for HPP</p>
        <div className="text-center py-12 text-muted-foreground">Loading media runtime...</div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Media Runtime</h1>
          <p className="text-muted-foreground">Constitutional media runtime for HPP</p>
        </div>
        <button
          onClick={handleRegenerateRuntime}
          disabled={regenerating}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
          Regenerate Runtime
        </button>
      </div>

      {/* Runtime Pipeline */}
      <div className="mb-6 bg-card border border-border rounded-lg p-4 flex-shrink-0">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <HardDrive size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Harvest</span>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex items-center gap-2">
            <Database size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Canonical Graph</span>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex items-center gap-2">
            <Network size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Evidence</span>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Projections</span>
          </div>
          <div className="text-muted-foreground">→</div>
          <div className="flex items-center gap-2">
            <Rocket size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Publish</span>
          </div>
        </div>
      </div>

      {/* Runtime Panels */}
      <div className="flex gap-2 mb-6 border-b border-border flex-shrink-0">
        <button
          onClick={() => setActivePanel('harvest')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'harvest' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <HardDrive size={16} className="inline mr-2" />
          Harvest
        </button>
        <button
          onClick={() => setActivePanel('graph')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'graph' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Database size={16} className="inline mr-2" />
          Canonical Graph
        </button>
        <button
          onClick={() => setActivePanel('projects')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'projects' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Network size={16} className="inline mr-2" />
          Projects
        </button>
        <button
          onClick={() => setActivePanel('hero')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'hero' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Crown size={16} className="inline mr-2" />
          Hero
        </button>
        <button
          onClick={() => setActivePanel('gallery')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'gallery' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Images size={16} className="inline mr-2" />
          Gallery
        </button>
        <button
          onClick={() => setActivePanel('before-after')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'before-after' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Split size={16} className="inline mr-2" />
          Before/After
        </button>
        <button
          onClick={() => setActivePanel('metadata')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'metadata' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Edit size={16} className="inline mr-2" />
          Metadata
        </button>
        <button
          onClick={() => setActivePanel('publish')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activePanel === 'publish' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Play size={16} className="inline mr-2" />
          Publish
        </button>
      </div>

      {/* Panel Content */}
      <div className="flex-1 min-h-0">
        {activePanel === 'harvest' && (
          <MediaRuntimeDashboard
            reconciliationState={reconciliationState}
            assets={assets}
            isAuthenticated={isAuthenticated}
            onOAuthClick={handleOAuthClick}
            driveStructure={driveStructure}
            driveFiles={driveFiles}
            onFolderClick={handleFolderClick}
          />
        )}

        {activePanel === 'graph' && (
          <GraphPanel
            graphData={graphData}
            imageNodes={imageNodes}
            projectNodes={projectNodes}
            serviceNodes={serviceNodes}
            belongsToEdges={belongsToEdges}
            supportsEdges={supportsEdges}
            unmappedAssets={unmappedAssets}
          />
        )}

        {activePanel === 'projects' && (
          <ProjectsPanel
            graphData={graphData}
            projectNodes={projectNodes}
            belongsToEdges={belongsToEdges}
          />
        )}

        {activePanel === 'hero' && (
          <HeroPanel
            heroProjection={heroProjection}
            featuredCandidates={featuredCandidates}
          />
        )}

        {activePanel === 'gallery' && (
          <GalleryPanel
            galleryProjection={galleryProjection}
            galleryCandidates={galleryCandidates}
          />
        )}

        {activePanel === 'before-after' && (
          <BeforeAfterPanel
            graphData={graphData}
            beforeAfterPairs={beforeAfterPairs}
          />
        )}

        {activePanel === 'metadata' && (
          <MetadataPanel
            graphData={graphData}
            imageNodes={imageNodes}
          />
        )}

        {activePanel === 'publish' && (
          <PublishPanel
            graphData={graphData}
            heroProjection={heroProjection}
            galleryProjection={galleryProjection}
            regenerating={regenerating}
            handleRegenerate={handleRegenerateRuntime}
          />
        )}
      </div>
    </div>
  );
}

// Media Runtime Dashboard - Shows Drive ↔ Canonical ↔ Website reconciliation
function MediaRuntimeDashboard({ reconciliationState, assets, isAuthenticated, onOAuthClick, driveStructure, driveFiles, onFolderClick }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Database size={20} />
        Media Runtime
      </h2>

      {/* OAuth Connection */}
      <div className="mb-6">
        <h3 className="font-medium text-foreground mb-3">Google Drive Connection</h3>
        {isAuthenticated ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle size={20} />
            <span className="font-medium">Connected to Google Drive</span>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-orange-600">
              <AlertCircle size={20} />
              <span className="font-medium">Not connected to Google Drive</span>
            </div>
            <button
              onClick={onOAuthClick}
              className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Lock size={16} />
              Connect Google Account
            </button>
            <p className="text-xs text-muted-foreground">
              Authenticates with PING90 Google Cloud project for persistent Drive session
            </p>
          </div>
        )}
      </div>

      {/* Drive Browser - only show when authenticated */}
      {isAuthenticated && driveStructure && (
        <div className="mb-6">
          <h3 className="font-medium text-foreground mb-3">Drive Browser</h3>
          
          {/* Quick access to discovered folders */}
          <div className="mb-4">
            <p className="text-sm text-muted-foreground mb-2">Quick Access</p>
            <div className="flex flex-wrap gap-2">
              {driveStructure.hppFolders.map((folder: any) => (
                <button
                  key={folder.id}
                  onClick={() => onFolderClick(folder.id)}
                  className="px-3 py-1.5 bg-surface border border-border rounded hover:bg-muted transition-colors text-sm"
                >
                  {folder.name}
                </button>
              ))}
            </div>
          </div>

          {/* Current folder contents */}
          {driveFiles.length > 0 && (
            <div className="bg-surface border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Name</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {driveFiles.map((file: any) => (
                    <tr key={file.id} className="border-t border-border hover:bg-muted cursor-pointer">
                      <td className="px-4 py-2">{file.name}</td>
                      <td className="px-4 py-2 capitalize">{file.mimeType?.split('/')[1] || 'File'}</td>
                      <td className="px-4 py-2">{file.size ? `${(file.size / 1024).toFixed(1)} KB` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Reconciliation State */}
      {isAuthenticated && reconciliationState && (
        <div className="mb-6">
          <h3 className="font-medium text-foreground mb-3">System Reconciliation</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Drive */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={16} className="text-blue-500" />
                <p className="text-sm font-medium text-foreground">Google Drive</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{reconciliationState.drive.totalPhotos}</p>
              <p className="text-xs text-muted-foreground">photos</p>
              <p className="text-xs text-muted-foreground mt-1">
                {reconciliationState.drive.folders} folders
              </p>
            </div>

            {/* Canonical */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Database size={16} className="text-green-500" />
                <p className="text-sm font-medium text-foreground">Canonical Graph</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{reconciliationState.canonical.totalAssets}</p>
              <p className="text-xs text-muted-foreground">assets</p>
              <p className="text-xs text-muted-foreground mt-1">
                {reconciliationState.canonical.imported} imported, {reconciliationState.canonical.new} new
              </p>
            </div>

            {/* Website */}
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Globe size={16} className="text-purple-500" />
                <p className="text-sm font-medium text-foreground">Website Runtime</p>
              </div>
              <p className="text-2xl font-bold text-foreground">{reconciliationState.website.published}</p>
              <p className="text-xs text-muted-foreground">published</p>
              <p className="text-xs text-muted-foreground mt-1">
                {reconciliationState.website.staged} staged
              </p>
            </div>
          </div>

          {/* Deltas */}
          {reconciliationState.deltas.drift > 0 && (
            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-medium text-orange-800 mb-2">Sync Required</p>
              <div className="text-xs text-orange-700 space-y-1">
                <p>• {reconciliationState.deltas.driveToCanonical} photos in Drive not in Canonical</p>
                <p>• {reconciliationState.deltas.canonicalToWebsite} assets not published to Website</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Visual Asset Explorer */}
      <div>
        <h3 className="font-medium text-foreground mb-3">Asset Explorer</h3>
        <div className="bg-surface border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
          <div className="grid grid-cols-5 gap-4">
            {assets.slice(0, 25).map((asset: any) => (
              <div key={asset.id} className="relative group cursor-pointer">
                <img
                  src={`/images/projects/${asset.projectId || 'featured'}/${asset.variantManifest.original}`}
                  alt={asset.contentHash}
                  className="w-full h-24 object-cover rounded"
                />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded flex flex-col items-center justify-center p-2">
                  <p className="text-white text-xs text-center truncate w-full">{asset.status}</p>
                  <p className="text-white text-xs text-center truncate w-full">{asset.placement.length} placements</p>
                </div>
              </div>
            ))}
          </div>
          {assets.length > 25 && (
            <p className="text-sm text-muted-foreground mt-4 text-center">
              Showing 25 of {assets.length} assets
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Graph Panel - Unmapped assets, coverage, relationships
function GraphPanel({ graphData, imageNodes, projectNodes, serviceNodes, belongsToEdges, supportsEdges, unmappedAssets }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Database size={20} />
        Canonical Graph
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Total Nodes</p>
          <p className="text-2xl font-bold text-foreground">{graphData?.nodes.length || 0}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Images</p>
          <p className="text-2xl font-bold text-foreground">{imageNodes.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Projects</p>
          <p className="text-2xl font-bold text-foreground">{projectNodes.length}</p>
        </div>
        <div className="bg-surface border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-1">Services</p>
          <p className="text-2xl font-bold text-foreground">{serviceNodes.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium text-foreground mb-3">Edge Coverage</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">belongsTo Edges</p>
              <p className="text-xl font-bold text-foreground">{belongsToEdges.length}</p>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">supports Edges</p>
              <p className="text-xl font-bold text-foreground">{supportsEdges.length}</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-medium text-foreground mb-3">Unmapped Assets ({unmappedAssets.length})</h3>
          {unmappedAssets.length > 0 ? (
            <div className="bg-surface border border-border rounded-lg p-4 max-h-64 overflow-y-auto">
              {unmappedAssets.map((node: any) => (
                <div key={node.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <p className="text-sm text-foreground">{node.data.original_filename}</p>
                  <AlertCircle className="text-orange-500" size={14} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              <p className="text-sm text-green-800">All assets mapped to projects and services</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Projects Panel - Project membership, representative, gallery, hero, before/after
function ProjectsPanel({ graphData, projectNodes, belongsToEdges }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Network size={20} />
        Projects
      </h2>
      <p className="text-muted-foreground mb-4">Project membership and media coverage</p>
      
      <div className="space-y-4">
        {projectNodes.map((project: any) => {
          const projectImages = belongsToEdges
            .filter((e: any) => e.to === project.id)
            .map((e: any) => graphData.nodes.find((n: any) => n.id === e.from));
          
          return (
            <div key={project.id} className="bg-surface border border-border rounded-lg p-4">
              <h3 className="font-medium text-foreground mb-2">{project.data.name}</h3>
              <p className="text-sm text-muted-foreground mb-3">{projectImages.length} images</p>
              <div className="grid grid-cols-4 gap-2">
                {projectImages.slice(0, 8).map((img: any) => (
                  <img
                    key={img.id}
                    src={`/images/projects/${img.data.category}/${img.data.original_filename}`}
                    alt={img.data.original_filename}
                    className="w-full h-16 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Hero Panel - Current hero, candidates, scores
function HeroPanel({ heroProjection, featuredCandidates }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Crown size={20} />
        Hero Projection
      </h2>
      
      {heroProjection && (
        <div className="mb-6 bg-surface border border-border rounded-lg p-4">
          <div className="flex gap-6">
            <img
              src={`/images/projects/featured/${heroProjection.hero.filename}`}
              alt="Current hero"
              className="w-48 h-32 object-cover rounded"
            />
            <div className="flex-1 space-y-2">
              <div><p className="text-sm text-muted-foreground">Filename</p><p className="font-medium text-foreground">{heroProjection.hero.filename}</p></div>
              <div><p className="text-sm text-muted-foreground">Score</p><div className="flex items-center gap-2"><Star className="text-yellow-500" size={14} /><p className="font-medium">{heroProjection.hero.score.toFixed(2)}</p></div></div>
              <div><p className="text-sm text-muted-foreground">Input Hash</p><p className="text-xs font-mono text-foreground">{heroProjection.inputHash}</p></div>
              <div><p className="text-sm text-muted-foreground">Generated</p><p className="text-sm text-foreground">{new Date(heroProjection.generatedAt).toLocaleString()}</p></div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h3 className="font-medium text-foreground mb-3">Hero Candidates ({featuredCandidates.length})</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {featuredCandidates.map((node: any) => (
            <div key={node.id} className="bg-surface border border-border rounded-lg p-3">
              <img
                src={`/images/projects/${node.data.category}/${node.data.original_filename}`}
                alt={node.data.original_filename}
                className="w-full h-24 object-cover rounded mb-2"
              />
              <p className="text-sm text-foreground truncate">{node.data.original_filename}</p>
              <div className="flex items-center gap-1">
                <Star className="text-yellow-500" size={12} />
                <p className="text-xs text-muted-foreground">{(node.data.overall_score || 0).toFixed(2)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Gallery Panel - Approve, reject, order, coverage
function GalleryPanel({ galleryProjection, galleryCandidates }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Images size={20} />
        Gallery Projection
      </h2>
      
      {galleryProjection && (
        <div className="space-y-4">
          {galleryProjection.projects.map((project: any) => (
            <div key={project.projectId} className="bg-surface border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-foreground">{project.projectId}</h3>
                <span className={`px-2 py-1 rounded text-xs ${
                  project.coverage === 'COMPLETE' ? 'bg-green-100 text-green-800' :
                  project.coverage === 'BEFORE_ONLY' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {project.coverage}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-2">Evidence: {project.supportingGalleryEvidence.length} images</p>
              <div className="grid grid-cols-4 gap-2">
                {project.supportingGalleryEvidence.slice(0, 8).map((filename: string) => (
                  <img
                    key={filename}
                    src={`/images/projects/${project.projectId}/${filename}`}
                    alt={filename}
                    className="w-full h-16 object-cover rounded"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Before/After Panel - Pairing, repair, merge, split
function BeforeAfterPanel({ graphData, beforeAfterPairs }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Split size={20} />
        Before/After Projection
      </h2>
      <p className="text-muted-foreground mb-4">Before/After pairing and coverage</p>
      
      <div className="space-y-4">
        {beforeAfterPairs.map((node: any) => (
          <div key={node.id} className="bg-surface border border-border rounded-lg p-4">
            <p className="font-medium text-foreground mb-2">{node.data.original_filename}</p>
            <p className="text-sm text-muted-foreground">Project: {node.data.project_id || 'Unassigned'}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// Metadata Panel - View canonical metadata
function MetadataPanel({ graphData, imageNodes }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Edit size={20} />
        Metadata Viewer
      </h2>
      <p className="text-muted-foreground mb-4">View canonical graph metadata from constitutional runtime</p>
      
      <div className="bg-surface border border-border rounded-lg p-4 max-h-96 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-2 text-left">Filename</th>
              <th className="px-4 py-2 text-left">Category</th>
              <th className="px-4 py-2 text-left">Job</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {imageNodes.map((node: any) => (
              <tr key={node.id} className="border-t border-border">
                <td className="px-4 py-2">{node.data.original_filename}</td>
                <td className="px-4 py-2">{node.data.category || 'Uncategorized'}</td>
                <td className="px-4 py-2">{node.data.job || 'Other'}</td>
                <td className="px-4 py-2">{node.data.authority_status || 'Unknown'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Publish Panel - Regenerate, validate, commit, deploy
function PublishPanel({ graphData, heroProjection, galleryProjection, regenerating, handleRegenerate }: any) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
        <Play size={20} />
        Publish HPP
      </h2>
      
      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="font-medium text-foreground mb-3">Runtime Status</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Graph</span>
              <span className="text-green-500">{graphData ? 'Generated' : 'Not generated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hero Projection</span>
              <span className="text-green-500">{heroProjection ? 'Generated' : 'Not generated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gallery Projection</span>
              <span className="text-green-500">{galleryProjection ? 'Generated' : 'Not generated'}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <RefreshCw size={16} className={regenerating ? 'animate-spin' : ''} />
          Regenerate Runtime
        </button>

        <div className="flex gap-2">
          <button className="flex-1 px-4 py-3 bg-card border border-border rounded hover:bg-accent transition-colors flex items-center justify-center gap-2">
            <GitBranch size={16} />
            Commit
          </button>
          <button className="flex-1 px-4 py-3 bg-card border border-border rounded hover:bg-accent transition-colors flex items-center justify-center gap-2">
            <Rocket size={16} />
            Deploy
          </button>
        </div>
      </div>
    </div>
  );
}
