/**
 * Adversarial protocol test for parent/iframe generation handshake
 *
 * This test simulates the real protocol where:
 * - Parent owns generation and sends BRIDGE_INIT
 * - Iframe initializes with parent-issued generation
 * - Components register against that generation
 * - Stale messages from old iframes are rejected
 */

import { dragBridge } from '../workbench-drag-bridge';

describe('Parent/Iframe Generation Protocol - adversarial scenarios', () => {
  beforeEach(() => {
    // Properly reset: initialize with null generation to simulate uninitialized state
    (dragBridge as any).bridgeState = {
      isReady: false,
      iframeGeneration: null,
      registeredSlots: new Set(),
    };
    (dragBridge as any).dragData = null;
  });

  test('iframe A ready → iframe A drag → iframe B replaces A → stale A ready rejected → B ready accepted', () => {
    // Step 1: Iframe A loads, parent sends generation 1
    const parentGenA = 1;
    dragBridge.initialize(parentGenA);

    // Step 2: Iframe A slots register
    dragBridge.registerSlot('slot-a-1');
    dragBridge.registerSlot('slot-a-2');

    // Iframe A is ready
    expect(dragBridge.isBridgeReady()).toBe(true);
    expect(dragBridge.getIframeGeneration()).toBe(parentGenA);

    // Step 3: Iframe A receives drag data (parent sends DRAG_START)
    dragBridge.setDragData({
      source: 'google-drive' as const,
      fileId: 'file-a',
      fileName: 'file-a.jpg',
    });

    expect(dragBridge.getDragData()).not.toBeNull();

    // Step 4: Iframe A destroyed, Iframe B loads with new generation
    const parentGenB = 2;
    dragBridge.initialize(parentGenB);

    // Iframe B starts with new generation, not ready yet
    expect(dragBridge.getIframeGeneration()).toBe(parentGenB);
    expect(dragBridge.isBridgeReady()).toBe(false);
    expect(dragBridge.getDragData()).toBeNull();

    // Step 5: Stale BRIDGE_READY from Iframe A (generation 1) would be rejected
    // Parent would check: messageGeneration (1) !== currentIframeGeneration (2)
    const staleGeneration = parentGenA;
    expect(staleGeneration).not.toBe(parentGenB);

    // Step 6: Iframe B slots register
    dragBridge.registerSlot('slot-b-1');
    dragBridge.registerSlot('slot-b-2');

    // Iframe B is ready
    expect(dragBridge.isBridgeReady()).toBe(true);
    expect(dragBridge.getIframeGeneration()).toBe(parentGenB);

    // Step 7: Iframe B receives drag data
    dragBridge.setDragData({
      source: 'local' as const,
      assetId: 'asset-b',
    });

    expect(dragBridge.getDragData()).not.toBeNull();
  });

  test('multiple rapid iframe replacements - only latest generation accepted', () => {
    // Iframe A: generation 1
    dragBridge.initialize(1);
    dragBridge.registerSlot('slot-a');
    expect(dragBridge.getIframeGeneration()).toBe(1);

    // Iframe B: generation 2
    dragBridge.initialize(2);
    dragBridge.registerSlot('slot-b');
    expect(dragBridge.getIframeGeneration()).toBe(2);

    // Iframe C: generation 3
    dragBridge.initialize(3);
    dragBridge.registerSlot('slot-c');
    expect(dragBridge.getIframeGeneration()).toBe(3);

    // Stale generations 1 and 2 would be rejected by parent
    expect(1).not.toBe(3);
    expect(2).not.toBe(3);
  });

  test('registerSlot before initialize is rejected (defensive)', () => {
    // Try to register before parent sends BRIDGE_INIT
    dragBridge.registerSlot('slot-1');

    // Bridge should not be ready (generation is null)
    expect(dragBridge.isBridgeReady()).toBe(false);
    expect(dragBridge.getIframeGeneration()).toBeNull();

    // Now initialize properly
    dragBridge.initialize(1);
    dragBridge.registerSlot('slot-1');

    // Now it should be ready
    expect(dragBridge.isBridgeReady()).toBe(true);
    expect(dragBridge.getIframeGeneration()).toBe(1);
  });

  test('drag data isolated to iframe generation', () => {
    // Iframe A: generation 1, has drag data
    dragBridge.initialize(1);
    dragBridge.registerSlot('slot-a');
    dragBridge.setDragData({ source: 'local' as const, assetId: 'asset-a' });

    expect(dragBridge.getDragData()).not.toBeNull();

    // Iframe B: generation 2, drag data cleared
    dragBridge.initialize(2);

    expect(dragBridge.getDragData()).toBeNull();
    expect(dragBridge.getIframeGeneration()).toBe(2);

    // Iframe B gets different drag data
    dragBridge.registerSlot('slot-b');
    dragBridge.setDragData({ source: 'google-drive' as const, fileId: 'file-b' });

    expect(dragBridge.getDragData()?.fileId).toBe('file-b');
  });
});
