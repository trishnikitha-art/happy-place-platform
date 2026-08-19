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
}: VisualSlotProps) {
  const elementRef = useRef<HTMLDivElement>(null);
  const [isWorkbenchMode, setIsWorkbenchMode] = useState(false);

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
      console.log('[SLOT] REGISTER_SENT', {
        slotId: id,
        messageType: registerMessage.type,
        targetOrigin: '*',
        windowIsIframe,
        parentExists: !!window.parent,
        parentWindowExists: window.parent !== window,
      });
      window.parent.postMessage(registerMessage, '*');
    } else {
      console.log('[SLOT] REGISTRATION_SKIPPED', {
        slotId: id,
        reason: 'NOT_IN_IFRAME',
      });
    }

    // Listen for REFRESH_SLOTS message from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'REFRESH_SLOTS') {
        console.log('[FORENSIC] iframe REFRESH_SLOTS received', { id });
        // Re-register with current mediaId to sync state
        slotRegistry.register(slot);
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'SLOT_REGISTER',
            slot: { id, route, page, section, slotName, currentMediaId, component },
          }, '*');
        }
      }
    };

    window.addEventListener('message', handleMessage);

    // Unregister on unmount
    return () => {
      window.removeEventListener('message', handleMessage);
      slotRegistry.unregister(id, route);
    };
  }, [id, route, page, section, slotName, currentMediaId, component]);

  const handleClick = () => {
    console.log('[FORENSIC] iframe VisualSlot CLICK HANDLER', { id });

    // If in iframe, use postMessage to communicate with parent
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'SLOT_CLICK',
          slot: { id, route, page, section, slotName, currentMediaId },
        },
        '*'
      );
    } else {
      // Direct dispatch if not in iframe
      window.dispatchEvent(new CustomEvent('slot-click', { detail: { id, route, page, section, slotName, currentMediaId } }));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    // Force cursor to show as valid drop target
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    console.log('[DND] IFRAME_DROP', {
      slotId: id,
      windowIsIframe: window.parent !== window,
      dataTransferTypes: e.dataTransfer.types,
    });

    // Extract asset ID from DataTransfer (same key used in parent handleDragStart)
    const assetId = e.dataTransfer.getData('text/plain');
    
    // Also try application/x-workbench-asset for structured data
    let applicationData = null;
    try {
      const applicationJson = e.dataTransfer.getData('application/x-workbench-asset');
      if (applicationJson) {
        applicationData = JSON.parse(applicationJson);
      }
    } catch (e) {
      // Ignore parse errors
    }

    console.log('[DND] SLOT_DROP_PAYLOAD_EXTRACTED', {
      slotId: id,
      assetId,
      applicationData,
      dataTransferTypes: e.dataTransfer.types,
    });

    // Communicate drop to parent (DataTransfer doesn't cross iframe boundary)
    if (window.parent !== window) {
      const dropMessage = {
        type: 'SLOT_DROP',
        slot: { id, route, page, section, slotName, currentMediaId },
        assetId,
        applicationData, // Pass full application data for Drive references
      };
      console.log('[DND] SLOT_DROP_POSTMESSAGE', {
        slotId: id,
        assetId,
        hasApplicationData: !!applicationData,
      });
      window.parent.postMessage(dropMessage, '*');
    }
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
    >
      {children}
    </div>
  );
}
