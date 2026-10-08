export interface GalleryReorder {
  projectId: string;
  sourceSlotId: string;
  sourceMediaId: string;
  targetSlotId: string;
  targetMediaId: string;
  orderedMediaIds?: string[];
  baseOrderedMediaIds?: string[];
}

export function isGalleryOrder(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(id => typeof id === 'string' && id.length > 0)
    && new Set(value).size === value.length;
}

export function parseGalleryReorder(value: unknown): GalleryReorder | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const fields = ['projectId', 'sourceSlotId', 'sourceMediaId', 'targetSlotId', 'targetMediaId'] as const;
  if (!fields.every(key => typeof data[key] === 'string' && data[key] !== '')) return null;
  const result = data as unknown as GalleryReorder;
  if (result.sourceSlotId !== `our-work-gallery::${result.projectId}::${result.sourceMediaId}`
    || result.targetSlotId !== `our-work-gallery::${result.projectId}::${result.targetMediaId}`) return null;
  if (data.orderedMediaIds !== undefined && !isGalleryOrder(data.orderedMediaIds)) return null;
  if (data.baseOrderedMediaIds !== undefined && !isGalleryOrder(data.baseOrderedMediaIds)) return null;
  if (data.baseOrderedMediaIds !== undefined && data.orderedMediaIds === undefined) return null;
  return result;
}

export function applyGalleryReorder(order: readonly string[], request: GalleryReorder): string[] {
  // Validate source and destination even when the pointer sends a complete order.
  const moved = moveGalleryImage(order, request.sourceMediaId, request.targetMediaId);
  if (!request.orderedMediaIds) return moved;
  if (request.baseOrderedMediaIds && JSON.stringify(request.baseOrderedMediaIds) !== JSON.stringify(order)) {
    throw new Error('This drag started from an older preview. The accepted order has been restored; try again.');
  }
  if (request.orderedMediaIds.length !== order.length
    || !request.orderedMediaIds.every(id => order.includes(id))) {
    throw new Error('A reorder must retain every gallery image, including hidden photos. The accepted order has been restored.');
  }
  return [...request.orderedMediaIds];
}

// Move, rather than swap: the images between source and destination retain order.
// Operate on the complete authoritative array so hidden images are not discarded.
export function moveGalleryImage(order: readonly string[], sourceId: string, targetId: string): string[] {
  const sourceIndex = order.indexOf(sourceId);
  const targetIndex = order.indexOf(targetId);
  if (sourceIndex < 0 || targetIndex < 0) throw new Error('Image is no longer in this gallery. Reload before rearranging.');
  const next = [...order];
  const [image] = next.splice(sourceIndex, 1);
  next.splice(targetIndex, 0, image);
  return next;
}

// Preview may reorder only the already resolved media, never introduce new assets.
export function orderResolvedGallery<T extends { id: string }>(media: readonly T[], order?: readonly string[]): T[] {
  if (!order) return [...media];
  const ranks = new Map(order.map((id, index) => [id, index]));
  return [...media].sort((a, b) => (ranks.get(a.id) ?? order.length) - (ranks.get(b.id) ?? order.length));
}
