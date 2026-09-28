/**
 * Shared drag-session transport for iframe ↔ Workbench communication
 *
 * Invariant: One iframe document = one authoritative current drag payload
 *
 * This module provides a singleton drag session that all components within
 * the iframe (VisualSlot, OurWorkClient, etc.) share. This eliminates the
 * bug where VisualSlot and OurWorkClient each maintained their own
 * bridgedDragDataRef, causing drops on non-VisualSlot targets to fail.
 *
 * Generation ownership: Parent owns the generation and sends it via BRIDGE_INIT.
 * The iframe initializes with that parent-issued generation. Components register
 * against that existing generation (no per-slot incrementing).
 *
 * Usage:
 *   import { dragBridge } from '@/lib/workbench-drag-bridge';
 *   dragBridge.initialize(parentGeneration); // Called once per iframe load
 *   dragBridge.registerSlot(slotId); // Components register against existing generation
 *   dragBridge.setDragData({ source: 'google-drive', fileId: '...', ... });
 *   const data = dragBridge.getDragData();
 *   dragBridge.clearDragData();
 */

interface DragData {
  source: 'google-drive' | 'local' | 'drive';
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  assetId?: string;
  [key: string]: any;
}

interface BridgeState {
  isReady: boolean;
  iframeGeneration: number | null; // Parent-issued generation, null until initialized
  registeredSlots: Set<string>;
}

class WorkbenchDragBridge {
  private dragData: DragData | null = null;
  private bridgeState: BridgeState = {
    isReady: false,
    iframeGeneration: null,
    registeredSlots: new Set(),
  };

  /**
   * Initialize the bridge with parent-issued generation
   * Called once per iframe load when parent sends BRIDGE_INIT
   */
  initialize(generation: number): void {
    console.log('[DRAG_BRIDGE] INITIALIZE', {
      generation,
      oldGeneration: this.bridgeState.iframeGeneration,
      timestamp: Date.now(),
    });

    this.bridgeState.iframeGeneration = generation;
    this.bridgeState.registeredSlots.clear();
    this.bridgeState.isReady = false;
    this.dragData = null;
  }

  /**
   * Register a slot against the current iframe generation
   * Does NOT increment generation - generation is owned by parent
   */
  registerSlot(slotId: string): void {
    if (this.bridgeState.iframeGeneration === null) {
      console.error('[DRAG_BRIDGE] REGISTER_SLOT_BEFORE_INIT', {
        slotId,
        error: 'Bridge not initialized with parent generation',
      });
      return; // Don't mark as ready if not initialized
    }

    this.bridgeState.registeredSlots.add(slotId);
    this.bridgeState.isReady = true;

    console.log('[DRAG_BRIDGE] REGISTER_SLOT', {
      slotId,
      iframeGeneration: this.bridgeState.iframeGeneration,
      registeredSlots: Array.from(this.bridgeState.registeredSlots),
      timestamp: Date.now(),
    });
  }

  /**
   * Set the current drag payload from parent DRAG_START message
   * Only one drag payload exists per iframe document
   */
  setDragData(data: DragData): void {
    console.log('[DRAG_BRIDGE] SET_DRAG_DATA', {
      source: data.source,
      fileId: data.fileId || data.assetId,
      iframeGeneration: this.bridgeState.iframeGeneration,
      timestamp: Date.now(),
    });
    this.dragData = data;
  }

  /**
   * Get the current drag payload
   * Returns null if no drag session is active
   */
  getDragData(): DragData | null {
    return this.dragData;
  }

  /**
   * Clear the current drag payload
   * Called after successful drop or explicit cancellation
   */
  clearDragData(): void {
    console.log('[DRAG_BRIDGE] CLEAR_DRAG_DATA', {
      hadData: !!this.dragData,
      iframeGeneration: this.bridgeState.iframeGeneration,
      timestamp: Date.now(),
    });
    this.dragData = null;
  }

  /**
   * Check if the current iframe is ready to receive DRAG_START
   * Returns false if:
   * - No bridge has been initialized
   * - No slots have registered
   */
  isBridgeReady(): boolean {
    return this.bridgeState.isReady && this.bridgeState.iframeGeneration !== null;
  }

  /**
   * Get current iframe generation (parent-issued)
   */
  getIframeGeneration(): number | null {
    return this.bridgeState.iframeGeneration;
  }

  /**
   * Diagnostic: log current bridge state
   */
  logState(): void {
    console.log('[DRAG_BRIDGE] STATE', {
      hasDragData: !!this.dragData,
      dragDataSource: this.dragData?.source,
      isReady: this.bridgeState.isReady,
      iframeGeneration: this.bridgeState.iframeGeneration,
      registeredSlots: Array.from(this.bridgeState.registeredSlots),
      timestamp: Date.now(),
    });
  }
}

// Singleton instance shared across all components in the iframe
export const dragBridge = new WorkbenchDragBridge();
