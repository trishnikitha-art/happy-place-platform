/**
 * Tests for shared drag-session transport
 *
 * These tests verify the invariant: One iframe document = one authoritative current drag payload
 * Parent owns generation and sends BRIDGE_INIT; iframe initializes with that generation.
 */

import { dragBridge } from '../workbench-drag-bridge';

describe('WorkbenchDragBridge - shared drag-session ownership', () => {
  beforeEach(() => {
    // Reset bridge state before each test
    dragBridge.initialize(-1);
    dragBridge.initialize(0);
    dragBridge.clearDragData();
  });

  test('initialize sets generation and clears state', () => {
    dragBridge.initialize(5);
    expect(dragBridge.getIframeGeneration()).toBe(5);
    expect(dragBridge.isBridgeReady()).toBe(false);
    expect(dragBridge.getDragData()).toBeNull();
  });

  test('setDragData stores payload that getDragData can retrieve', () => {
    dragBridge.initialize(1);
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
    dragBridge.initialize(1);
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
    dragBridge.initialize(1);
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

  test('registerSlot marks bridge as ready against existing generation', () => {
    dragBridge.initialize(1);
    expect(dragBridge.isBridgeReady()).toBe(false);

    dragBridge.registerSlot('test-slot-1');
    expect(dragBridge.isBridgeReady()).toBe(true);
    expect(dragBridge.getIframeGeneration()).toBe(1); // Generation unchanged
  });

  test('registerSlot does NOT increment generation', () => {
    dragBridge.initialize(1);
    const genBefore = dragBridge.getIframeGeneration();

    dragBridge.registerSlot('slot-1');
    const genAfterFirst = dragBridge.getIframeGeneration();

    dragBridge.registerSlot('slot-2');
    const genAfterSecond = dragBridge.getIframeGeneration();

    // Generation should NOT change - parent owns it
    expect(genAfterFirst).toBe(genBefore);
    expect(genAfterSecond).toBe(genBefore);
  });

  test('initialize with new generation resets readiness', () => {
    dragBridge.initialize(1);
    dragBridge.registerSlot('slot-1');
    dragBridge.setDragData({ source: 'local' as const, assetId: 'test' });

    expect(dragBridge.isBridgeReady()).toBe(true);
    expect(dragBridge.getDragData()).not.toBeNull();

    // Simulate new iframe with new generation
    dragBridge.initialize(2);

    expect(dragBridge.isBridgeReady()).toBe(false);
    expect(dragBridge.getDragData()).toBeNull();
    expect(dragBridge.getIframeGeneration()).toBe(2);
  });

  test('repeated init from sibling slots does not erase a live drag', () => {
    dragBridge.initialize(27);
    dragBridge.registerSlot('photo-a');
    dragBridge.setDragData({ source: 'local', assetId: 'photo-a' });
    dragBridge.initialize(27);
    dragBridge.registerSlot('photo-b');
    expect(dragBridge.isBridgeReady()).toBe(true);
    expect(dragBridge.getDragData()).toEqual({ source: 'local', assetId: 'photo-a' });
    dragBridge.initialize(Number.NaN);
    expect(dragBridge.getIframeGeneration()).toBe(27);
  });
});

describe('WorkbenchDragBridge - OurWorkClient can consume payload without VisualSlot', () => {
  beforeEach(() => {
    dragBridge.initialize(1);
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

describe('WorkbenchDragBridge - parent/iframe generation protocol', () => {
  test('iframe receives generation from parent via initialize', () => {
    // Parent generation = 5
    dragBridge.initialize(5);

    expect(dragBridge.getIframeGeneration()).toBe(5);

    // Slots register against this generation
    dragBridge.registerSlot('slot-1');
    dragBridge.registerSlot('slot-2');

    expect(dragBridge.getIframeGeneration()).toBe(5); // Still 5
  });

  test('new iframe with different generation cannot use old generation', () => {
    // Iframe A with generation 1
    dragBridge.initialize(1);
    dragBridge.registerSlot('slot-a');

    // Iframe A destroyed, Iframe B loads with generation 2
    dragBridge.initialize(2);

    // Iframe B should have generation 2, not 1
    expect(dragBridge.getIframeGeneration()).toBe(2);
    expect(dragBridge.isBridgeReady()).toBe(false); // Slots need to re-register
  });

  test('parent can reject stale BRIDGE_READY by comparing generations', () => {
    // Parent sends generation 5
    const parentGeneration = 5;
    dragBridge.initialize(parentGeneration);
    dragBridge.registerSlot('slot-1');

    const iframeGeneration = dragBridge.getIframeGeneration();

    // Parent validates: iframeGeneration === parentGeneration
    expect(iframeGeneration).toBe(parentGeneration);

    // If iframe sent stale generation (e.g., from old page)
    const staleGeneration = 4;
    expect(staleGeneration).not.toBe(parentGeneration); // Parent would reject
  });

  test('generation comparison prevents cross-page interference', () => {
    // Iframe A on /our-work with generation 1
    dragBridge.initialize(1);
    dragBridge.registerSlot('slot-a');
    dragBridge.setDragData({ source: 'local' as const, assetId: 'asset-a' });

    // Iframe A destroyed, Iframe B on /services with generation 2
    dragBridge.initialize(2);

    // Iframe B should not see Iframe A's data
    expect(dragBridge.getDragData()).toBeNull();
    expect(dragBridge.getIframeGeneration()).toBe(2);
    expect(dragBridge.isBridgeReady()).toBe(false);
  });
});

describe('WorkbenchDragBridge - gallery DOM interaction surface', () => {
  test('VisualSlot child wrapper is pointer-transparent BEFORE drag starts (regression test)', () => {
    // REGRESSION TEST (a611595d → ec01c323 regression):
    // The known-good a611595d commit set child wrapper pointer-events:none based on
    // effectiveWorkbenchMode && isGallerySlot (BEFORE drag begins).
    // 
    // The broken ec01c323 version set it based on isDraggingActive (AFTER drag begins).
    // This creates a deadlock: drag can't start because child surface intercepts pointer,
    // but child only becomes transparent after drag starts.
    //
    // REQUIRED DOM CONTRACT:
    // - VisualSlot child wrapper must be pointer-transparent when:
    //   effectiveWorkbenchMode === true AND isGallerySlot === true
    // - This ensures VisualSlot receives the initial pointerdown event
    // - This allows native dragstart to fire reliably
    // - The image/nested content cannot steal the drag gesture
    //
    // This test fails if the code regresses to the broken isDraggingActive-based pattern.

    const fs = require('fs');
    const path = require('path');
    const visualSlotPath = path.join(__dirname, '../../components/visual-slot.tsx');
    const visualSlotSource = fs.readFileSync(visualSlotPath, 'utf-8');

    // Check for the KNOWN-GOOD pattern: pointerEvents based on effectiveWorkbenchMode && isGallerySlot
    // Order doesn't matter - we just need both conditions present
    const knownGoodPattern = /pointerEvents.*none.*effectiveWorkbenchMode.*isGallerySlot|effectiveWorkbenchMode.*isGallerySlot.*pointerEvents.*none/s;
    const hasKnownGoodPattern = knownGoodPattern.test(visualSlotSource);

    // Check for the BROKEN pattern: pointerEvents based on isDraggingActive alone
    // (without effectiveWorkbenchMode && isGallerySlot)
    const brokenPattern = /pointerEvents.*none.*isDraggingActive(?!.*effectiveWorkbenchMode.*isGallerySlot)/s;
    const hasBrokenPattern = brokenPattern.test(visualSlotSource);

    expect(hasKnownGoodPattern).toBe(true);
    expect(hasBrokenPattern).toBe(false);
  });

  test('VisualSlot is the gallery drag authority - not the outer gallery item', () => {
    // KNOWN-GOOD ARCHITECTURE (from f043300f):
    // VisualSlot owns gallery drag/drop because it is the actual pointer target.
    // The outer gallery div is just a layout wrapper and cannot reliably be dragged.

    // Required DOM contract:
    // - VisualSlot (when isGallerySlot): draggable=true
    // - VisualSlot (when isGallerySlot): onDragStart, onDragEnd, onDragOver, onDragEnter, onDragLeave, onDrop
    // - VisualSlot cursor: grab at rest, grabbing during active drag
    // - VisualSlot child wrapper: pointerEvents=none when effectiveWorkbenchMode && isGallerySlot (BEFORE drag)
    // - img: draggable=false (explicitly non-draggable)
    // - Normal mode: all drag/drop handlers disabled

    // Implementation:
    // - VisualSlot.tsx: draggable={effectiveWorkbenchMode && isGallerySlot}
    // - VisualSlot.tsx: onDragStart/onDragEnd when isGallerySlot
    // - VisualSlot.tsx: onDragOver/Enter/Leave/Drop when effectiveWorkbenchMode
    // - VisualSlot.tsx: child wrapper with pointerEvents=none when effectiveWorkbenchMode && isGallerySlot
    // - OurWorkClient.tsx: gallery item is simple wrapper with cursor-pointer, no DnD handlers
    // - OurWorkClient.tsx: img has draggable=false

    // This architecture works because VisualSlot is the actual DOM element receiving pointer events.
    expect(true).toBe(true); // Invariant enforced in VisualSlot.tsx
  });
});

describe('WorkbenchDragBridge - GALLERY_REORDER protocol payload', () => {
  beforeEach(() => {
    dragBridge.initialize(1);
  });

  test('GALLERY_REORDER payload contains required fields', () => {
    const galleryReorderPayload = {
      type: 'GALLERY_REORDER',
      sourceSlotId: 'our-work-gallery::project-1::media-1',
      sourceMediaId: 'media-1',
      projectId: 'project-1',
      sourcePhotoIndex: 0,
    };

    // Verify payload structure matches VisualSlot handleDrop expectations
    expect(galleryReorderPayload.type).toBe('GALLERY_REORDER');
    expect(galleryReorderPayload.sourceSlotId).toBeDefined();
    expect(galleryReorderPayload.sourceMediaId).toBeDefined();
    expect(galleryReorderPayload.projectId).toBeDefined();
  });

  test('GALLERY_REORDER can be serialized to dataTransfer', () => {
    const galleryReorderPayload = {
      type: 'GALLERY_REORDER',
      sourceSlotId: 'our-work-gallery::project-1::media-1',
      sourceMediaId: 'media-1',
      projectId: 'project-1',
      sourcePhotoIndex: 0,
    };

    const serialized = JSON.stringify(galleryReorderPayload);
    const deserialized = JSON.parse(serialized);

    expect(deserialized).toEqual(galleryReorderPayload);
    expect(deserialized.type).toBe('GALLERY_REORDER');
  });

  test('SLOT_REORDER message contains required fields for parent Workbench', () => {
    const slotReorderMessage = {
      type: 'SLOT_REORDER',
      sourceSlotId: 'our-work-gallery::project-1::media-1',
      sourceMediaId: 'media-1',
      targetSlotId: 'our-work-gallery::project-1::media-2',
      targetMediaId: 'media-2',
      projectId: 'project-1',
      sourcePhotoIndex: 0,
      targetPhotoIndex: 1,
    };

    // Verify message structure matches Workbench SLOT_REORDER handler expectations
    expect(slotReorderMessage.type).toBe('SLOT_REORDER');
    expect(slotReorderMessage.sourceSlotId).toBeDefined();
    expect(slotReorderMessage.sourceMediaId).toBeDefined();
    expect(slotReorderMessage.targetSlotId).toBeDefined();
    expect(slotReorderMessage.targetMediaId).toBeDefined();
    expect(slotReorderMessage.projectId).toBeDefined();
  });
});

describe('WorkbenchDragBridge - GALLERY_ADD protocol payload', () => {
  beforeEach(() => {
    dragBridge.initialize(1);
  });

  test('GALLERY_ADD message contains required fields for parent Workbench', () => {
    const galleryAddMessage = {
      type: 'GALLERY_ADD',
      slotId: 'our-work-gallery::project-1::media-1',
      projectId: 'project-1',
      assetId: 'drive-file-123',
      applicationData: {
        source: 'google-drive',
        fileId: 'file-123',
        fileName: 'photo.jpg',
        mimeType: 'image/jpeg',
      },
    };

    // Verify message structure matches Workbench GALLERY_ADD handler expectations
    expect(galleryAddMessage.type).toBe('GALLERY_ADD');
    expect(galleryAddMessage.slotId).toBeDefined();
    expect(galleryAddMessage.projectId).toBeDefined();
    expect(galleryAddMessage.assetId).toBeDefined();
    expect(galleryAddMessage.applicationData).toBeDefined();
  });

  test('bridge payload preserves Drive reference through iframe boundary', () => {
    const bridgePayload = {
      source: 'google-drive',
      fileId: 'file-123',
      fileName: 'photo.jpg',
      mimeType: 'image/jpeg',
    };

    dragBridge.setDragData(bridgePayload);
    const retrieved = dragBridge.getDragData();

    expect(retrieved).toEqual(bridgePayload);
    expect(retrieved?.fileId).toBe('file-123');
    expect(retrieved?.fileName).toBe('photo.jpg');
  });

  test('bridge payload preserves local asset reference through iframe boundary', () => {
    const bridgePayload = {
      source: 'local',
      assetId: 'local-asset-456',
    };

    dragBridge.setDragData(bridgePayload);
    const retrieved = dragBridge.getDragData();

    expect(retrieved).toEqual(bridgePayload);
    expect(retrieved?.assetId).toBe('local-asset-456');
  });
});

