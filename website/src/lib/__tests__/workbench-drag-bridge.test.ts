/**
 * Tests for shared drag-session transport
 *
 * These tests verify the invariant: One iframe document = one authoritative current drag payload
 */

import { dragBridge } from '../workbench-drag-bridge';

describe('WorkbenchDragBridge - shared drag-session ownership', () => {
  beforeEach(() => {
    // Reset bridge state before each test
    dragBridge.resetBridge();
  });

  test('setDragData stores payload that getDragData can retrieve', () => {
    const dragData = {
      source: 'google-drive' as const,
      fileId: 'test-file-id',
      fileName: 'test.jpg',
      mimeType: 'image/jpeg',
    };

    dragBridge.setDragData(dragData);
    const retrieved = dragBridge.getDragData();

    expect(retrieved).toEqual(dragData);
  });

  test('clearDragData removes the payload', () => {
    const dragData = {
      source: 'local' as const,
      assetId: 'local-asset-123',
    };

    dragBridge.setDragData(dragData);
    expect(dragBridge.getDragData()).toEqual(dragData);

    dragBridge.clearDragData();
    expect(dragBridge.getDragData()).toBeNull();
  });

  test('only one drag payload exists at a time', () => {
    const firstData = {
      source: 'google-drive' as const,
      fileId: 'first-file',
      fileName: 'first.jpg',
    };

    const secondData = {
      source: 'local' as const,
      assetId: 'second-asset',
    };

    dragBridge.setDragData(firstData);
    dragBridge.setDragData(secondData);

    // Second set should replace first, not coexist
    const retrieved = dragBridge.getDragData();
    expect(retrieved).toEqual(secondData);
    expect(retrieved).not.toEqual(firstData);
  });

  test('registerBridge marks bridge as ready', () => {
    expect(dragBridge.isBridgeReady()).toBe(false);

    dragBridge.registerBridge('test-slot-1');
    expect(dragBridge.isBridgeReady()).toBe(true);
  });

  test('resetBridge clears readiness and drag data', () => {
    dragBridge.registerBridge('test-slot-1');
    dragBridge.setDragData({ source: 'local' as const, assetId: 'test' });

    expect(dragBridge.isBridgeReady()).toBe(true);
    expect(dragBridge.getDragData()).not.toBeNull();

    dragBridge.resetBridge();

    expect(dragBridge.isBridgeReady()).toBe(false);
    expect(dragBridge.getDragData()).toBeNull();
  });

  test('iframeGeneration increments on resetBridge', () => {
    const initialGen = dragBridge.getIframeGeneration();
    dragBridge.registerBridge('slot-1');

    dragBridge.resetBridge();
    const newGen = dragBridge.getIframeGeneration();

    expect(newGen).toBeGreaterThan(initialGen);
  });

  test('iframeGeneration increments on registerBridge', () => {
    const initialGen = dragBridge.getIframeGeneration();

    dragBridge.registerBridge('slot-1');
    const genAfterFirst = dragBridge.getIframeGeneration();

    dragBridge.registerBridge('slot-2');
    const genAfterSecond = dragBridge.getIframeGeneration();

    expect(genAfterFirst).toBeGreaterThan(initialGen);
    expect(genAfterSecond).toBeGreaterThan(genAfterFirst);
  });
});

describe('WorkbenchDragBridge - OurWorkClient can consume payload without VisualSlot', () => {
  beforeEach(() => {
    dragBridge.resetBridge();
  });

  test('drop handler can retrieve drag data without VisualSlot involvement', () => {
    // Simulate: parent sends DRAG_START, bridge stores it
    const dragData = {
      source: 'google-drive' as const,
      fileId: 'file-123',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
    };

    dragBridge.setDragData(dragData);

    // Simulate: OurWorkClient drop handler retrieves it
    // (VisualSlot does not need to be involved)
    const retrieved = dragBridge.getDragData();

    expect(retrieved).toEqual(dragData);
    expect(retrieved?.fileId).toBe('file-123');
  });

  test('project-section drop target can consume same payload as VisualSlot', () => {
    const dragData = {
      source: 'local' as const,
      assetId: 'asset-456',
    };

    dragBridge.setDragData(dragData);

    // Both VisualSlot and OurWorkClient should access the SAME payload
    const fromVisualSlot = dragBridge.getDragData();
    const fromOurWorkClient = dragBridge.getDragData();

    expect(fromVisualSlot).toEqual(fromOurWorkClient);
    expect(fromVisualSlot).toEqual(dragData);
  });
});

describe('WorkbenchDragBridge - stale BRIDGE_READY rejection', () => {
  beforeEach(() => {
    dragBridge.resetBridge();
  });

  test('resetBridge clears readiness, preventing stale authorization', () => {
    // Page A: register bridge
    dragBridge.registerBridge('page-a-slot');
    expect(dragBridge.isBridgeReady()).toBe(true);

    // Page A destroyed, page B loading
    dragBridge.resetBridge();

    // Page B should NOT be considered ready from page A's BRIDGE_READY
    expect(dragBridge.isBridgeReady()).toBe(false);
  });

  test('iframeGeneration change invalidates old bridge', () => {
    const gen1 = dragBridge.getIframeGeneration();
    dragBridge.registerBridge('old-page-slot');

    // Store generation after old page registration
    const oldGen = dragBridge.getIframeGeneration();

    // Simulate page navigation
    dragBridge.resetBridge();

    // New page has different generation
    const newGen = dragBridge.getIframeGeneration();
    expect(newGen).not.toBe(oldGen);
    expect(newGen).toBeGreaterThan(oldGen);
  });

  test('multiple registrations track iframe generation correctly', () => {
    dragBridge.registerBridge('slot-1');
    const gen1 = dragBridge.getIframeGeneration();

    dragBridge.registerBridge('slot-2');
    const gen2 = dragBridge.getIframeGeneration();

    // Each registration increments generation
    expect(gen2).toBeGreaterThan(gen1);

    // Reset and verify generation changes
    dragBridge.resetBridge();
    const gen3 = dragBridge.getIframeGeneration();

    expect(gen3).toBeGreaterThan(gen2);
  });
});
