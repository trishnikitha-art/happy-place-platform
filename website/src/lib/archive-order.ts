import type { ContentCatalog } from './content-contract';

// Presentation identities retain project ownership even when photos interleave.
export const archiveKey = (projectId: string, mediaId: string) => `our-work-gallery::${projectId}::${mediaId}`;
export function isArchiveOrder(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 10000 && new Set(value).size === value.length
    && value.every(key => typeof key === 'string' && /^our-work-gallery::[a-z0-9-]+::[^:\s]+$/.test(key));
}
export function archiveSnapshot(catalog: ContentCatalog): string[] {
  const members = [...(catalog.projects ?? [])].sort((a,b)=>(a.order??999)-(b.order??999))
    .flatMap(project => ((project.media as {gallery?: string[]})?.gallery ?? []).map(id => archiveKey(project.id,id)));
  const saved = isArchiveOrder(catalog.archiveOrder) ? catalog.archiveOrder : [];
  const membership=new Set(members),ranked=new Set(saved);
  return [...saved.filter(key => membership.has(key)), ...members.filter(key => !ranked.has(key))];
}
export function moveArchive(order: readonly string[], source: string, target: string): string[] {
  const from=order.indexOf(source),to=order.indexOf(target);
  if(from<0 || to<0) throw new Error('Photo is no longer in this archive. Reload before rearranging.');
  const next=[...order];next.splice(to,0,next.splice(from,1)[0]);return next;
}
