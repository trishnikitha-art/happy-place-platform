export type ContentCollection = 'projects' | 'services';
export interface PublicationFields { hidden?: boolean; publicationState?: 'draft'|'published'; archived?: boolean; status?: string }
export function isPublicContent(item: PublicationFields): boolean {
  return !item.hidden && !item.archived && item.status!=='archived' && (item.publicationState===undefined || item.publicationState==='published');
}
export interface ContentItem extends PublicationFields { id:string; order?:number; [key:string]:unknown }
export interface ContentCatalog { editorialRevision?:number; projects?:ContentItem[];services?:ContentItem[];[key:string]:unknown }
export interface ContentSnapshot { id:string;hidden:boolean;publicationState:'draft'|'published';order:number }
export interface ContentMutation { schema:'content.v1';collection:ContentCollection;expectedRevision:number;previous:ContentSnapshot[];next:ContentSnapshot[] }
export function contentSnapshot(catalog:ContentCatalog, collection:ContentCollection):ContentSnapshot[] {
  const items=catalog[collection];if(!Array.isArray(items)) throw new Error('INVALID_CONTENT_CATALOG');
  return [...items].sort((a,b)=>(a.order??999)-(b.order??999)).map((item,index)=>({id:item.id,hidden:item.hidden===true,publicationState:item.publicationState??'published',order:index}));
}
export function decodeContentMutation(raw:unknown):ContentMutation {
  const m=(typeof raw==='string'?JSON.parse(raw):raw) as ContentMutation;
  if(!m || m.schema!=='content.v1' || !['projects','services'].includes(m.collection) || !Number.isSafeInteger(m.expectedRevision) || m.expectedRevision<0) throw new Error('INVALID_CONTENT_MUTATION');
  for(const rows of [m.previous,m.next]) {
    if(!Array.isArray(rows) || rows.length<1 || rows.length>500 || new Set(rows.map(x=>x.id)).size!==rows.length) throw new Error('INVALID_CONTENT_IDS');
    rows.forEach((row,index)=>{if(!row || typeof row.id!=='string' || !/^[a-z0-9-]+$/.test(row.id) || typeof row.hidden!=='boolean' || !['draft','published'].includes(row.publicationState) || row.order!==index) throw new Error('INVALID_CONTENT_SNAPSHOT');});
  }
  if(m.previous.length!==m.next.length || m.next.some(row=>!m.previous.some(before=>before.id===row.id && before.publicationState===row.publicationState))) throw new Error('CONTENT_MEMBERSHIP_OR_PUBLICATION_CHANGE');
  if(JSON.stringify(m.previous)===JSON.stringify(m.next)) throw new Error('CONTENT_UNCHANGED');
  const normalize=(rows:ContentSnapshot[])=>rows.map(({id,hidden,publicationState,order})=>({id,hidden,publicationState,order}));
  const result={schema:m.schema,collection:m.collection,expectedRevision:m.expectedRevision,previous:normalize(m.previous),next:normalize(m.next)};
  if(JSON.stringify(result.previous)===JSON.stringify(result.next)) throw new Error('CONTENT_UNCHANGED');
  return result;
}
export function applyContentMutation(catalog:ContentCatalog, raw:unknown):void {
  const m=decodeContentMutation(raw);
  if((catalog.editorialRevision??0)!==m.expectedRevision || JSON.stringify(contentSnapshot(catalog,m.collection))!==JSON.stringify(m.previous)) throw new Error('CONTENT_REVISION_CONFLICT');
  // Only publication visibility and editorial order change. Media, story,
  // provenance, archived state, and draft publication authority remain intact.
  catalog[m.collection]=m.next.map(row=>({...catalog[m.collection]!.find(item=>item.id===row.id)!,hidden:row.hidden,order:row.order}));
  catalog.editorialRevision=m.expectedRevision+1;
}
export function moveContent(rows:ContentSnapshot[],id:string,position:number):ContentSnapshot[] {
  if(!Number.isInteger(position) || position<1 || position>rows.length || !rows.some(row=>row.id===id)) throw new Error('INVALID_CONTENT_POSITION');
  const next=rows.filter(row=>row.id!==id);next.splice(position-1,0,rows.find(row=>row.id===id)!);
  return next.map((row,index)=>({...row,order:index}));
}
