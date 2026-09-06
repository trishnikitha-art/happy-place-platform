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
}: VisualSlotProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isWorkbenchMode, setIsWorkbenchMode] = useState(false);
  const lastDragOverLogRef = useRef<number>(0);

  // UNCONDITIONAL LOG - will appear in iframe console if component renders
  console.log('[SLOT-RENDER]', id);

  useEffect(() => {
    console.log('[SLOT] RENDER', { id, route, page, section, slotName, currentMediaId, windowIsIframe: window.parent !== window });
  }, [id, route, page, section, slotName, currentMediaId]);

  useEffect(() => {
    console.log('[SLOT] COMPONENT_MOUNTING', {
      id,
      section,
      slotName,
      pathname: window.location.pathname,
      search: window.location.search,
    });

    // Workbench mode check
    const workbenchParam = new URLSearchParams(window.location.search).get('workbench');
    const isWorkbenchMode = workbenchParam === 'true';
    const windowIsIframe = window.parent !== window;

    console.log('[SLOT] WORKBENCH_MODE_CHECK', {
      slotId: id,
      pathname: window.location.pathname,
      search: window.location.search,
      workbenchParam,
      isWorkbenchMode,
      windowIsIframe,
    });

    // Actually set the React state for workbench mode
    setIsWorkbenchMode(isWorkbenchMode);
    
    console.log('[VS_FORENSIC] WORKBENCH_ENABLED', {
      slotId: id,
      isWorkbenchMode,
      windowIsIframe,
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

    console.log('[SLOT] REGISTER_ATTEMPT', {
      slotId: id,
      isWorkbenchMode,
      windowIsIframe,
      registryInstanceId: (slotRegistry as any).instanceId,
      registryImplementation: 'SlotRegistry class',
    });
    slotRegistry.register(slot);
    console.log('[SLOT] REGISTER_COMPLETE', {
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
      const targetOrigin = window.parent.location.origin;
      console.log('[VS_FORENSIC] REGISTER_MESSAGE_CONSTRUCTED', {
        messageType: registerMessage.type,
        messageShape: Object.keys(registerMessage),
        slotShape: Object.keys(registerMessage.slot),
        targetOrigin,
        parentOrigin: window.parent.location?.origin,
        currentOrigin: window.location.origin,
        originsMatch: window.parent.location?.origin === window.location.origin,
        timestamp: Date.now(),
      });
      console.log('[VS_FORENSIC] REGISTER_SENT', {
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
        windowIsIframe,
        parentExists: !!window.parent,
        parentWindowExists: window.parent !== window,
        iframeOrigin: window.location.origin,
        parentOrigin: window.parent.location?.origin,
        timestamp: Date.now(),
      });
      window.parent.postMessage(registerMessage, targetOrigin);
    } else {
      console.log('[VS_FORENSIC] REGISTRATION_SKIPPED', {
        slotId: id,
        reason: 'NOT_IN_IFRAME',
        windowIsIframe,
      });
    }

    // Listen for REFRESH_SLOTS message from parent
    const handleMessage = (event: MessageEvent) => {
      console.log('[VS_FORENSIC] MESSAGE_RECEIVED', {
        slotId: id,
        eventOrigin: event.origin,
        expectedOrigin: window.location.origin,
        messageType: event.data?.type,
        messageKeys: event.data ? Object.keys(event.data) : [],
        messageTypeMatch: event.data?.type === 'REFRESH_SLOTS',
        timestamp: Date.now(),
      });
      
      if (event.data.type === 'REFRESH_SLOTS') {
        console.log('[VS_FORENSIC] REFRESH_SLOTS_ACCEPTED', { id });
        // Re-register with current mediaId to sync state
        slotRegistry.register(slot);
        if (window.parent !== window) {
          const targetOrigin = window.parent.location.origin;
          window.parent.postMessage({
            type: 'SLOT_REGISTER',
            slot: { id, route, page, section, slotName, currentMediaId, component },
          }, targetOrigin);
          console.log('[VS_FORENSIC] REFRESH_REGISTER_SENT', { slotId: id, targetOrigin });
        }
      } else {
        console.log('[VS_FORENSIC] MESSAGE_IGNORED', {
          slotId: id,
          messageType: event.data?.type,
          reason: 'TYPE_MISMATCH',
        });
      }
    };

    window.addEventListener('message', handleMessage);

    // Add DOM forensic log after mount
    setTimeout(() => {
      const slots = document.querySelectorAll('[data-slot-id]');
      console.log('[VS_FORENSIC] DOM_INVENTORY', {
        totalSlots: slots.length,
        slotIds: Array.from(slots).map(s => {
          const element = s as HTMLElement;
          return {
            id: element.dataset.slotId,
            route: element.dataset.slotRoute,
            section: element.dataset.slotSection,
            pointerEvents: getComputedStyle(element).pointerEvents,
            draggable: element.draggable,
            hasOnClick: element.getAttribute('onclick') !== null,
            hasOnDragOver: element.getAttribute('ondragover') !== null,
            hasOnDrop: element.getAttribute('ondrop') !== null,
          };
        }),
        timestamp: Date.now(),
      });
    }, 1000);

    // Unregister on unmount
    return () => {
      console.log('[VS_FORENSIC] UNREGISTER_START', {
        slotId: id,
        route,
        timestamp: Date.now(),
      });
      window.removeEventListener('message', handleMessage);
      slotRegistry.unregister(id, route);
      console.log('[VS_FORENSIC] UNREGISTER_COMPLETE', {
        slotId: id,
        remainingCount: slotRegistry.getAll().length,
        timestamp: Date.now(),
      });
    };
  }, [id, route, page, section, slotName, currentMediaId, component]);

  const handleClick = () => {
    console.log('[FORENSIC] iframe VisualSlot CLICK HANDLER', { id });

    // If in iframe, use postMessage to communicate with parent
    if (window.parent !== window) {
      const targetOrigin = window.parent.location.origin;
      window.parent.postMessage(
        {
          type: 'SLOT_CLICK',
          slot: { id, route, page, section, slotName, currentMediaId },
        },
        targetOrigin
      );
    } else {
      // Direct dispatch if not in iframe
      window.dispatchEvent(new CustomEvent('slot-click', { detail: { id, route, page, section, slotName, currentMediaId } }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    
    // PROTOCOL SEMANTICS: dragstart owns effectAllowed, dragover owns dropEffect
    // Do NOT mutate effectAllowed in dragover
    const dropEffect = isGallerySlot ? 'move' : 'copy';
    e.dataTransfer.dropEffect = dropEffect;
    
    console.log('[VS_DND] DRAG_OVER', {
      slotId: id,
      isGallerySlot,
      dropEffect,
      incomingEffectAllowed: e.dataTransfer.effectAllowed,
      windowIsIframe: window.parent !== window,
      timestamp: Date.now(),
    });
    
    // Throttle logging to prevent performance issues
    const now = Date.now();
    if (now - lastDragOverLogRef.current > 100) { // Log at most once per 100ms
      lastDragOverLogRef.current = now;
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!isGallerySlot || !currentMediaId || !projectId) {
      console.log('[VS_DND] DRAG_START_SKIPPED', {
        slotId: id,
        isGallerySlot,
        currentMediaId,
        projectId,
        reason: !isGallerySlot ? 'NOT_GALLERY_SLOT' : !currentMediaId ? 'NO_MEDIA_ID' : 'NO_PROJECT_ID',
      });
      return;
    }

    console.log('[VS_DND] GALLERY_DRAG_START', {
      slotId: id,
      currentMediaId,
      projectId,
      windowIsIframe: window.parent !== window,
      element: elementRef.current?.tagName,
      parentElement: elementRef.current?.parentElement?.tagName,
      hasButtonParent: elementRef.current?.parentElement?.tagName === 'BUTTON',
      hasClickHandler: elementRef.current?.parentElement?.hasAttribute('onclick'),
      draggableAttribute: elementRef.current?.getAttribute('draggable'),
      timestamp: Date.now(),
    });

    // Set drag data for cross-frame communication
    // P0 FIX: Use explicit MIME types to avoid protocol ambiguity
    const dragData = JSON.stringify({
      type: 'GALLERY_REORDER',
      sourceSlotId: id,
      sourceMediaId: currentMediaId,
      projectId,
    });

    e.dataTransfer.setData('application/x-workbench-gallery-reorder', dragData);
    e.dataTransfer.setData('text/plain', dragData); // Fallback for compatibility
    e.dataTransfer.effectAllowed = 'move';

    console.log('[VS_DND] DRAG_DATA_SET', {
      slotId: id,
      dataType: 'application/x-workbench-gallery-reorder',
      fallbackType: 'text/plain',
      dataLength: dragData.length,
      effectAllowed: 'move',
      dataPreview: dragData.substring(0, 100),
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    console.log('[VS_DND] DROP_RECEIVED', {
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
      timestamp: Date.now(),
    });

    // PROTOCOL SEPARATION: Gallery slots accept GALLERY_REORDER and GALLERY_ADD
    // P0 FIX: Use explicit MIME types to avoid protocol ambiguity
    if (isGallerySlot) {
      const galleryReorderData = e.dataTransfer.getData('application/x-workbench-gallery-reorder');
      const assetData = e.dataTransfer.getData('application/x-workbench-asset');
      
      console.log('[VS_DND] GALLERY_PROTOCOL_CHECK', {
        slotId: id,
        hasGalleryReorderData: !!galleryReorderData,
        hasAssetData: !!assetData,
        dataTransferTypes: e.dataTransfer.types,
      });

      // GALLERY_REORDER: Accept gallery-to-gallery reordering via explicit MIME type
      if (galleryReorderData) {
        try {
          const parsed = JSON.parse(galleryReorderData);
          
          console.log('[VS_DND] GALLERY_REORDER_PARSED', {
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

          // Send SLOT_REORDER event to parent
          if (window.parent !== window) {
            const targetOrigin = window.parent.location.origin;
            window.parent.postMessage({
              type: 'SLOT_REORDER',
              sourceSlotId: parsed.sourceSlotId,
              sourceMediaId: parsed.sourceMediaId,
              targetSlotId: id,
              targetMediaId: currentMediaId,
              projectId: parsed.projectId,
            }, targetOrigin);

            console.log('[VS_DND] SLOT_REORDER_POSTED', {
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
          return;
        } catch (error) {
          console.error('[VS_DND] GALLERY_REORDER_PARSE_FAILED', {
            slotId: id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          return;
        }
      }

      // GALLERY_ADD: Accept regular asset drops via explicit MIME type
      if (assetData) {
        let assetId: string;
        
        try {
          // Parse JSON payload
          const parsed = JSON.parse(assetData);
          
          // Handle both Drive reference and asset reference formats
          if (parsed.assetId) {
            assetId = parsed.assetId;
          } else if (parsed.driveId) {
            assetId = parsed.driveId;
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
        
        console.log('[VS_DND] GALLERY_ADD_ACCEPTED', {
          slotId: id,
          projectId,
          assetId,
          reason: 'EXPLICIT_ASSET_MIME_TYPE',
        });

        // Send GALLERY_ADD event to parent
        if (window.parent !== window) {
          const targetOrigin = window.parent.location.origin;
          window.parent.postMessage({
            type: 'GALLERY_ADD',
            slotId: id,
            projectId,
            assetId,
          }, targetOrigin);

          console.log('[VS_DND] GALLERY_ADD_POSTED', {
            messageType: 'GALLERY_ADD',
            targetOrigin,
            timestamp: Date.now(),
          });
        } else {
          console.error('[VS_DND] GALLERY_ADD_FAILED', {
            reason: 'NOT_IN_IFRAME',
            hasParent: !!window.parent,
            parentEqualsWindow: window.parent === window,
          });
        }
        return;
      }

      // REJECT: No recognized protocol
      console.error('[VS_DND] GALLERY_PROTOCOL_REJECTED', {
        slotId: id,
        reason: 'NO_RECOGNIZED_PROTOCOL',
        availableTypes: e.dataTransfer.types,
        message: 'Gallery slots require GALLERY_REORDER or GALLERY_ADD protocol',
      });
      return;
    }

    // Normal VisualSlot: Accept ASSET_ASSIGNMENT via explicit MIME type
    const assetData = e.dataTransfer.getData('application/x-workbench-asset');
    
    if (assetData) {
      let assetId: string;
      
      try {
        // Parse JSON payload
        const parsed = JSON.parse(assetData);
        
        // Handle both Drive reference and asset reference formats
        if (parsed.assetId) {
          assetId = parsed.assetId;
        } else if (parsed.driveId) {
          assetId = parsed.driveId;
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
      
      console.log('[VS_DND] ASSET_ASSIGNMENT_ACCEPTED', {
        slotId: id,
        assetId,
        protocol: 'application/x-workbench-asset',
      });

      // Send SLOT_DROP event to parent
      if (window.parent !== window) {
        const targetOrigin = window.parent.location.origin;
        window.parent.postMessage({
          type: 'SLOT_DROP',
          slotId: id,
          assetId,
        }, targetOrigin);

        console.log('[VS_DND] SLOT_DROP_POSTED', {
          messageType: 'SLOT_DROP',
          targetOrigin,
          timestamp: Date.now(),
        });
      } else {
        console.error('[VS_DND] SLOT_DROP_FAILED', {
          reason: 'NOT_IN_IFRAME',
          hasParent: !!window.parent,
          parentEqualsWindow: window.parent === window,
        });
      }
      return;
    }

    // REJECT: No recognized protocol
    console.error('[VS_DND] PROTOCOL_REJECTED', {
      slotId: id,
      reason: 'NO_RECOGNIZED_PROTOCOL',
      availableTypes: e.dataTransfer.types,
      message: 'VisualSlot requires ASSET_ASSIGNMENT protocol',
    });
  };

  // Always render same structure to avoid hydration mismatch
  // Only conditionally apply handlers and cursor style
  return (
    <div
      ref={elementRef}
      className={`visual-slot ${className}`}
      data-slot-id={id}
      data-slot-route={route}
      data-slot-section={section}
      style={isWorkbenchMode ? { cursor: 'pointer' } : undefined}
      onClick={isWorkbenchMode ? handleClick : undefined}
      onDragOver={isWorkbenchMode ? handleDragOver : undefined}
      onDrop={isWorkbenchMode ? handleDrop : undefined}
      draggable={isWorkbenchMode && isGallerySlot}
      onDragStart={isWorkbenchMode && isGallerySlot ? handleDragStart : undefined}
    >
      {children}
    </div>
  );
}
