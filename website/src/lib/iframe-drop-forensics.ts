/**
 * Iframe-level drop target forensics
 *
 * Uses document.elementFromPoint() to establish exactly which element
 * the browser is targeting for drag/drop operations, independent of
 * React state or component hierarchy.
 */

export interface DropTargetInfo {
  targetTag: string;
  targetClasses: string[];
  closestVisualSlot: string | null;
  closestProjectGallerySection: string | null;
  slotId: string | null;
  projectId: string | null;
  pointerX: number;
  pointerY: number;
  pointerEvents: string;
  draggable: boolean;
  timestamp: number;
}

/**
 * Get drop target information at the given pointer coordinates
 * This reports the actual DOM element the browser is targeting
 */
export function getDropTargetInfo(x: number, y: number): DropTargetInfo {
  const element = document.elementFromPoint(x, y) as HTMLElement;

  if (!element) {
    return {
      targetTag: 'none',
      targetClasses: [],
      closestVisualSlot: null,
      closestProjectGallerySection: null,
      slotId: null,
      projectId: null,
      pointerX: x,
      pointerY: y,
      pointerEvents: 'none',
      draggable: false,
      timestamp: Date.now(),
    };
  }

  const computedStyle = getComputedStyle(element);
  const closestVisualSlot = element.closest('[data-slot-id]') as HTMLElement;
  const closestProjectSection = element.closest('.project-gallery-section') as HTMLElement;

  const targetInfo: DropTargetInfo = {
    targetTag: element.tagName,
    targetClasses: Array.from(element.classList),
    closestVisualSlot: closestVisualSlot?.getAttribute('data-slot-id') || null,
    closestProjectGallerySection: closestProjectSection?.getAttribute('data-project-id') || null,
    slotId: closestVisualSlot?.getAttribute('data-slot-id') || null,
    projectId: closestProjectSection?.getAttribute('data-project-id') || null,
    pointerX: x,
    pointerY: y,
    pointerEvents: computedStyle.pointerEvents,
    draggable: element.draggable,
    timestamp: Date.now(),
  };

  console.log('[WB_IFRAME_DND] DROP_TARGET', targetInfo);

  return targetInfo;
}

/**
 * Log drag over target information (throttled)
 */
export function logDragOverTarget(x: number, y: number) {
  const element = document.elementFromPoint(x, y) as HTMLElement;

  if (!element) {
    console.log('[WB_IFRAME_DND] DRAG_OVER_TARGET', {
      targetTag: 'none',
      pointerX: x,
      pointerY: y,
      timestamp: Date.now(),
    });
    return;
  }

  const computedStyle = getComputedStyle(element);
  const closestVisualSlot = element.closest('[data-slot-id]') as HTMLElement;
  const closestProjectSection = element.closest('.project-gallery-section') as HTMLElement;

  console.log('[WB_IFRAME_DND] DRAG_OVER_TARGET', {
    targetTag: element.tagName,
    targetClasses: Array.from(element.classList),
    closestVisualSlot: closestVisualSlot?.getAttribute('data-slot-id') || null,
    closestProjectGallerySection: closestProjectSection?.getAttribute('data-project-id') || null,
    slotId: closestVisualSlot?.getAttribute('data-slot-id') || null,
    projectId: closestProjectSection?.getAttribute('data-project-id') || null,
    pointerX: x,
    pointerY: y,
    pointerEvents: computedStyle.pointerEvents,
    draggable: element.draggable,
    timestamp: Date.now(),
  });
}
