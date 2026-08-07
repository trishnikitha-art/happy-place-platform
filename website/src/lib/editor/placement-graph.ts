/**
 * Placement Graph
 * 
 * Constitutional Law 5: Placement Graph Owns Layout
 * 
 * The placement graph is the single source of truth for all asset placements.
 * Dragging never mutates React state directly - it creates placements in the graph.
 * 
 * Graph structure:
 * Asset → Placement → Page → Component → Slot
 */

export interface Placement {
  placementId: string;
  assetId: string;
  slotId: string;
  pageId: string;
  componentId: string;
  status: 'staged' | 'published';
  createdAt: number;
  updatedAt: number;
  metadata?: {
    crop?: any;
    focalPoint?: { x: number; y: number };
    altText?: string;
    seoPriority?: number;
  };
}

export interface PlacementGraph {
  placements: Map<string, Placement>;
  version: number;
  lastModified: number;
}

class PlacementGraphManager {
  private static instance: PlacementGraphManager;
  private graph: PlacementGraph = {
    placements: new Map(),
    version: 0,
    lastModified: Date.now()
  };

  private constructor() {}

  static getInstance(): PlacementGraphManager {
    if (!PlacementGraphManager.instance) {
      PlacementGraphManager.instance = new PlacementGraphManager();
    }
    return PlacementGraphManager.instance;
  }

  /**
   * Create a new placement
   */
  createPlacement(params: {
    assetId: string;
    slotId: string;
    pageId: string;
    componentId: string;
    metadata?: Placement['metadata'];
  }): Placement {
    const placementId = `placement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();

    const placement: Placement = {
      placementId,
      assetId: params.assetId,
      slotId: params.slotId,
      pageId: params.pageId,
      componentId: params.componentId,
      status: 'staged',
      createdAt: now,
      updatedAt: now,
      metadata: params.metadata
    };

    this.graph.placements.set(placementId, placement);
    this.graph.version++;
    this.graph.lastModified = now;

    return placement;
  }

  /**
   * Get placement by ID
   */
  getPlacement(placementId: string): Placement | undefined {
    return this.graph.placements.get(placementId);
  }

  /**
   * Get placement for a specific slot
   */
  getPlacementForSlot(slotId: string): Placement | undefined {
    return Array.from(this.graph.placements.values()).find(
      p => p.slotId === slotId
    );
  }

  /**
   * Get all placements for a page
   */
  getPlacementsForPage(pageId: string): Placement[] {
    return Array.from(this.graph.placements.values()).filter(
      p => p.pageId === pageId
    );
  }

  /**
   * Get all placements for a component
   */
  getPlacementsForComponent(componentId: string): Placement[] {
    return Array.from(this.graph.placements.values()).filter(
      p => p.componentId === componentId
    );
  }

  /**
   * Get all placements for an asset
   */
  getPlacementsForAsset(assetId: string): Placement[] {
    return Array.from(this.graph.placements.values()).filter(
      p => p.assetId === assetId
    );
  }

  /**
   * Update placement
   */
  updatePlacement(placementId: string, updates: Partial<Placement>): Placement | undefined {
    const placement = this.graph.placements.get(placementId);
    if (!placement) return undefined;

    const updated = {
      ...placement,
      ...updates,
      updatedAt: Date.now()
    };

    this.graph.placements.set(placementId, updated);
    this.graph.version++;
    this.graph.lastModified = Date.now();

    return updated;
  }

  /**
   * Delete placement
   */
  deletePlacement(placementId: string): boolean {
    const deleted = this.graph.placements.delete(placementId);
    if (deleted) {
      this.graph.version++;
      this.graph.lastModified = Date.now();
    }
    return deleted;
  }

  /**
   * Move placement to different slot
   */
  movePlacement(placementId: string, newSlotId: string): Placement | undefined {
    const placement = this.graph.placements.get(placementId);
    if (!placement) return undefined;

    return this.updatePlacement(placementId, {
      slotId: newSlotId
    });
  }

  /**
   * Replace asset in placement
   */
  replaceAsset(placementId: string, newAssetId: string): Placement | undefined {
    const placement = this.graph.placements.get(placementId);
    if (!placement) return undefined;

    return this.updatePlacement(placementId, {
      assetId: newAssetId
    });
  }

  /**
   * Get all staged placements
   */
  getStagedPlacements(): Placement[] {
    return Array.from(this.graph.placements.values()).filter(
      p => p.status === 'staged'
    );
  }

  /**
   * Get all published placements
   */
  getPublishedPlacements(): Placement[] {
    return Array.from(this.graph.placements.values()).filter(
      p => p.status === 'published'
    );
  }

  /**
   * Publish all staged placements
   */
  publishStaged(): Placement[] {
    const staged = this.getStagedPlacements();
    const published: Placement[] = [];

    for (const placement of staged) {
      const updated = this.updatePlacement(placement.placementId, {
        status: 'published'
      });
      if (updated) {
        published.push(updated);
      }
    }

    return published;
  }

  /**
   * Get current graph state
   */
  getGraph(): PlacementGraph {
    return {
      placements: new Map(this.graph.placements),
      version: this.graph.version,
      lastModified: this.graph.lastModified
    };
  }

  /**
   * Load graph state (for persistence)
   */
  loadGraph(graph: PlacementGraph): void {
    this.graph = {
      placements: new Map(graph.placements),
      version: graph.version,
      lastModified: graph.lastModified
    };
  }

  /**
   * Clear all placements
   */
  clear(): void {
    this.graph.placements.clear();
    this.graph.version++;
    this.graph.lastModified = Date.now();
  }
}

export const placementGraph = PlacementGraphManager.getInstance();