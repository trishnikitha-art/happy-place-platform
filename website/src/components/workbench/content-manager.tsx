'use client';
import { useEffect,useRef,useState } from 'react';
import { contentSnapshot,moveContent,isPublicContent,contentCopyFields,contentCopyLimit,readContentCopy,type ContentCopyDraft,type ContentCatalog,type ContentCollection,type ContentMutation,type ContentSnapshot } from '@/lib/content-contract';
import { publicationMatches } from '@/lib/text-publication';
import { textDiff } from '@/lib/text-lifecycle';
import { ItemMenu } from './item-menu';
type Receipt={transactionId:string;state:string;mutation:ContentMutation;commitSha?:string;error?:string;stagingVerified:boolean};
async function api(path:string,body?:unknown) {
  const response=await fetch(path,{cache:'no-store',...(body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
  const value=await response.json();if(!response.ok) throw new Error(`${value.error||'Request failed'}${value.correlationId?` · Reference ${value.correlationId}`:''}`);return value;
}
export interface ContentCopySelection {collection:ContentCollection;id:string;field:string;request:number;value?:string;editVersion?:number;resetVersion?:number}
export function ContentManager({onPreviewRoute,selection,onCopyPreview,onTransaction,active=true}:{onPreviewRoute?:(route:string)=>void;selection?:ContentCopySelection;onCopyPreview?:(draft:(ContentCopyDraft & {editVersion:number;resetVersion:number})|null)=>void;onTransaction?:(id:string|null)=>void;active?:boolean} = {}) {
  const [collection,setCollection]=useState<ContentCollection>('projects');
  const [current,setCurrent]=useState<ContentCatalog|null>(null),[deployed,setDeployed]=useState<ContentCatalog|null>(null);
  const [receipt,setReceipt]=useState<Receipt|null>(null),[history,setHistory]=useState<Receipt[]>([]),[undo,setUndo]=useState<{previous:ContentSnapshot[];published:ContentSnapshot[]}|null>(null);
  const [search,setSearch]=useState(''),[filter,setFilter]=useState('all'),[busy,setBusy]=useState(false),[notice,setNotice]=useState('Loading items…'),[error,setError]=useState('');
  const [positions,setPositions]=useState<Record<string,string>>({});const locked=useRef(false);const loadGeneration=useRef(0);const consumedSelection=useRef<ContentCopySelection>();
  const [copy,setCopy]=useState<{id:string;field:string;value:string}|null>(null);
  const [editVersion,setEditVersion]=useState(0),[resetVersion,setResetVersion]=useState(0);
  async function reload() {
    const generation=++loadGeneration.current;const data=await api(`/api/workbench/content?collection=${collection}`);if(generation!==loadGeneration.current)return;setCurrent(data.current);setDeployed(data.deployed);setHistory(data.transactions);
    const pending=data.transactions.filter((tx:Receipt)=>!['consumed','cancelled'].includes(tx.state));
    setReceipt(pending.length===1?pending[0]:null);setNotice(pending.length>1?'Multiple retained transactions require review before another edit.':'Current content loaded');
  }
  useEffect(()=>{setCurrent(null);setReceipt(null);setUndo(null);setError('');void reload().catch(e=>setError(e.message));return ()=>{loadGeneration.current++;};},[collection]);
  const pending=history.filter(tx=>!['consumed','cancelled'].includes(tx.state));
  const rows=current&&Array.isArray(current[collection])?(receipt?.mutation.collection===collection?receipt.mutation.next:contentSnapshot(current,collection)):[];
  const copyItem=copy&&current?.[collection]?.find(item=>item.id===copy.id);
  const copyDirty=!!copy && !!copyItem && copy.value!==readContentCopy(copyItem,copy.field);
  useEffect(()=>{
    if(!selection || busy || receipt || pending.length || consumedSelection.current===selection)return;
    if(copyDirty && (selection.collection!==collection || selection.id!==copy?.id || selection.field!==copy.field)){setError('Save or cancel the current copy draft before selecting another field.');return;}
    if(selection.collection!==collection){setCopy(null);setCollection(selection.collection);return;}
    const item=current?.[collection]?.find(item=>item.id===selection.id),previous=item&&readContentCopy(item,selection.field);
    if(previous===undefined || !contentCopyLimit(collection,selection.field))return;
    const existing=copy&&current?.[collection]?.find(item=>item.id===copy.id);
    if(copy && (copy.id!==selection.id || copy.field!==selection.field) && existing && copy.value!==readContentCopy(existing,copy.field)){setError('Save or cancel the current copy draft before selecting another field.');return;}
    consumedSelection.current=selection;if(selection.value!==undefined && (selection.resetVersion!==resetVersion || (selection.editVersion??0)<=editVersion))return;if(selection.value===undefined){setEditVersion(0);setResetVersion(v=>v+1);}setCopy({id:selection.id,field:selection.field,value:selection.value??previous});
    if(selection.value!==undefined)setEditVersion(selection.editVersion??selection.request);
  },[selection,current,collection]);
  useEffect(()=>{
    const change=receipt?.mutation.copy?.[0];
    onCopyPreview?.(active && current && (copy || change)?{collection,id:change?.id??copy!.id,field:change?.field??copy!.field,value:change?.value??copy!.value,editable:!busy&&!receipt&&!pending.length,editVersion,resetVersion}:null);
  },[active,current,copy,receipt,busy,editVersion,resetVersion,onCopyPreview]);
  useEffect(()=>{onTransaction?.(receipt?.stagingVerified && !receipt.commitSha && ['prepared','failed'].includes(receipt.state)?receipt.transactionId:null);},[receipt,onTransaction]);
  async function stage(next:ContentSnapshot[],copyChanges?:ContentMutation['copy']) {
    if(!current || locked.current || receipt || pending.length) return;
    if(copyDirty&&!copyChanges){setError('Save or cancel the current copy draft before changing visibility or order.');return;}
    const previous=contentSnapshot(current,collection);if(JSON.stringify(previous)===JSON.stringify(next) && !copyChanges?.length) {setNotice('Already in that position; no change saved.');return;}
    locked.current=true;setBusy(true);setError('');
    try {
      const mutation:ContentMutation={schema:'content.v1',collection,expectedRevision:current.editorialRevision??0,previous,next,...(copyChanges?{copy:copyChanges}:{})};
      const saved=await api('/api/workbench/content',{transactionId:`WBDEP-${Date.now()}-${crypto.randomUUID()}`,mutation});
      setReceipt(saved);setHistory(prev=>[...prev,saved]);setNotice('Saved to the publication queue. Review and publish to update the site.');
    } catch(e) {setError(e instanceof Error?e.message:'Save failed. Last confirmed order retained.');}
    finally {locked.current=false;setBusy(false);}
  }
  async function publish() {
    if(!receipt || locked.current) return;locked.current=true;setBusy(true);setError('');
    try {
      let saved=await api(`/api/workbench/content?transactionId=${receipt.transactionId}`);
      if(!saved.commitSha) {
        if(saved.state!=='prepared' || !saved.stagingVerified) throw new Error('Retained transaction requires investigation; a second commit will not be submitted.');
        if(JSON.stringify(saved.mutation)!==JSON.stringify(receipt.mutation))throw new Error('Saved change differs from the reviewed receipt. Reload before approval.');
        const result=await api('/api/admin/deploy',{transactionIds:[saved.transactionId],contentApprovals:[{transactionId:saved.transactionId,mutation:receipt.mutation}],reason:`Workbench ${collection} copy/visibility/order`});
        if(!result.commitSha) throw new Error('No Git commit receipt returned');
        saved=await api(`/api/workbench/content?transactionId=${saved.transactionId}`);setReceipt(saved);
      }
      const status=await api(`/api/admin/deploy/status?commitSha=${saved.commitSha}`);
      const data=await api(`/api/workbench/content?collection=${collection}`);
      const home=await fetch('/',{cache:'no-store'});const html=new DOMParser().parseFromString(await home.text(),'text/html');
      if(!home.ok || !publicationMatches({expectedSha:saved.commitSha,statusSha:status.commitSha,statusDeploymentId:status.deploymentId,vercelStatus:status.vercelStatus,servedSha:html.querySelector('meta[name="hpp-git-commit"]')?.getAttribute('content'),servedDeploymentId:html.querySelector('meta[name="hpp-deployment-id"]')?.getAttribute('content'),apiSha:data.served.commitSha,apiDeploymentId:data.served.deploymentId,expectedValue:JSON.stringify(saved.mutation.next),actualValue:JSON.stringify(contentSnapshot(data.deployed,collection)),bundledValue:JSON.stringify(contentSnapshot(data.deployed,collection))})) {setNotice('Git change saved; waiting for the exact Production release. Check publication again.');return;}
      for(const change of saved.mutation.copy??[]) {
        const item=data.deployed[collection]?.find((item:{id:string})=>item.id===change.id);
        if(!item || readContentCopy(item,change.field)!==change.value)throw new Error('Deployed canonical copy differs from the approved receipt.');
        const route=`/${collection}/${String(item.slug??item.id)}`;
        const response=await fetch(route,{cache:'no-store'}),page=new DOMParser().parseFromString(await response.text(),'text/html');
        const anchor=page.querySelector(`[data-content-collection="${collection}"][data-content-id="${change.id}"][data-content-field="${change.field}"]`);
        // Description/metadata fields without a public anchor cannot be called rendered.
        if(!response.ok || !publicationMatches({expectedSha:saved.commitSha,statusSha:status.commitSha,statusDeploymentId:status.deploymentId,vercelStatus:status.vercelStatus,servedSha:page.querySelector('meta[name="hpp-git-commit"]')?.getAttribute('content'),servedDeploymentId:page.querySelector('meta[name="hpp-deployment-id"]')?.getAttribute('content'),apiSha:data.served.commitSha,apiDeploymentId:data.served.deploymentId,expectedValue:change.value,actualValue:anchor?.textContent,bundledValue:readContentCopy(item,change.field)??''})){setNotice('Canonical copy deployed; its exact public rendering still requires verification.');return;}
      }
      if(saved.state!=='consumed') throw new Error('Matching release rendered, but lifecycle cleanup requires investigation.');
      setUndo(saved.mutation.copy?null:{previous:saved.mutation.previous,published:saved.mutation.next});setCopy(null);setResetVersion(value=>value+1);await reload();setNotice('Published and verified in Production.');
    } catch(e) {setError(e instanceof Error?e.message:'Publication failed; server receipt retained.');try {setReceipt(await api(`/api/workbench/content?transactionId=${receipt.transactionId}`));} catch {/* Preserve the known receipt. */}}
    finally {locked.current=false;setBusy(false);}
  }
  async function cancel() {
    if(!receipt || locked.current) return;locked.current=true;setBusy(true);setError('');
    try {await api('/api/workbench/content/cancel',{transactionId:receipt.transactionId});setCopy(null);setResetVersion(value=>value+1);await reload();setNotice('Staged change cancelled. Confirmed content retained.');}
    catch(e) {setError(e instanceof Error?e.message:'Cancellation failed; receipt retained.');}
    finally {locked.current=false;setBusy(false);}
  }
  const filtered=rows.filter(row=>{
    const item=current?.[collection]?.find(item=>item.id===row.id);const name=String(item?.title??item?.name??row.id);
    return `${name} ${row.id}`.toLowerCase().includes(search.toLowerCase()) && (filter==='all' || (filter==='hidden'?row.hidden:filter==='draft'?row.publicationState==='draft':isPublicContent({...item,...row})));
  });
  return <section aria-label="Content collections" className="space-y-4 rounded-2xl border border-border bg-surface p-4 sm:p-6">
    <div><h2 className="font-display text-2xl">Services & project stories</h2><p className="mt-2 text-sm text-deep/75">Click copy in the website preview to edit its canonical service or project. Save, review and publish through the same queue as visibility and order.</p></div>
    {copy&&current&&<section aria-label="Canonical content copy" className="space-y-3 rounded-lg bg-background p-4"><p className="font-semibold">{copy.id} · {copy.field}</p><label>Canonical copy field<select aria-label="Canonical copy field" disabled={busy||!!receipt||pending.length>0} value={copy.field} onChange={event=>{const item=current[collection]!.find(item=>item.id===copy.id)!;if(copy.value!==readContentCopy(item,copy.field)){setError('Save or cancel your draft before switching fields.');return;}setCopy({...copy,field:event.target.value,value:readContentCopy(item,event.target.value)!});setResetVersion(value=>value+1);}} className="ml-2 min-h-11 max-w-full rounded border border-border bg-background px-3">{contentCopyFields(collection,current[collection]!.find(item=>item.id===copy.id)!).map(field=><option key={field} value={field}>{field}</option>)}</select></label><p className="text-xs">{collection}.v1.json · revision {current.editorialRevision??0}. Draft changes are local until saved.</p><details><summary className="min-h-11 cursor-pointer py-3">Edit as plain text</summary><textarea aria-label={`Edit ${copy.id} ${copy.field}`} disabled={busy||!!receipt||pending.length>0} maxLength={contentCopyLimit(collection,copy.field)??undefined} value={copy.value} onChange={event=>{setCopy({...copy,value:event.target.value});setEditVersion(value=>value+1);}} className="min-h-32 w-full rounded border border-border bg-background p-3" /></details><button disabled={busy||!!receipt||pending.length>0||copy.value===readContentCopy(current[collection]!.find(item=>item.id===copy.id)!,copy.field)} className="min-h-11 rounded bg-primary px-4 text-white disabled:opacity-40" onClick={()=>{const item=current[collection]!.find(item=>item.id===copy.id)!;void stage(contentSnapshot(current,collection),[{id:copy.id,field:copy.field,previousValue:readContentCopy(item,copy.field)!,value:copy.value}]);}}>Save copy to queue</button><button disabled={busy||!!receipt} className="ml-3 min-h-11 underline" onClick={()=>{setCopy(null);setResetVersion(value=>value+1);}}>Cancel copy draft</button></section>}
    <div className="flex flex-wrap gap-3"><label>Collection<select aria-label="Content collection" disabled={busy||!!receipt||pending.length>0||copyDirty} value={collection} onChange={e=>{setCurrent(null);setDeployed(null);setHistory([]);setReceipt(null);setPositions({});setCollection(e.target.value as ContentCollection);}} className="ml-2 min-h-11 rounded border border-border bg-background px-3"><option value="projects">Projects & stories</option><option value="services">Services</option></select></label><label className="flex-1 min-w-0">Search<input aria-label="Search content" value={search} onChange={e=>setSearch(e.target.value)} className="mt-1 block min-h-11 w-full rounded border border-border bg-background px-3" /></label><select aria-label="Filter publication state" value={filter} onChange={e=>setFilter(e.target.value)} className="min-h-11 rounded border border-border bg-background px-3"><option value="all">All states</option><option value="visible">Visible</option><option value="hidden">Hidden</option><option value="draft">Draft</option></select></div>
    <button type="button" disabled={busy} className="min-h-11 underline disabled:opacity-40" onClick={()=>{if(copyDirty){setError('Save or cancel your copy draft before reloading.');return;}void reload().catch(e=>setError(e.message));}}>Reload confirmed content</button><p role="status" className="text-sm">{notice} · {filtered.length} of {rows.length} items</p>{error&&<p role="alert" className="text-sm text-red-700 dark:text-red-300">{error}</p>}
    {receipt&&<div className="rounded-xl border border-amber-500 p-4 space-y-2"><p className="text-sm">Pending publication · {receipt.state} · revision {receipt.mutation.expectedRevision}</p><p className="break-all text-xs">Receipt: {receipt.transactionId}{receipt.commitSha&&` · Commit ${receipt.commitSha}`}</p>{receipt.error&&<p role="alert">{receipt.error}</p>}<button type="button" disabled={busy} onClick={()=>void publish()} className="min-h-11 rounded bg-primary px-4 text-white disabled:opacity-40">{busy?'Working…':receipt.commitSha?'Check publication':'Publish reviewed changes'}</button>{!receipt.commitSha&&receipt.state==='prepared'&&<button type="button" disabled={busy} onClick={()=>void cancel()} className="ml-3 min-h-11 underline">Cancel staged change</button>}<ul className="text-sm space-y-1">{receipt.mutation.copy?.map(change=><li key={`${change.id}:${change.field}`}><p>{change.id} · {change.field}</p><p className="whitespace-pre-wrap">Before: {change.previousValue}</p><p className="whitespace-pre-wrap">After: {change.value}</p><div aria-label="Exact character diff" className="whitespace-pre-wrap font-mono text-xs">{textDiff(change.previousValue,change.value).map((part,index)=>part.kind==='insert'?<ins key={index} className="bg-green-100 text-green-900">{part.text.replaceAll(' ','·')}</ins>:part.kind==='delete'?<del key={index} className="bg-red-100 text-red-900">{part.text.replaceAll(' ','·')}</del>:<span key={index}>{part.text.replaceAll(' ','·')}</span>)}</div></li>)}{receipt.mutation.next.map(after=>{const before=receipt.mutation.previous.find(row=>row.id===after.id)!;return before.hidden!==after.hidden||before.order!==after.order?<li key={after.id}>{after.id}: {before.hidden!==after.hidden?`${before.hidden?'Hidden':'Visible'} → ${after.hidden?'Hidden':'Visible'}`:null}{before.order!==after.order?` · Position ${before.order+1} → ${after.order+1}`:null}</li>:null;})}</ul><p className="text-xs">{receipt.mutation.previous.filter((row,index)=>JSON.stringify(row)!==JSON.stringify(receipt.mutation.next[index])).length} positions or visibility states changed. Public copy stays on the deployed catalog until verified publication.</p></div>}
    {!receipt&&pending.map(tx=><div key={tx.transactionId} className="break-all text-sm"><p>Retained transaction {tx.transactionId}: {tx.state} {tx.error}</p><button type="button" disabled={busy} className="min-h-11 underline" aria-label={`Review retained change ${tx.transactionId}`} onClick={()=>setReceipt(tx)}>Review retained change</button></div>)}
    {undo&&!receipt&&!pending.length&&<button type="button" disabled={busy} className="min-h-11 underline" onClick={()=>{if(current&&JSON.stringify(contentSnapshot(current,collection))===JSON.stringify(undo.published))void stage(undo.previous);else setError('Content changed since this publication. Reload and review the current collection before restoring.');}}>Undo last publication through a new reviewed change</button>}
    <div className="space-y-3">{filtered.map(row=>{
      const item=current![collection]!.find(item=>item.id===row.id)!;const name=String(item.title??item.name??row.id);
      const deployedRow=deployed&&Array.isArray(deployed[collection])?contentSnapshot(deployed,collection).find(item=>item.id===row.id):null;
      const archived=!!item.archived||item.status==='archived';
      const state=archived?'Archived':row.publicationState==='draft'?'Draft / unpublished':row.hidden?'Hidden':'Published / visible';
      const changed=!!deployedRow&&(row.hidden!==deployedRow.hidden||row.order!==deployedRow.order);
      const disabled=busy||!!receipt||pending.length>0;
      const move=(position:number)=>void stage(moveContent(rows,row.id,position));
      return <div key={row.id} data-content-id={row.id} className="rounded-xl border border-border bg-background p-4"><ItemMenu name={name} disabled={disabled} actions={[
        {label:'Edit copy',disabled:copyDirty,run:()=>{const field=collection==='services'?'name':'title';setCopy({id:row.id,field,value:readContentCopy(item,field)??''});onPreviewRoute?.(`/${collection}/${String(item.slug??item.id)}`);}},
        {label:row.hidden?'Show on site':'Hide from site',disabled:archived||row.publicationState==='draft',run:()=>void stage(rows.map(item=>item.id===row.id?{...item,hidden:!item.hidden}:item))},
        {label:'Move to beginning',disabled:row.order===0,run:()=>move(1)},
        {label:'Move to end',disabled:row.order===rows.length-1,run:()=>move(rows.length)},
      ]}><h3 className="font-semibold">{name}</h3><p className="mt-1 text-sm">{state}{changed?' · Pending deployed update':''}</p><p className="mt-1 text-xs text-deep/75">{row.id} · Position {row.order+1} of {rows.length}</p></ItemMenu>
        <div className="mt-3 flex flex-wrap items-center gap-2"><label htmlFor={`position-${row.id}`} className="text-sm">Move to position</label><input id={`position-${row.id}`} aria-label={`Move ${name} to position`} type="number" min={1} max={rows.length} disabled={disabled} value={positions[row.id]??String(row.order+1)} onChange={e=>setPositions(prev=>({...prev,[row.id]:e.target.value}))} className="min-h-11 w-20 rounded border border-border bg-background px-2"/><button type="button" disabled={disabled} className="min-h-11 rounded border border-border px-4 disabled:opacity-40" onClick={()=>{try {move(Number(positions[row.id]??row.order+1));}catch(e){setError(e instanceof Error?e.message:'Invalid position');}}}>Move</button><button type="button" disabled={disabled||row.order===0} className="min-h-11 min-w-11 rounded border border-border disabled:opacity-40" aria-label={`Move ${name} one position earlier`} onClick={()=>move(row.order)}>↑</button><button type="button" disabled={disabled||row.order===rows.length-1} className="min-h-11 min-w-11 rounded border border-border disabled:opacity-40" aria-label={`Move ${name} one position later`} onClick={()=>move(row.order+2)}>↓</button>{!archived&&row.publicationState==='published'&&!row.hidden&&<a onClick={event=>{if(onPreviewRoute && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey){event.preventDefault();onPreviewRoute(event.currentTarget.pathname.replace('/workbench/preview',''));}}} className="min-h-11 inline-flex items-center underline" href={`/workbench/preview/${collection==='projects'?'projects':'services'}/${String(item.slug??item.id)}?workbench=true`}>Open {collection==='projects'?'story':'service'}</a>}</div>
        </div>;
    })}</div>
  </section>;
}
