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
 * Usage:
 *   import { dragBridge } from '@/lib/workbench-drag-bridge';
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
  iframeGeneration: number;
  registeredSlots: Set<string>;
}

class WorkbenchDragBridge {
  private dragData: DragData | null = null;
  private bridgeState: BridgeState = {
    isReady: false,
    iframeGeneration: 0,
    registeredSlots: new Set(),
  };

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
   * Mark the current iframe/document instance as ready to receive DRAG_START
   * Each iframe generation increments to prevent stale BRIDGE_READY from old pages
   */
  registerBridge(slotId: string): void {
    this.bridgeState.iframeGeneration++;
    this.bridgeState.registeredSlots.add(slotId);
    this.bridgeState.isReady = true;

    console.log('[DRAG_BRIDGE] REGISTER_BRIDGE', {
      slotId,
      iframeGeneration: this.bridgeState.iframeGeneration,
      registeredSlots: Array.from(this.bridgeState.registeredSlots),
      timestamp: Date.now(),
    });
  }

  /**
   * Check if the current iframe is ready to receive DRAG_START
   * Returns false if:
   * - No bridge has been registered
   * - The iframe generation has changed (page navigation)
   */
  isBridgeReady(): boolean {
    return this.bridgeState.isReady;
  }

  /**
   * Reset bridge state (called on page navigation/iframe reload)
   * Prevents stale BRIDGE_READY from authorizing DRAG_START for new iframe
   */
  resetBridge(): void {
    console.log('[DRAG_BRIDGE] RESET_BRIDGE', {
      oldGeneration: this.bridgeState.iframeGeneration,
      oldRegisteredSlots: Array.from(this.bridgeState.registeredSlots),
      timestamp: Date.now(),
    });

    this.bridgeState.iframeGeneration++;
    this.bridgeState.registeredSlots.clear();
    this.bridgeState.isReady = false;
    this.dragData = null;
  }

  /**
   * Get current iframe generation for diagnostic purposes
   */
  getIframeGeneration(): number {
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
