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
 * 
 * Constitutional changes:
 * - Uses array instead of Map for canonical state (deterministic ordering)
 * - No arbitrary mutation methods (only event-driven updates)
 * - No wall-clock in canonical state (sequence-based ordering)
 * - Enforces slot cardinality constraints
 * - Uses proper canonical types (no 'any')
 */

import { CropRegion, FocalPoint, SlotConstraints } from './command-pattern';

export interface Placement {
  placementId: string;
  assetId: string;
  slotId: string;
  pageId: string;
  componentId: string;
  status: 'staged' | 'published';
  sequence: number;
  metadata?: {
    crop?: CropRegion;
    focalPoint?: FocalPoint;
    altText?: string;
    seoPriority?: number;
  };
}

export interface PlacementGraph {
  placements: Placement[];
  version: number;
}

class PlacementGraphManager {
  private static instance: PlacementGraphManager;
  private graph: PlacementGraph = {
    placements: [],
    version: 0
  };
  private sequence = 0;

  private constructor() {}

  static getInstance(): PlacementGraphManager {
    if (!PlacementGraphManager.instance) {
      PlacementGraphManager.instance = new PlacementGraphManager();
    }
    return PlacementGraphManager.instance;
  }

  private nextSequence(): number {
    return ++this.sequence;
  }

  /**
   * Create a new placement (event-driven only)
   * Enforces slot cardinality: one active placement per slot
   */
  createPlacement(params: {
    assetId: string;
    slotId: string;
    pageId: string;
    componentId: string;
    metadata?: Placement['metadata'];
  }): Placement {
    // Enforce slot cardinality constraint
    const existingPlacement = this.getPlacementForSlot(params.slotId);
    if (existingPlacement) {
      throw new Error(`Slot ${params.slotId} already has an active placement. Delete or move existing placement first.`);
    }

    const placementId = `placement_${this.nextSequence()}`;
    const sequence = this.sequence;

    const placement: Placement = {
      placementId,
      assetId: params.assetId,
      slotId: params.slotId,
      pageId: params.pageId,
      componentId: params.componentId,
      status: 'staged',
      sequence,
      metadata: params.metadata
    };

    this.graph.placements.push(placement);
    this.graph.version++;

    return placement;
  }

  /**
   * Get placement by ID
   */
  getPlacement(placementId: string): Placement | undefined {
    return this.graph.placements.find(p => p.placementId === placementId);
  }

  /**
   * Get placement for a specific slot
   * Enforces cardinality-one constraint
   */
  getPlacementForSlot(slotId: string): Placement | undefined {
    const placements = this.graph.placements.filter(p => p.slotId === slotId);
    if (placements.length > 1) {
      console.warn(`Multiple placements found for slot ${slotId}, returning first`);
    }
    return placements[0];
  }

  /**
   * Get all placements for a page
   */
  getPlacementsForPage(pageId: string): Placement[] {
    return this.graph.placements.filter(p => p.pageId === pageId);
  }

  /**
   * Get all placements for a component
   */
  getPlacementsForComponent(componentId: string): Placement[] {
    return this.graph.placements.filter(p => p.componentId === componentId);
  }

  /**
   * Get all placements for an asset
   */
  getPlacementsForAsset(assetId: string): Placement[] {
    return this.graph.placements.filter(p => p.assetId === assetId);
  }

  /**
   * Delete placement (event-driven only)
   */
  deletePlacement(placementId: string): boolean {
    const index = this.graph.placements.findIndex(p => p.placementId === placementId);
    if (index === -1) return false;

    this.graph.placements.splice(index, 1);
    this.graph.version++;

    return true;
  }

  /**
   * Move placement to different slot (event-driven only)
   */
  movePlacement(placementId: string, newSlotId: string): Placement | undefined {
    const placement = this.getPlacement(placementId);
    if (!placement) return undefined;

    // Enforce slot cardinality constraint
    const existingPlacement = this.getPlacementForSlot(newSlotId);
    if (existingPlacement && existingPlacement.placementId !== placementId) {
      throw new Error(`Target slot ${newSlotId} already has an active placement`);
    }

    const updated: Placement = {
      ...placement,
      slotId: newSlotId,
      sequence: this.nextSequence()
    };

    const index = this.graph.placements.findIndex(p => p.placementId === placementId);
    if (index !== -1) {
      this.graph.placements[index] = updated;
      this.graph.version++;
    }

    return updated;
  }

  /**
   * Replace asset in placement (event-driven only)
   */
  replaceAsset(placementId: string, newAssetId: string): Placement | undefined {
    const placement = this.getPlacement(placementId);
    if (!placement) return undefined;

    const updated: Placement = {
      ...placement,
      assetId: newAssetId,
      sequence: this.nextSequence()
    };

    const index = this.graph.placements.findIndex(p => p.placementId === placementId);
    if (index !== -1) {
      this.graph.placements[index] = updated;
      this.graph.version++;
    }

    return updated;
  }

  /**
   * Get all staged placements
   */
  getStagedPlacements(): Placement[] {
    return this.graph.placements.filter(p => p.status === 'staged');
  }

  /**
   * Get all published placements
   */
  getPublishedPlacements(): Placement[] {
    return this.graph.placements.filter(p => p.status === 'published');
  }

  /**
   * Publish all staged placements (event-driven only)
   * This should be called by PublishStaged event handler
   */
  publishStaged(): Placement[] {
    const published: Placement[] = [];

    for (let i = 0; i < this.graph.placements.length; i++) {
      const placement = this.graph.placements[i];
      if (placement.status === 'staged') {
        this.graph.placements[i] = {
          ...placement,
          status: 'published',
          sequence: this.nextSequence()
        };
        published.push(this.graph.placements[i]);
      }
    }

    if (published.length > 0) {
      this.graph.version++;
    }

    return published;
  }

  /**
   * Get current graph state
   */
  getGraph(): PlacementGraph {
    return {
      placements: [...this.graph.placements],
      version: this.graph.version
    };
  }

  /**
   * Load graph state (for persistence/replay)
   */
  loadGraph(graph: PlacementGraph): void {
    this.graph = {
      placements: [...graph.placements],
      version: graph.version
    };
  }

  /**
   * Clear all placements
   */
  clear(): void {
    this.graph.placements = [];
    this.graph.version++;
  }
}

export const placementGraph = PlacementGraphManager.getInstance();