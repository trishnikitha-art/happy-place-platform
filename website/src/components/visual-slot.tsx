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

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
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

    slotRegistry.register(slot);

    // Unregister on unmount
    return () => {
      slotRegistry.unregister(id);
    };
  }, [id, route, page, section, slotName, currentMediaId, component]);

  // Check if we're in workbench mode
  const isWorkbenchMode = typeof window !== 'undefined' && window.location.pathname.startsWith('/workbench');

  // If in workbench mode, make it clickable and add visual feedback
  if (isWorkbenchMode) {
    return (
      <div
        ref={elementRef}
        className={`visual-slot ${className} cursor-pointer hover:ring-2 hover:ring-primary hover:ring-offset-2 transition-all`}
        data-slot-id={id}
        data-slot-route={route}
        data-slot-section={section}
        onClick={() => {
          // If in iframe, use postMessage to communicate with parent
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'SLOT_CLICK',
              slot: { id, route, page, section, slotName, currentMediaId },
            }, '*');
          } else {
            // Direct dispatch if not in iframe
            window.dispatchEvent(new CustomEvent('slot-click', { detail: { id, route, page, section, slotName, currentMediaId } }));
          }
        }}
        style={{
          outline: '2px dashed rgba(22, 43, 41, 0.3)',
          outlineOffset: '2px',
        }}
      >
        {children}
      </div>
    );
  }

  // Normal mode: just render children without any overhead
  return <div ref={elementRef} className={`visual-slot ${className}`}>{children}</div>;
}
