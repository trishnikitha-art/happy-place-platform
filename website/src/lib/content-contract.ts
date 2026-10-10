import { archiveSnapshot, isArchiveOrder } from './archive-order';
export type ContentCollection = 'projects' | 'services';
export interface PublicationFields { hidden?: boolean; publicationState?: 'draft'|'published'; archived?: boolean; status?: string }
export function isPublicContent(item: PublicationFields): boolean {
  return !item.hidden && !item.archived && item.status!=='archived' && (item.publicationState===undefined || item.publicationState==='published');
}
export interface ContentItem extends PublicationFields { id:string; order?:number; [key:string]:unknown }
export interface ContentCatalog { editorialRevision?:number; projects?:ContentItem[];services?:ContentItem[];[key:string]:unknown }
export interface ContentSnapshot { id:string;hidden:boolean;publicationState:'draft'|'published';order:number }
export interface ContentCopyChange { id:string;field:string;previousValue:string;value:string }
export interface ContentCopyDraft { collection:ContentCollection;id:string;field:string;value:string;editable?:boolean }
export interface ContentMutation { schema:'content.v1';collection:ContentCollection;expectedRevision:number;previous:ContentSnapshot[];next:ContentSnapshot[];copy?:ContentCopyChange[];archive?:{previous:string[];next:string[]} }
export function contentCopyLimit(collection:ContentCollection,field:string):number|null {
  if(collection==='services') return field==='name'?180:field==='description'?3000:null;
  if(collection!=='projects') return null;
  if(field==='title') return 180;
  if(['description','metaDescription','story.challenge','story.solution','story.outcome'].includes(field)) return 6000;
  return /^story\.specialFeatures\.(0|[1-9]\d?)$/.test(field)?500:null;
}
export function readContentCopy(item:ContentItem,field:string):string|undefined {
  const value=field.split('.').reduce<unknown>((current,key)=>current && typeof current==='object' ? (current as Record<string,unknown>)[key] : undefined,item);
  return typeof value==='string'?value:undefined;
}
export function contentCopyFields(collection:ContentCollection,item:ContentItem):string[] {
  const fields=collection==='services'?['name','description']:['title','description','metaDescription','story.challenge','story.solution','story.outcome'];
  const story=item.story as {specialFeatures?:unknown[]}|undefined;
  if(collection==='projects' && Array.isArray(story?.specialFeatures)) story.specialFeatures.slice(0,100).forEach((_,index)=>fields.push(`story.specialFeatures.${index}`));
  return fields.filter(field=>readContentCopy(item,field)!==undefined);
}
export function parseContentCopyDraft(input:unknown):ContentCopyDraft|null {
  if(!input || typeof input!=='object')return null;
  const draft=input as ContentCopyDraft,limit=contentCopyLimit(draft.collection,draft.field);
  return limit && typeof draft.id==='string' && /^[a-z0-9-]+$/.test(draft.id) && typeof draft.value==='string' && draft.value.length<=limit ? {collection:draft.collection,id:draft.id,field:draft.field,value:draft.value}:null;
}
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
  const copy=m.copy===undefined?undefined:m.copy;
  if(copy!==undefined && (!Array.isArray(copy) || copy.length<1 || copy.length>100 || new Set(copy.map(change=>`${change.id}:${change.field}`)).size!==copy.length))throw new Error('INVALID_CONTENT_COPY');
  copy?.forEach(change=>{
    const limit=contentCopyLimit(m.collection,change?.field);
    if(!limit || !m.previous.some(row=>row.id===change.id) || typeof change.previousValue!=='string' || typeof change.value!=='string' || !change.value.trim() || change.value.length>limit || change.previousValue.length>limit || /[\x00-\x1f\x7f<>]/.test(change.value) || change.value===change.previousValue)throw new Error('INVALID_CONTENT_COPY');
  });
  if(m.archive && (m.collection!=='projects' || !isArchiveOrder(m.archive.previous) || !isArchiveOrder(m.archive.next) || m.archive.previous.length!==m.archive.next.length || m.archive.next.some(key=>!m.archive!.previous.includes(key)) || JSON.stringify(m.archive.previous)===JSON.stringify(m.archive.next))) throw new Error('INVALID_ARCHIVE_ORDER');
  const normalize=(rows:ContentSnapshot[])=>rows.map(({id,hidden,publicationState,order})=>({id,hidden,publicationState,order}));
  const result:ContentMutation={schema:m.schema,collection:m.collection,expectedRevision:m.expectedRevision,previous:normalize(m.previous),next:normalize(m.next),...(copy?{copy:copy.map(({id,field,previousValue,value})=>({id,field,previousValue,value}))}:{}),...(m.archive?{archive:{previous:[...m.archive.previous],next:[...m.archive.next]}}:{})};
  if(JSON.stringify(result.previous)===JSON.stringify(result.next) && !copy?.length && !m.archive) throw new Error('CONTENT_UNCHANGED');
  return result;
}
export function applyContentMutation(catalog:ContentCatalog, raw:unknown):void {
  const m=decodeContentMutation(raw);
  if((catalog.editorialRevision??0)!==m.expectedRevision || JSON.stringify(contentSnapshot(catalog,m.collection))!==JSON.stringify(m.previous)) throw new Error('CONTENT_REVISION_CONFLICT');
  for(const change of m.copy??[]) {
    const item=catalog[m.collection]!.find(item=>item.id===change.id)!;
    if(readContentCopy(item,change.field)!==change.previousValue)throw new Error('CONTENT_COPY_REVISION_CONFLICT');
  }
  if(m.archive && JSON.stringify(archiveSnapshot(catalog))!==JSON.stringify(m.archive.previous)) throw new Error('ARCHIVE_REVISION_CONFLICT');
  // Stable identities, media, provenance, archival and publication authority stay intact.
  catalog[m.collection]=m.next.map(row=>({...catalog[m.collection]!.find(item=>item.id===row.id)!,hidden:row.hidden,order:row.order}));
  for(const change of m.copy??[]) {
    const item=catalog[m.collection]!.find(item=>item.id===change.id)!;
    // Clone only the editable nested path; preserve all unrelated canonical fields.
    const path=change.field.split('.');let target:Record<string,unknown>=item;
    path.slice(0,-1).forEach(key=>{const source=target[key];target[key]=Array.isArray(source)?[...source]:{...(source as Record<string,unknown>)};target=target[key] as Record<string,unknown>;});
    target[path[path.length-1]]=change.value;
  }
  if(m.archive) catalog.archiveOrder=[...m.archive.next];
  catalog.editorialRevision=m.expectedRevision+1;
}
export function moveContent(rows:ContentSnapshot[],id:string,position:number):ContentSnapshot[] {
  if(!Number.isInteger(position) || position<1 || position>rows.length || !rows.some(row=>row.id===id)) throw new Error('INVALID_CONTENT_POSITION');
  const next=rows.filter(row=>row.id!==id);next.splice(position-1,0,rows.find(row=>row.id===id)!);
  return next.map((row,index)=>({...row,order:index}));
}
