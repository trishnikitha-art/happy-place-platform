/**
 * VisualSlot - Slot registration component for website images
 * 
 * Purpose: Wrap actual website images to register them as visual slots
 * - Registers slot metadata to slotRegistry on mount
 * - Unregisters on unmount
 * - Provides workbench mode with slot highlighting
 * - Maintains visual fidelity to production (invisible in normal mode)
 * - Updates rect on scroll/resize for workbench overlay positioning
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

import { useEffect, useRef, useCallback } from 'react';
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

  const updateRect = useCallback(() => {
    if (elementRef.current) {
      const rect = elementRef.current.getBoundingClientRect();
      slotRegistry.updateRect(id, {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    }
  }, [id]);

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
    updateRect();

    // Update rect on scroll and resize
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);

    // Unregister on unmount
    return () => {
      slotRegistry.unregister(id);
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [id, route, page, section, slotName, currentMediaId, component, updateRect]);

  // Check if we're in workbench mode (via URL or environment)
  const isWorkbenchMode = typeof window !== 'undefined' && window.location.pathname.startsWith('/workbench');

  return (
    <div
      ref={elementRef}
      className={`visual-slot ${className}`}
      data-slot-id={id}
      data-slot-route={route}
      data-slot-section={section}
      style={{
        // In workbench mode, show subtle highlight
        ...(isWorkbenchMode && {
          outline: '2px dashed rgba(22, 43, 41, 0.3)',
          outlineOffset: '2px',
        }),
      }}
    >
      {children}
    </div>
  );
}
