export interface WorkbenchAssetPayload {
  source: 'local' | 'google-drive' | 'drive';
  iframeGeneration: number;
  assetId?: string;
  fileId?: string;
  fileName?: string;
  mimeType?: string;
  [key: string]: unknown;
}

const identity = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.trim() === value;

export function parseDropJson(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

/** Schema and generation acceptance; storage/OAuth authority stays server-side. */
export function readWorkbenchAsset(value: unknown, generation: number | null): WorkbenchAssetPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !Number.isSafeInteger(generation) || generation === null || generation < 0) return null;
  const payload = value as WorkbenchAssetPayload;
  if (payload.iframeGeneration !== generation) return null;
  if (payload.source === 'local') {
    return identity(payload.assetId) && !payload.assetId.startsWith('drive-') && !payload.fileId ? payload : null;
  }
  if (payload.source !== 'google-drive' && payload.source !== 'drive') return null;
  if (!identity(payload.fileId) || !identity(payload.fileName) || !identity(payload.mimeType)
    || !(payload.mimeType.startsWith('image/') || payload.mimeType === 'application/vnd.google-apps.shortcut')) return null;
  return payload;
}

export interface GalleryReorderPayload {
  type: 'GALLERY_REORDER';
  sourceMediaId: string;
  sourceSlotId: string;
  projectId: string;
  iframeGeneration: number;
}

export function readGalleryReorder(value: unknown, target: {
  projectId?: string; mediaId: string | null; slotId: string; generation: number | null;
}): GalleryReorderPayload | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || !identity(target.projectId) || !identity(target.mediaId)
    || !Number.isSafeInteger(target.generation) || target.generation === null || target.generation < 0) return null;
  const payload = value as GalleryReorderPayload;
  return payload.type === 'GALLERY_REORDER' && payload.projectId === target.projectId
    && identity(payload.sourceMediaId) && payload.sourceMediaId !== target.mediaId
    && payload.sourceSlotId === `our-work-gallery::${target.projectId}::${payload.sourceMediaId}`
    && target.slotId === `our-work-gallery::${target.projectId}::${target.mediaId}`
    && payload.iframeGeneration === target.generation ? payload : null;
}
