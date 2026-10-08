export interface GalleryRect {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

export const GALLERY_DRAG_THRESHOLD = 6;

export function passedGalleryDragThreshold(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= GALLERY_DRAG_THRESHOLD;
}

// Geometry is captured once on pointerdown, rather than forcing layout on move.
export function nearestGalleryIndex(rects: GalleryRect[], x: number, y: number): number {
  let nearest = 0;
  let distance = Infinity;
  rects.forEach((rect, index) => {
    const next = Math.hypot(x - rect.left - rect.width / 2, y - rect.top - rect.height / 2);
    if (next < distance) { nearest = index; distance = next; }
  });
  return nearest;
}

export function reorderVisibleGallery(order: string[], sourceIndex: number, targetIndex: number): string[] {
  const next = [...order];
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex >= next.length || targetIndex >= next.length) return next;
  const [source] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, source);
  return next;
}

// Unresolved/hidden IDs retain their places; only visible positions are exchanged.
export function mergeVisibleGalleryOrder(fullOrder: string[], visibleOrder: string[]): string[] {
  const visible = new Set(visibleOrder);
  if (visible.size !== visibleOrder.length || visibleOrder.some(id => !fullOrder.includes(id))) return [...fullOrder];
  let index = 0;
  return fullOrder.map(id => visible.has(id) ? visibleOrder[index++] : id);
}
