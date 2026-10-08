/**
 * VisualSlot - Slot registration component for website images
 *
 * Purpose: Wrap actual website images to register them as visual slots
 * - Registers slot metadata to slotRegistry on mount
 * - Unregisters on unmount
 * - Maintains visual fidelity to production (invisible in normal mode)
 * - In workbench mode, adds click handler and visual highlighting
 * - Uses postMessage for iframe communication
 *
 * Usage:
 * <VisualSlot
 *   id="homepage-hero-slot"
 *   route="/"
 *   page="Homepage"
 *   section="Hero"
 *   slotName="Hero Background"
 *   currentMediaId={heroMediaId}
 *   component="HeroSection"
 * >
 *   <Image ... />
 * </VisualSlot>
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { slotRegistry, type RegisteredSlot } from '@/lib/slot-registry';
import { dragBridge } from '@/lib/workbench-drag-bridge';

// P0 FIX: Explicit Workbench origin constant for postMessage validation
// Do not use implicit cross-origin discovery via window.parent.location.origin
// The iframe is guaranteed same-origin in production; this invariant is explicit here
const WORKBENCH_DEBUG = process.env.NEXT_PUBLIC_WORKBENCH_DEBUG === 'true';
const WORKBENCH_ORIGIN = typeof window !== 'undefined' ? window.location.origin : '';

// P0 FIX: Try to consume WorkbenchModeContext from preview layout if available
// This provides authoritative context from iframe/page level
// If not available (normal page render), fall back to URL check
let WorkbenchModeContext: React.Context<boolean> | null = null;
try {
  const contextModule = require('@/app/workbench/preview/workbench-mode-context');
  WorkbenchModeContext = contextModule.WorkbenchModeContext || null;
} catch (e) {
  // Preview layout not available (normal page render)
}

interface VisualSlotProps {
  id: string;
  route: string;
  page: string;
  section: string;
  slotName: string;
  currentMediaId: string | null;
  component: string;
  children: React.ReactNode;
  className?: string;
  // Gallery drag support
  isGallerySlot?: boolean;
  projectId?: string;
  // P0 FIX: Authoritative Workbench-mode from parent context
  // Avoids per-slot window.location inspection and SSR/hydration issues
  isWorkbenchMode?: boolean;
  galleryPointerHandlers?: Pick<React.HTMLAttributes<HTMLDivElement>, 'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel' | 'onLostPointerCapture'>;
  onGalleryClick?: (event: React.MouseEvent) => void;
  galleryDragging?: boolean;
}

export function VisualSlot({
  id,
  route,
  page,
  section,
  slotName,
  currentMediaId,
  component,
  children,
  className = '',
  isGallerySlot = false,
  projectId,
  isWorkbenchMode: propIsWorkbenchMode,
  galleryPointerHandlers,
  onGalleryClick,
  galleryDragging = false,
}: VisualSlotProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const lastDragOverLogRef = useRef<number>(0);
  const isDraggingActive = galleryDragging;
  const [isDropTarget, setIsDropTarget] = useState(false);

  // P0 FIX: Use authoritative Workbench-mode from prop (if provided by iframe context)
  // Fall back to synchronous URL check for backward compatibility
  // This provides single source of truth and avoids SSR/hydration issues
  const effectiveWorkbenchMode = propIsWorkbenchMode !== undefined ? propIsWorkbenchMode : (
    typeof window !== 'undefined' 
      ? new URLSearchParams(window.location.search).get('workbench') === 'true'
      : false
  );

  // CRITICAL DEBUG: Log workbench mode determination to console
  if (WORKBENCH_DEBUG) console.log('[VS_DEBUG] WORKBENCH_MODE', {
    slotId: id,
    isGallerySlot,
    propIsWorkbenchMode,
    effectiveWorkbenchMode,
    urlSearch: typeof window !== 'undefined' ? window.location.search : 'SSR',
    workbenchParam: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('workbench') : 'SSR',
    expectedDraggable: effectiveWorkbenchMode && isGallerySlot,
    timestamp: Date.now(),
  });

  // FORENSIC: Log Workbench-mode source and value
  if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] WORKBENCH_MODE_DETERMINATION', {
    slotId: id,
    modeSource: propIsWorkbenchMode !== undefined ? 'PROP_CONTEXT' : 'URL_SYNC',
    propIsWorkbenchMode,
    isWorkbenchMode: effectiveWorkbenchMode,
    isGallerySlot,
    projectId,
    propIsGallerySlot: isGallerySlot,
    propProjectId: projectId,
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
    search: typeof window !== 'undefined' ? window.location.search : 'SSR',
    workbenchParam: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('workbench') : 'SSR',
    timestamp: Date.now(),
  });

  // UNCONDITIONAL LOG - will appear in iframe console if component renders
  if (WORKBENCH_DEBUG) console.log('[SLOT-RENDER]', id);

  useEffect(() => {
    if (WORKBENCH_DEBUG) console.log('[SLOT] RENDER', { id, route, page, section, slotName, currentMediaId, windowIsIframe: window.parent !== window });
  }, [id, route, page, section, slotName, currentMediaId]);

  useEffect(() => {
    if (WORKBENCH_DEBUG) console.log('[SLOT] COMPONENT_MOUNTING', {
      id,
      section,
      slotName,
      pathname: window.location.pathname,
      search: window.location.search,
      isWorkbenchMode: effectiveWorkbenchMode,
      isGallerySlot,
      windowIsIframe: window.parent !== window,
    });

    // P0 FIX: Correct protocol ordering - create listener BEFORE sending BRIDGE_READY
    // The invariant is: listener must be attached before parent is permitted to send messages
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent
        || !event.data || typeof event.data !== 'object') return;
      if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] MESSAGE_RECEIVED', {
        slotId: id,
        eventOrigin: event.origin,
        expectedOrigin: window.location.origin,
        messageType: event.data?.type,
        messageKeys: event.data ? Object.keys(event.data) : [],
        timestamp: Date.now(),
      });

      if (event.data.type === 'REFRESH_SLOTS') {
        if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] REFRESH_SLOTS_ACCEPTED', { id });
        // Re-register with current mediaId to sync state
        slotRegistry.register(slot);
        if (window.parent !== window) {
          const targetOrigin = WORKBENCH_ORIGIN;
          window.parent.postMessage({
            type: 'SLOT_REGISTER',
            slot: { id, route, page, section, slotName, currentMediaId, component },
          }, targetOrigin);
          if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] REFRESH_REGISTER_SENT', { slotId: id, targetOrigin });
        }
      } else if (event.data.type === 'BRIDGE_INIT') {
        // P0 FIX: Initialize bridge with parent-issued generation
        // Parent owns the generation; iframe initializes with it once
        const generation = event.data.generation;
        if (typeof generation === 'number') {
          if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] BRIDGE_INIT_RECEIVED', {
            slotId: id,
            generation,
            timestamp: Date.now(),
          });
          dragBridge.initialize(generation);

          // P0 FIX: Re-send BRIDGE_READY with correct generation after initialization
          const bridgeReadyMessage = {
            type: 'BRIDGE_READY',
            slotId: id,
            iframeGeneration: dragBridge.getIframeGeneration(),
          };
          if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] BRIDGE_READY_RESENT_AFTER_INIT', {
            slotId: id,
            iframeGeneration: dragBridge.getIframeGeneration(),
            targetOrigin: WORKBENCH_ORIGIN,
            timestamp: Date.now(),
          });
          window.parent.postMessage(bridgeReadyMessage, WORKBENCH_ORIGIN);
        } else {
          console.error('[VS_FORENSIC] BRIDGE_INIT_REJECTED', {
            slotId: id,
            reason: 'INVALID_GENERATION',
            generation,
          });
        }
      } else if (event.data.type === 'DRAG_START') {
        // P0 FIX: Harden iframe DRAG_START bridge with origin/source/schema validation
        // Accept only messages from the parent window at the same origin
        const isSameOrigin = event.origin === window.location.origin;
        const isFromParent = event.source === window.parent;

        if (!isSameOrigin || !isFromParent) {
          console.error('[VS_FORENSIC] DRAG_START_BRIDGE_REJECTED', {
            slotId: id,
            reason: !isSameOrigin ? 'ORIGIN_MISMATCH' : 'SOURCE_NOT_PARENT',
            eventOrigin: event.origin,
            expectedOrigin: window.location.origin,
            isFromParent,
            timestamp: Date.now(),
          });
          return;
        }

        // Validate payload schema
        const dragData = event.data.dragData;
        if (!dragData || typeof dragData !== 'object') {
          console.error('[VS_FORENSIC] DRAG_START_BRIDGE_REJECTED', {
            slotId: id,
            reason: 'INVALID_PAYLOAD_TYPE',
            payloadType: typeof dragData,
            timestamp: Date.now(),
          });
          return;
        }

        // Validate Drive reference schema
        if (dragData.source === 'google-drive') {
          // CEO FIX: Use canonical fileName field (not legacy name)
          if (!dragData.fileId || !dragData.fileName || !dragData.mimeType) {
            console.error('[VS_FORENSIC] DRAG_START_BRIDGE_REJECTED', {
              slotId: id,
              reason: 'MALFORMED_DRIVE_REFERENCE',
              hasFileId: !!dragData.fileId,
              hasFileName: !!dragData.fileName,
              hasMimeType: !!dragData.mimeType,
              timestamp: Date.now(),
            });
            return;
          }
        } else if (dragData.source === 'local') {
          if (!dragData.assetId) {
            console.error('[VS_FORENSIC] DRAG_START_BRIDGE_REJECTED', {
              slotId: id,
              reason: 'MALFORMED_ASSET_REFERENCE',
              hasAssetId: !!dragData.assetId,
              timestamp: Date.now(),
            });
            return;
          }
        } else {
          console.error('[VS_FORENSIC] DRAG_START_BRIDGE_REJECTED', {
            slotId: id,
            reason: 'UNKNOWN_SOURCE_TYPE',
            source: dragData.source,
            timestamp: Date.now(),
          });
          return;
        }

        // CEO FIX: Bridge drag data from parent across iframe boundary
        // Store the drag data in shared bridge so all components can access it
        if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] DRAG_START_BRIDGE_ACCEPTED', {
          slotId: id,
          source: dragData.source,
          fileId: dragData.fileId || dragData.assetId,
          timestamp: Date.now(),
        });
        dragBridge.setDragData(dragData);

        // CEO FIX: Remove automatic 5-second timeout that was causing DRAG_START_BRIDGE_EXPIRED
        // The timeout was clearing dragBridge data before the user could complete
        // the drop operation, causing GALLERY_DROP_NO_BRIDGED_DATA errors during gallery reorder.
        // Drag state is now only cleared explicitly by:
        // 1. Successful drop (drop handler clears data after processing)
        // 2. Explicit drag cancellation by user
        // This prevents race condition where slow user interaction times out before drop.
      } else {
        if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] MESSAGE_IGNORED', {
          slotId: id,
          messageType: event.data?.type,
          reason: 'TYPE_MISMATCH',
        });
      }
    };

    window.addEventListener('message', handleMessage);

    if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] MESSAGE_LISTENER_ATTACHED', {
      slotId: id,
      windowIsIframe: window.parent !== window,
      timestamp: Date.now(),
    });

    // Register slot on mount
    const slot: RegisteredSlot = {
      id,
      route,
      page,
      section,
      slotName,
      currentMediaId,
      element: elementRef.current,
      component,
    };

    if (WORKBENCH_DEBUG) console.log('[SLOT] REGISTER_ATTEMPT', {
      slotId: id,
      isWorkbenchMode: effectiveWorkbenchMode,
      windowIsIframe: window.parent !== window,
      registryInstanceId: (slotRegistry as any).instanceId,
      registryImplementation: 'SlotRegistry class',
    });
    slotRegistry.register(slot);
    if (WORKBENCH_DEBUG) console.log('[SLOT] REGISTER_COMPLETE', {
      slotId: id,
      registryInstanceId: (slotRegistry as any).instanceId,
      registeredCount: slotRegistry.getAll().length,
    });

    // If in iframe, send SLOT_REGISTER to parent
    if (window.parent !== window) {
      const registerMessage = {
        type: 'SLOT_REGISTER',
        slot: { id, route, page, section, slotName, currentMediaId, component },
      };
      const targetOrigin = WORKBENCH_ORIGIN;
      if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] REGISTER_MESSAGE_CONSTRUCTED', {
        messageType: registerMessage.type,
        messageShape: Object.keys(registerMessage),
        slotShape: Object.keys(registerMessage.slot),
        targetOrigin,
        parentOrigin: window.parent.location?.origin,
        currentOrigin: window.location.origin,
        originsMatch: window.parent.location?.origin === window.location.origin,
        timestamp: Date.now(),
      });
      if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] REGISTER_SENT', {
        slotId: id,
        route,
        page,
        section,
        slotName,
        currentMediaId,
        component,
        messageType: registerMessage.type,
        messageKeys: Object.keys(registerMessage),
        targetOrigin,
        windowIsIframe: window.parent !== window,
        parentExists: !!window.parent,
        parentWindowExists: window.parent !== window,
        iframeOrigin: window.location.origin,
        parentOrigin: window.parent.location?.origin,
        timestamp: Date.now(),
      });
      window.parent.postMessage(registerMessage, targetOrigin);
      
      // P0 FIX: Send BRIDGE_READY AFTER listener is attached and slot is registered
      // The invariant is: listener must be attached before parent is permitted to send messages
      // P0 FIX: Register slot against existing parent-issued generation
      dragBridge.registerSlot(id);

      const bridgeReadyMessage = {
        type: 'BRIDGE_READY',
        slotId: id,
        iframeGeneration: dragBridge.getIframeGeneration(),
      };
      if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] BRIDGE_READY_SENT', {
        slotId: id,
        targetOrigin,
        listenerAttached: true,
        slotRegistered: true,
        iframeGeneration: dragBridge.getIframeGeneration(),
        timestamp: Date.now(),
      });
      window.parent.postMessage(bridgeReadyMessage, targetOrigin);
    } else {
      if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] REGISTRATION_SKIPPED', {
        slotId: id,
        reason: 'NOT_IN_IFRAME',
        windowIsIframe: window.parent !== window,
      });
    }

    // Unregister on unmount
    return () => {
      if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] UNREGISTER_START', {
        slotId: id,
        route,
        timestamp: Date.now(),
      });
      window.removeEventListener('message', handleMessage);
      slotRegistry.unregister(id, route);
      if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] UNREGISTER_COMPLETE', {
        slotId: id,
        remainingCount: slotRegistry.getAll().length,
        timestamp: Date.now(),
      });
    };
  }, [id, route, page, section, slotName, currentMediaId, component]);

  const handleClick = (event: React.MouseEvent) => {
    if (isGallerySlot) event.stopPropagation();
    if (isGallerySlot && onGalleryClick) { onGalleryClick(event); return; }
    if (WORKBENCH_DEBUG) console.log('[FORENSIC] iframe VisualSlot CLICK HANDLER', { id });

    // P0 FIX: postMessage is the authoritative iframe → parent transport
    // CustomEvent does not bubble across iframe boundaries
    // window.dispatchEvent() inside iframe only dispatches on iframe's own Window

    const slotData = { id, route, page, section, slotName, currentMediaId };
    const targetOrigin = WORKBENCH_ORIGIN;

    if (WORKBENCH_DEBUG) console.log('[SLOT_CLICK] POSTMESSAGE_PATH', {
      slotId: id,
      method: 'postMessage',
      parentOrigin: window.parent.location?.origin,
      currentOrigin: window.location.origin,
      originsMatch: window.parent.location?.origin === window.location.origin,
    });

    window.parent.postMessage(
      {
        type: 'SLOT_CLICK',
        slot: slotData,
      },
      targetOrigin
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (WORKBENCH_DEBUG) console.log('[VS_DND] DRAG_OVER_RECEIVED', {
      slotId: id,
      isGallerySlot,
      effectiveWorkbenchMode,
      timestamp: Date.now(),
    });

    e.preventDefault();
    e.stopPropagation(); // P0 FIX: Prevent event bubbling to parent containers

    // PROTOCOL SEMANTICS: dragstart owns effectAllowed, dragover owns dropEffect
    // Do NOT mutate effectAllowed in dragover
    const isReorder = e.dataTransfer.types.includes('application/x-workbench-gallery-reorder');
    const payload = dragBridge.getDragData();
    const wrongProject = isReorder && payload?.projectId && payload.projectId !== projectId;
    const dropEffect = wrongProject ? 'none' : isGallerySlot && isReorder ? 'move' : 'copy';
    e.dataTransfer.dropEffect = dropEffect;
    setIsDropTarget(!wrongProject);
    
    if (WORKBENCH_DEBUG) console.log('[VS_DND] DRAG_OVER', {
      slotId: id,
      isGallerySlot,
      effectiveWorkbenchMode,
      dropEffect,
      incomingEffectAllowed: e.dataTransfer.effectAllowed,
      cursorComputedStyle: elementRef.current ? getComputedStyle(elementRef.current).cursor : 'NO_ELEMENT',
      windowIsIframe: window.parent !== window,
      timestamp: Date.now(),
    });
    
    // Throttle logging to prevent performance issues
    const now = Date.now();
    if (now - lastDragOverLogRef.current > 100) { // Log at most once per 100ms
      lastDragOverLogRef.current = now;
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (WORKBENCH_DEBUG) console.log('[VS_DND] DRAG_ENTER', {
      slotId: id,
      isGallerySlot,
      effectiveWorkbenchMode,
      cursorComputedStyle: elementRef.current ? getComputedStyle(elementRef.current).cursor : 'NO_ELEMENT',
      timestamp: Date.now(),
    });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setIsDropTarget(false);

    if (WORKBENCH_DEBUG) console.log('[VS_DND] DRAG_LEAVE', {
      slotId: id,
      isGallerySlot,
      effectiveWorkbenchMode,
      timestamp: Date.now(),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation(); // P0 FIX: Prevent event bubbling to parent containers
    setIsDropTarget(false);

    if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] DROP_NATIVE_EVENT', {
      slotId: id,
      isGallerySlot,
      projectId,
      currentMediaId,
      isWorkbenchMode: effectiveWorkbenchMode,
      windowIsIframe: window.parent !== window,
      eventTarget: (e.target as HTMLElement)?.tagName,
      currentTarget: (e.currentTarget as HTMLElement)?.tagName,
      elementRefTagName: elementRef.current?.tagName,
      actualDraggableAttr: elementRef.current?.getAttribute('draggable'),
      dataTransferTypes: e.dataTransfer.types,
      dataTransferItems: Array.from(e.dataTransfer.items).map(item => ({
        kind: item.kind,
        type: item.type,
      })),
      hasBridgedData: !!dragBridge.getDragData(),
      timestamp: Date.now(),
    });

    if (WORKBENCH_DEBUG) console.log('[VS_DND] DROP_RECEIVED', {
      slotId: id,
      isGallerySlot,
      projectId,
      currentMediaId,
      windowIsIframe: window.parent !== window,
      dataTransferTypes: e.dataTransfer.types,
      dataTransferItems: Array.from(e.dataTransfer.items).map(item => ({
        kind: item.kind,
        type: item.type,
      })),
      textPlainPreview: e.dataTransfer.getData('text/plain')?.substring(0, 200),
      hasBridgedData: !!dragBridge.getDragData(),
      timestamp: Date.now(),
    });

    // PROTOCOL SEPARATION: Gallery slots accept GALLERY_REORDER and GALLERY_ADD
    // P0 FIX: Use explicit MIME types to avoid protocol ambiguity
    if (isGallerySlot) {
      let galleryReorderData = e.dataTransfer.getData('application/x-workbench-gallery-reorder');
      let assetData = e.dataTransfer.getData('application/x-workbench-asset');

      // P0 FIX: If dataTransfer is empty (iframe boundary issue), use bridged data
      const bridgedData = dragBridge.getDragData();
      if (!galleryReorderData && !assetData && bridgedData) {
        if (WORKBENCH_DEBUG) console.log('[VS_DND] GALLERY_FALLBACK_TO_BRIDGED_DATA', {
          slotId: id,
          bridgedDataType: bridgedData.type,
        });
        if (bridgedData.type === 'GALLERY_REORDER') {
          galleryReorderData = JSON.stringify(bridgedData);
        } else {
          assetData = JSON.stringify(bridgedData);
        }
      }

      if (WORKBENCH_DEBUG) console.log('[VS_DND] GALLERY_PROTOCOL_CHECK', {
        slotId: id,
        hasGalleryReorderData: !!galleryReorderData,
        hasAssetData: !!assetData,
        usedBridgedData: !e.dataTransfer.getData('application/x-workbench-gallery-reorder') && !e.dataTransfer.getData('application/x-workbench-asset') && !!dragBridge.getDragData(),
        dataTransferTypes: e.dataTransfer.types,
      });

      // GALLERY_REORDER: Accept gallery-to-gallery reordering via explicit MIME type
      if (galleryReorderData) {
        try {
          const parsed = JSON.parse(galleryReorderData);
          
          if (WORKBENCH_DEBUG) console.log('[VS_DND] GALLERY_REORDER_PARSED', {
            slotId: id,
            parsedType: parsed.type,
            sourceSlotId: parsed.sourceSlotId,
            sourceMediaId: parsed.sourceMediaId,
            targetSlotId: id,
            targetMediaId: currentMediaId,
            projectId: parsed.projectId,
            protocolMatch: parsed.type === 'GALLERY_REORDER',
          });

          if (parsed.type !== 'GALLERY_REORDER') {
            console.error('[VS_DND] GALLERY_PROTOCOL_REJECTED', {
              slotId: id,
              reason: 'WRONG_PROTOCOL_TYPE',
              expectedType: 'GALLERY_REORDER',
              actualType: parsed.type,
              message: 'Gallery slots only accept GALLERY_REORDER protocol',
            });
            return;
          }

          if (!parsed.sourceSlotId || !parsed.sourceMediaId || !parsed.projectId) {
            console.error('[VS_DND] GALLERY_PROTOCOL_REJECTED', {
              slotId: id,
              reason: 'MALFORMED_PAYLOAD',
              missingFields: {
                sourceSlotId: !parsed.sourceSlotId,
                sourceMediaId: !parsed.sourceMediaId,
                projectId: !parsed.projectId,
              },
            });
            return;
          }

          if (parsed.projectId !== projectId || typeof parsed.sourceMediaId !== 'string'
            || parsed.sourceSlotId !== `our-work-gallery::${projectId}::${parsed.sourceMediaId}`
            || parsed.iframeGeneration !== dragBridge.getIframeGeneration()
            || parsed.sourceMediaId === currentMediaId) return;

          // Send SLOT_REORDER event to parent
          if (window.parent !== window) {
            const targetOrigin = WORKBENCH_ORIGIN;
            const message = {
              type: 'SLOT_REORDER',
              sourceSlotId: parsed.sourceSlotId,
              sourceMediaId: parsed.sourceMediaId,
              targetSlotId: id,
              targetMediaId: currentMediaId,
              projectId: parsed.projectId,
              iframeGeneration: dragBridge.getIframeGeneration(),
            };

            if (WORKBENCH_DEBUG) console.log('[VS_FORENSIC] SLOT_REORDER_POSTMESSAGE_SENDING', {
              slotId: id,
              messageType: message.type,
              messageKeys: Object.keys(message),
              messageValues: message,
              targetOrigin,
              iframeOrigin: window.location.origin,
              parentOrigin: window.parent.location?.origin,
              originsMatch: window.parent.location?.origin === window.location.origin,
              parentExists: !!window.parent,
              parentEqualsWindow: window.parent === window,
              timestamp: Date.now(),
            });

            window.parent.postMessage(message, targetOrigin);

            if (WORKBENCH_DEBUG) console.log('[VS_DND] SLOT_REORDER_POSTED', {
              messageType: 'SLOT_REORDER',
              targetOrigin,
              timestamp: Date.now(),
            });
          } else {
            console.error('[VS_DND] SLOT_REORDER_FAILED', {
              reason: 'NOT_IN_IFRAME',
              hasParent: !!window.parent,
              parentEqualsWindow: window.parent === window,
            });
          }

          // P0 FIX: Clear bridged data after successful reorder
          dragBridge.clearDragData();
          return;
        } catch (error) {
          console.error('[VS_DND] GALLERY_REORDER_PARSE_FAILED', {
            slotId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          // P0 FIX: Clear bridged data on parse failure
          dragBridge.clearDragData();
          return;
        }
      }

      // GALLERY_ADD: Accept regular asset drops via explicit MIME type
      if (assetData) {
        let assetId: string;
        let applicationData: any = null;

        try {
          // Parse JSON payload
          const parsed = JSON.parse(assetData);

          // Preserve full applicationData for Drive references
          applicationData = parsed;

          // Handle both Drive reference and asset reference formats
          if (parsed.assetId) {
            assetId = parsed.assetId;
          } else if (parsed.fileId) {
            // Drive reference - use drive fileId as assetId
            assetId = `drive-${parsed.fileId}`;
          } else {
            console.error('[VS_DND] GALLERY_ADD_PARSE_FAILED', {
              slotId: id,
              reason: 'NO_ASSET_ID_IN_PAYLOAD',
              payload: parsed,
            });
            return;
          }
        } catch (error) {
          // Fallback: treat as plain asset ID if JSON parse fails
          console.warn('[VS_DND] GALLERY_ADD_PARSE_FALLBACK', {
            slotId: id,
            reason: 'JSON_PARSE_FAILED',
            usingRawValue: true,
          });
          assetId = assetData;
        }

        if (WORKBENCH_DEBUG) console.log('[VS_DND] GALLERY_ADD_ACCEPTED', {
          slotId: id,
          projectId,
          assetId,
          applicationData,
          reason: 'EXPLICIT_ASSET_MIME_TYPE',
          usedBridgedData: !e.dataTransfer.getData('application/x-workbench-asset') && !!dragBridge.getDragData(),
        });

        // Send GALLERY_ADD event to parent with full applicationData
        if (window.parent !== window) {
          const targetOrigin = WORKBENCH_ORIGIN;
          window.parent.postMessage({
            type: 'GALLERY_ADD',
            iframeGeneration: dragBridge.getIframeGeneration(),
            slot: { id, route, page, section, slotName, currentMediaId, component },
            slotId: id,
            projectId,
            assetId,
            applicationData, // P0 FIX: Preserve Drive payload through iframe boundary
          }, targetOrigin);

          if (WORKBENCH_DEBUG) console.log('[VS_DND] GALLERY_ADD_POSTED', {
            messageType: 'GALLERY_ADD',
            targetOrigin,
            hasApplicationData: !!applicationData,
            applicationDataKeys: applicationData ? Object.keys(applicationData) : [],
            timestamp: Date.now(),
          });
        } else {
          console.error('[VS_DND] GALLERY_ADD_FAILED', {
            reason: 'NOT_IN_IFRAME',
            hasParent: !!window.parent,
            parentEqualsWindow: window.parent === window,
          });
        }

        // P0 FIX: Clear bridged data after successful gallery add
        dragBridge.clearDragData();
        return;
      }

      // REJECT: No recognized protocol
      console.error('[VS_DND] GALLERY_PROTOCOL_REJECTED', {
        slotId: id,
        reason: 'NO_RECOGNIZED_PROTOCOL',
        availableTypes: e.dataTransfer.types,
        message: 'Gallery slots require GALLERY_REORDER or GALLERY_ADD protocol',
      });

      // P0 FIX: Clear bridged data on protocol rejection
      dragBridge.clearDragData();
      return;
    }

    // Normal VisualSlot: Accept ASSET_ASSIGNMENT via explicit MIME type
    let assetData = e.dataTransfer.getData('application/x-workbench-asset');

    // P0 FIX: If dataTransfer is empty (iframe boundary issue), use bridged data
    const bridgedData = dragBridge.getDragData();
    if (!assetData && bridgedData) {
      if (WORKBENCH_DEBUG) console.log('[VS_DND] ASSET_FALLBACK_TO_BRIDGED_DATA', {
        slotId: id,
        bridgedDataType: bridgedData.source,
      });
      assetData = JSON.stringify(bridgedData);
    }

    if (assetData) {
      let assetId: string;
      let applicationData: any = null;

      try {
        // Parse JSON payload
        const parsed = JSON.parse(assetData);

        // Preserve full applicationData for Drive references
        applicationData = parsed;

        // Handle both Drive reference and asset reference formats
        if (parsed.assetId) {
          assetId = parsed.assetId;
        } else if (parsed.fileId) {
          // Drive reference - use drive fileId as assetId
          assetId = `drive-${parsed.fileId}`;
        } else {
          console.error('[VS_DND] ASSET_ASSIGNMENT_PARSE_FAILED', {
            slotId: id,
            reason: 'NO_ASSET_ID_IN_PAYLOAD',
            payload: parsed,
          });
          return;
        }
      } catch (error) {
        // Fallback: treat as plain asset ID if JSON parse fails
        console.warn('[VS_DND] ASSET_ASSIGNMENT_PARSE_FALLBACK', {
          slotId: id,
          reason: 'JSON_PARSE_FAILED',
          usingRawValue: true,
        });
        assetId = assetData;
      }

      if (WORKBENCH_DEBUG) console.log('[VS_DND] ASSET_ASSIGNMENT_ACCEPTED', {
        slotId: id,
        assetId,
        applicationData,
        protocol: 'application/x-workbench-asset',
        usedBridgedData: !e.dataTransfer.getData('application/x-workbench-asset') && !!dragBridge.getDragData(),
      });

      // Send SLOT_DROP event to parent with full applicationData
      if (window.parent !== window) {
        const targetOrigin = WORKBENCH_ORIGIN;
        window.parent.postMessage({
          type: 'SLOT_DROP',
          slot: { id, route, page, section, slotName, currentMediaId, component },
          slotId: id,
          assetId,
          applicationData, // P0 FIX: Preserve Drive payload through iframe boundary
        }, targetOrigin);

        if (WORKBENCH_DEBUG) console.log('[VS_DND] SLOT_DROP_POSTED', {
          messageType: 'SLOT_DROP',
          targetOrigin,
          hasApplicationData: !!applicationData,
          applicationDataKeys: applicationData ? Object.keys(applicationData) : [],
          timestamp: Date.now(),
        });
      } else {
        console.error('[VS_DND] SLOT_DROP_FAILED', {
          reason: 'NOT_IN_IFRAME',
          hasParent: !!window.parent,
          parentEqualsWindow: window.parent === window,
        });
      }

      // P0 FIX: Clear bridged data after successful drop
      dragBridge.clearDragData();
      return;
    }

    // REJECT: No recognized protocol
    console.error('[VS_DND] PROTOCOL_REJECTED', {
      slotId: id,
      reason: 'NO_RECOGNIZED_PROTOCOL',
      availableTypes: e.dataTransfer.types,
      message: 'VisualSlot requires ASSET_ASSIGNMENT protocol',
    });

    // P0 FIX: Clear bridged data on protocol rejection
    dragBridge.clearDragData();
  };

  // Always render same structure to avoid hydration mismatch
  // Only conditionally apply handlers and cursor style
  // P0 FIX: Do NOT override caller geometry - VisualSlot should be invisible wrapper
  // P0 FIX: Restore proper drag cursor for gallery reorder affordance
  // Gallery slots: grab at rest, grabbing during active drag
  // Non-gallery Workbench slots: pointer for click-to-select
  const cursorStyle = effectiveWorkbenchMode
    ? (isGallerySlot 
        ? { cursor: isDraggingActive ? 'grabbing' : 'grab' } 
        : { cursor: 'pointer' })
    : undefined;

  // P0 FIX: Also apply cursor via className for better browser compatibility
  const cursorClass = effectiveWorkbenchMode
    ? (isGallerySlot 
        ? (isDraggingActive ? 'cursor-grabbing' : 'cursor-grab') 
        : 'cursor-pointer')
    : '';

  if (WORKBENCH_DEBUG) console.log('[VS_CURSOR] CURSOR_STYLE_COMPUTED', {
    slotId: id,
    effectiveWorkbenchMode,
    isGallerySlot,
    cursorStyle,
    computedCursor: cursorStyle?.cursor,
    cursorClass,
    route,
    section,
    currentMediaId,
    projectId,
    draggableProp: effectiveWorkbenchMode && isGallerySlot,
    childPointerEvents: effectiveWorkbenchMode && isGallerySlot ? 'none' : 'auto',
  });
  
  // CRITICAL: Log pointer events to diagnose why drag doesn't start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (WORKBENCH_DEBUG) console.log('[VS_POINTER] MOUSE_DOWN', {
      slotId: id,
      isGallerySlot,
      effectiveWorkbenchMode,
      expectedDraggable: effectiveWorkbenchMode && isGallerySlot,
      eventTarget: (e.target as HTMLElement).tagName,
      eventTargetClassName: (e.target as HTMLElement).className,
      eventTargetId: (e.target as HTMLElement).id,
      currentTarget: (e.currentTarget as HTMLElement).tagName,
      currentTargetId: (e.currentTarget as HTMLElement).id,
      button: e.button,
      shiftKey: e.shiftKey,
      ctrlKey: e.ctrlKey,
      metaKey: e.metaKey,
      timestamp: Date.now(),
    });
  };

  return (
    <div
      ref={elementRef}
      className={`visual-slot ${className} ${cursorClass} ${isDropTarget ? 'ring-4 ring-inset ring-honey' : ''} ${isDraggingActive ? 'opacity-60' : ''}`}
      data-slot-id={id}
      data-slot-route={route}
      data-slot-section={section}
      style={{ ...cursorStyle, ...(effectiveWorkbenchMode && isGallerySlot ? { touchAction: 'none', userSelect: 'none' } : {}) }}
      onClick={effectiveWorkbenchMode ? handleClick : undefined}
      onMouseDown={handleMouseDown}
      onDragOver={effectiveWorkbenchMode ? handleDragOver : undefined}
      onDragEnter={effectiveWorkbenchMode ? handleDragEnter : undefined}
      onDragLeave={effectiveWorkbenchMode ? handleDragLeave : undefined}
      onDrop={effectiveWorkbenchMode ? handleDrop : undefined}
      draggable={false}
      {...(effectiveWorkbenchMode && isGallerySlot ? galleryPointerHandlers : {})}
    >
      <div
        className={isGallerySlot ? 'h-full w-full' : undefined}
        style={
          effectiveWorkbenchMode && isGallerySlot
            ? { pointerEvents: 'none' }
            : undefined
        }
      >
        {children}
      </div>
    </div>
  );
}
