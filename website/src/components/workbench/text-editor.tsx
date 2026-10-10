'use client';
import { useEffect, useRef, useState } from 'react';
import { TEXT_FIELDS, type TextCatalog, type TextMutation, type TextKey } from '@/lib/text-contract';
import { textDiff } from '@/lib/text-lifecycle';
import { publicationMatches } from '@/lib/text-publication';
import { isTerminalTextReceipt, isEligibleTextReceipt, prepareTextBatch } from '@/lib/text-editor-queue';
import type { TextPreviewDraft } from '@/lib/text-preview-bridge';
type Receipt = { transactionId: string; state: string; mutation: TextMutation | null; commitSha?: string; lastTransition?:string;error?:string;stagingVerified?:boolean;recoverable?:boolean };
const receiptStorage = 'hpp-text-receipt';
async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, headers: {'Content-Type':'application/json'}, cache:'no-store' });
  const body = await r.json();
  if (!r.ok) throw new Error(`${body.error || body.message || `Request failed (${r.status})`}${body.correlationId ? ` · Reference ${body.correlationId}` : ''}`);
  return body;
}
export function TextEditor({ embedded = false, active = true, selection, onPreview, onTransaction,onTargetRoute }: {
  embedded?: boolean; active?: boolean;
  selection?: { key: TextKey; request: number; value?: string; editVersion?: number };
  onPreview?: (draft: TextPreviewDraft | null) => void;
  onTransaction?: (transactionId: string | null) => void;
  onTargetRoute?: (route:string)=>void;
} = {}) {
  const [key, setKey] = useState<TextKey>('homepage.hero.title');
  const [current, setCurrent] = useState<TextCatalog | null>(null);
  const [draft, setDraft] = useState('');
  const [editVersion,setEditVersion]=useState(0);
  const [resetVersion,setResetVersion]=useState(0);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Loading current text…');
  const [live, setLive] = useState(false);
  const [transactions, setTransactions] = useState<Receipt[]>([]);
  const [servedSha,setServedSha] = useState<string|null>(null);
  const [selectedIds,setSelectedIds] = useState<string[]>([]);
  const [publicationReceipts,setPublicationReceipts] = useState<Receipt[]>([]);
  const [publicationStatus,setPublicationStatus] = useState('');
  const [catalogLoading,setCatalogLoading] = useState(false);
  const terminal = isTerminalTextReceipt;
  const lockedReceipt = receipt && !terminal(receipt);
  const queue=transactions.filter(isEligibleTextReceipt);
  const consumedSelection=useRef<typeof selection>();
  useEffect(() => {
    if (!selection || !current || consumedSelection.current===selection) return;
    consumedSelection.current=selection;
    if (busy || lockedReceipt || receiptId && !receipt) {
      if (selection.key !== key) setError('Finish or cancel the current change before editing another field.');
      return;
    }
    if(receipt && terminal(receipt)) {setReceipt(null);setReceiptId(null);localStorage.removeItem(receiptStorage);}
    const queued=transactions.find(tx=>tx.mutation?.key===selection.key && !terminal(tx));
    if(queued && queued.transactionId!==receipt?.transactionId) {setError('This field already has a saved change. Review or cancel it in Saved changes.');return;}
    if (selection.key === key) {
      if (typeof selection.value === 'string' && selection.value.length <= TEXT_FIELDS[key].maxLength && selection.editVersion && selection.editVersion>editVersion) {setDraft(selection.value);setEditVersion(selection.editVersion);}
      return;
    }
    if (draft !== current.fields[key].value) { setError('Save or cancel your current draft before selecting another field.'); return; }
    setKey(selection.key); setDraft(current.fields[selection.key].value);setEditVersion(0);setResetVersion(v=>v+1); setError('');
  }, [selection, current]);
  useEffect(() => {
    onPreview?.(active && current ? { key, value: draft, editable: !busy && !lockedReceipt && !(receiptId && !receipt),editVersion,resetVersion,queued:queue.map(tx=>({key:tx.mutation.key,value:tx.mutation.value})) } : null);
  }, [active, key, draft, current, busy, receipt, receiptId, transactions, editVersion,resetVersion,selection,onPreview]);
  useEffect(() => {
    onTransaction?.(receipt && !receipt.commitSha && receipt.stagingVerified && ['prepared','failed'].includes(receipt.state) ? receipt.transactionId : null);
  }, [receipt, onTransaction]);
  async function reload() {
    setError('');
    setCatalogLoading(true);
    try {
      const data = await api('/api/workbench/text');
      setCurrent(data.current); setDraft(data.current.fields[key].value);
      setEditVersion(0);setResetVersion(v=>v+1);
      setTransactions(data.transactions);setServedSha(data.served.commitSha);
      const stored = localStorage.getItem(receiptStorage);
      if (stored) {
        setReceiptId(stored);
        const recovered = await api(`/api/workbench/text?transactionId=${encodeURIComponent(stored)}`);
        if(terminal(recovered)) {
          localStorage.removeItem(receiptStorage);setReceiptId(null);setReceipt(null);
          setStatus('Current text loaded; completed changes are in Saved changes');
        } else {
          setReceipt(recovered);
          if (recovered.mutation) { setKey(recovered.mutation.key); setDraft(recovered.mutation.value);onTargetRoute?.(TEXT_FIELDS[recovered.mutation.key as TextKey].route); }
          setStatus(recovered.commitSha ? 'Committed; checking Production' : `Transaction state: ${recovered.state}`);
        }
      } else setStatus('Current text loaded');
    } catch (e) { setStatus('Could not load current text; saved receipts retained');setError(e instanceof Error ? e.message : 'Could not load text'); }
    finally {setCatalogLoading(false);}
  }
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    const verifying=publicationReceipts.length ? publicationReceipts : receipt?.commitSha ? [receipt] : [];
    if (!verifying.length || live) return;
    let canceled = false;
    async function check() {
      try {
        const primary=verifying[0];
        const deployment = await api(`/api/admin/deploy/status?commitSha=${primary.commitSha}`);
        if (canceled) return;
        if (['failure','error'].includes(deployment.vercelStatus)) { setPublicationStatus('Production deployment failed; receipts retained'); return; }
        if (deployment.vercelStatus !== 'success') { setPublicationStatus('Committed; Production deployment pending'); return; }
        const state = await api('/api/workbench/text');
        let hidden=false;
        for(const verifiedReceipt of verifying) {
        if(verifiedReceipt.commitSha!==primary.commitSha) throw new Error('Batch receipts do not share the same commit');
        if(verifiedReceipt.state!=='consumed') {setPublicationStatus('Matching release requires transaction reconciliation');return;}
        const route=TEXT_FIELDS[verifiedReceipt.mutation!.key].route;
        const actual = await fetch(route==='*' ? '/' : route, {cache:'no-store'});
        const document = new DOMParser().parseFromString(await actual.text(),'text/html');
        const fieldKey = verifiedReceipt.mutation!.key;
        const descriptor=TEXT_FIELDS[fieldKey] as {attribute?:string;conditional?:boolean;context?:string};
        const anchor=document.querySelector(`[data-text-key="${fieldKey}"]`);
        const headline=descriptor.attribute==='placeholder' ? anchor?.getAttribute('placeholder') : anchor?.textContent;
        const target = verifiedReceipt.mutation!.value;
        if(!anchor && (descriptor.conditional || descriptor.context?.includes('Conditional'))) {
          const exactRelease=actual.ok && publicationMatches({expectedSha:verifiedReceipt.commitSha!,statusSha:deployment.commitSha,vercelStatus:deployment.vercelStatus,statusDeploymentId:deployment.deploymentId,servedSha:document.querySelector('meta[name="hpp-git-commit"]')?.getAttribute('content'),servedDeploymentId:document.querySelector('meta[name="hpp-deployment-id"]')?.getAttribute('content'),apiSha:state.served.commitSha,apiDeploymentId:state.served.deploymentId,actualValue:state.deployed.fields[fieldKey].value,bundledValue:state.deployed.fields[fieldKey].value,expectedValue:target});
          if(exactRelease){hidden=true;continue;}
        }
        if (!actual.ok || !publicationMatches({expectedSha:verifiedReceipt.commitSha!,statusSha:deployment.commitSha,vercelStatus:deployment.vercelStatus,statusDeploymentId:deployment.deploymentId,servedSha:document.querySelector('meta[name="hpp-git-commit"]')?.getAttribute('content'),servedDeploymentId:document.querySelector('meta[name="hpp-deployment-id"]')?.getAttribute('content'),apiSha:state.served.commitSha,apiDeploymentId:state.served.deploymentId,actualValue:headline,bundledValue:state.deployed.fields[fieldKey].value,expectedValue:target})) { setPublicationStatus(`Deployment ready; ${fieldKey} does not yet match this receipt`); return; }
        if(verifiedReceipt.state!=='consumed') {setPublicationStatus('Matching release rendered; transaction requires reconciliation');return;}
        }
        if (!canceled) { setLive(true); setPublicationStatus(hidden?'Batch published in the exact release; conditional fields are hidden by the current page state.':`Live website text verified (${verifying.length} field${verifying.length===1?'':'s'})`); }
      } catch (e) { if (!canceled) setPublicationStatus(e instanceof Error ? e.message : 'Verification unavailable'); }
    }
    void check(); const timer = setInterval(() => { void check(); }, 10000);
    return () => { canceled = true; clearInterval(timer); };
  }, [receipt, publicationReceipts, live]);
  async function stage() {
    if (!current) return;
    if(transactions.some(tx=>tx.mutation?.key===key && !terminal(tx))) {setError('This field already has a saved change. Review or cancel that receipt first.');return;}
    setBusy(true); setError('');
    const id = receiptId ?? `WBDEP-${Date.now()}-${crypto.randomUUID()}`;
    setReceiptId(id); localStorage.setItem(receiptStorage,id);
    try {
      const mutation = { schema:'text.v1', key, previousValue:current.fields[key].value, expectedRevision:current.fields[key].revision, value:draft };
      const saved = await api('/api/workbench/text',{method:'POST',body:JSON.stringify({transactionId:id,mutation})});
      setReceipt(saved);setTransactions(items=>[saved,...items.filter(tx=>tx.transactionId!==saved.transactionId)]);setSelectedIds(ids=>[...new Set([...ids,id])]); setStatus('Staged; add another field or review and publish the selected changes together');
    } catch(e) { setError(e instanceof Error ? e.message : 'Stage failed; receipt retained for retry'); }
    finally { setBusy(false); }
  }
  async function deploy(reviewed:Receipt[]=receipt?[receipt]:[]) {
    if (!reviewed.length) return;
    setBusy(true); setError('');
    try {
      const fresh=await Promise.all(reviewed.map(tx=>api(`/api/workbench/text?transactionId=${encodeURIComponent(tx.transactionId)}`)));
      const approvals=prepareTextBatch(reviewed,fresh);
      const result = await api('/api/admin/deploy',{method:'POST',body:JSON.stringify({...approvals,reason:`Workbench text edits: ${reviewed.map(tx=>tx.mutation!.key).join(', ')}`})});
      if (!result.commitSha) throw new Error('Deployment did not return a commit receipt');
      const committed=await Promise.all(reviewed.map(tx=>api(`/api/workbench/text?transactionId=${encodeURIComponent(tx.transactionId)}`)));
      if(committed.some(tx=>tx.commitSha!==result.commitSha)) throw new Error('Commit receipts require reconciliation; all saved changes retained');
      setPublicationReceipts(committed);setLive(false);setPublicationStatus('Committed together; Production deployment pending');
      setSelectedIds(ids=>ids.filter(id=>!reviewed.some(tx=>tx.transactionId===id)));
      localStorage.removeItem(receiptStorage);setReceipt(null);setReceiptId(null);
      await reload();setStatus(`${committed.length} text change${committed.length===1?'':'s'} committed together`);
    } catch(e) { setError(e instanceof Error ? e.message : 'Deployment failed; all staged changes retained');try {const data=await api('/api/workbench/text');setTransactions(data.transactions);if(receipt)setReceipt(await api(`/api/workbench/text?transactionId=${receipt.transactionId}`));} catch {/* Retain every receipt and selection on uncertainty. */} }
    finally { setBusy(false); }
  }
  function publishSelected() {
    const reviewed=selectedIds.map(id=>transactions.find(tx=>tx.transactionId===id));
    if(!reviewed.length || reviewed.some(tx=>!tx)) {setError('A selected receipt is unavailable. Reload and review the entire batch.');return;}
    void deploy(reviewed as Receipt[]);
  }
  function nextEdit() { localStorage.removeItem(receiptStorage); setReceipt(null); setReceiptId(null); setDraft(current?.fields[key].value ?? '');setEditVersion(0);setResetVersion(v=>v+1);setError('');setStatus('Choose another field; saved changes remain in the queue'); }
  async function lifecycle(action:'cancel'|'reconcile') {
    if(!receipt) return;setBusy(true);setError('');
    try {const saved=await api('/api/workbench/text/lifecycle',{method:'POST',body:JSON.stringify({transactionId:receipt.transactionId,action})});setReceipt(saved);setTransactions(items=>[saved,...items.filter(tx=>tx.transactionId!==saved.transactionId)]);if(action==='cancel'){setSelectedIds(ids=>ids.filter(id=>id!==saved.transactionId));localStorage.removeItem(receiptStorage);setReceiptId(null);setReceipt(null);setDraft(current?.fields[key].value ?? saved.mutation?.previousValue ?? '');setEditVersion(0);setResetVersion(v=>v+1);}setStatus(action==='cancel'?'Staged transaction cancelled on the server':'Git receipt reconciled; checking served release');}
    catch(e) {setError(e instanceof Error?e.message:'Lifecycle operation failed; receipt retained');}
    finally {setBusy(false);}
  }
  const dirty = current && draft !== current.fields[key].value;
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(!dirty || receipt)return;event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[dirty,receipt]);
  return <div className={embedded ? "space-y-5 p-4 text-foreground" : "mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-8"}>
    <div><h2 className="font-display text-2xl">Edit text in place</h2><p className="mt-2 text-muted-foreground">Click highlighted text on the website and type directly in that field. Its font, responsive size and formatting stay the same.</p></div>
    <p role="status" className="rounded-xl bg-primary/10 p-4">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-500 p-4">{error}</p>}
    {(!current || error) && <button className="min-h-11 rounded-full border border-border px-6" disabled={catalogLoading || busy} onClick={()=>void reload()}>Retry loading current text</button>}
    {publicationStatus && <p role="status" aria-label="Publication verification" className="rounded-xl bg-primary/10 p-4">{publicationStatus}{publicationReceipts[0]?.commitSha && <span className="block break-all text-xs">Git commit: {publicationReceipts[0].commitSha}</span>}</p>}
    <p className="text-sm text-muted-foreground">Draft preview only. Save, review, then publish to change the public site. Live release: {servedSha?.slice(0,7) || 'unavailable'}.</p>
    {!receipt && transactions.length > 0 && <details open={transactions.some(tx=>!['consumed','cancelled'].includes(tx.state))} className="space-y-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Saved changes ({transactions.length})</summary>{transactions.map(tx=><div key={tx.transactionId} className="rounded-lg border border-border p-4"><button className="min-h-11 text-left text-sm underline" disabled={busy || !!dirty && !receipt || !!receiptId && !receipt} onClick={()=>{localStorage.setItem(receiptStorage,tx.transactionId);void reload();}}>Review transaction {tx.transactionId}</button>{tx.mutation && <details><summary className="min-h-11 cursor-pointer py-3">{TEXT_FIELDS[tx.mutation.key].label} — saved text</summary><dl className="space-y-2 whitespace-pre-wrap text-sm"><div><dt>Previous</dt><dd>{tx.mutation.previousValue}</dd></div><div><dt>Saved</dt><dd>{tx.mutation.value}</dd></div></dl></details>}<p className="text-sm">State: {tx.state} · Last transition: {tx.lastTransition}</p>{tx.commitSha && <p className="break-all text-xs">Git receipt: {tx.commitSha}</p>}{tx.error && <p className="text-sm text-red-700">{tx.error}</p>}</div>)}</details>}
    {queue.length>0 && <section aria-label="Queued text changes" className="space-y-4 rounded-2xl border border-border p-5">
      <h2 className="font-display text-2xl">Publish multiple text changes</h2>
      <p className="text-sm">Review each saved field, then publish the selected changes in one commit.</p>
      {queue.map(tx=><div key={tx.transactionId} className="space-y-2 rounded-xl border border-border p-4">
        <label className="flex min-h-11 items-center gap-3 font-semibold"><input type="checkbox" disabled={busy} checked={selectedIds.includes(tx.transactionId)} onChange={e=>setSelectedIds(ids=>e.target.checked?[...new Set([...ids,tx.transactionId])]:ids.filter(id=>id!==tx.transactionId))} />{TEXT_FIELDS[tx.mutation.key].label}</label>
        <div className="whitespace-pre-wrap font-mono text-sm" aria-label={`Exact diff for ${tx.mutation.key}`}>{textDiff(tx.mutation.previousValue,tx.mutation.value).map((part,i)=>part.kind==='insert'?<ins key={i} className="bg-green-100 text-green-900 no-underline">{part.text.replaceAll(' ','·')}</ins>:part.kind==='delete'?<del key={i} className="bg-red-100 text-red-900">{part.text.replaceAll(' ','·')}</del>:<span key={i}>{part.text.replaceAll(' ','·')}</span>)}</div>
        <dl className="space-y-2 whitespace-pre-wrap text-sm"><div><dt>Current</dt><dd>{tx.mutation.previousValue}</dd></div><div><dt>Proposed</dt><dd>{tx.mutation.value}</dd></div></dl>
        <button className="min-h-11 text-sm underline" disabled={busy || !!dirty && !receipt || !!receiptId && !receipt} onClick={()=>{localStorage.setItem(receiptStorage,tx.transactionId);void reload();}}>Review or cancel this saved change</button>
      </div>)}
      <button className="min-h-11 rounded-full bg-primary px-6 text-white disabled:opacity-50" disabled={busy || !selectedIds.some(id=>queue.some(tx=>tx.transactionId===id)) || !!dirty && !receipt || !!receiptId && !receipt} onClick={publishSelected}>Approve and publish selected text changes</button>
    </section>}
    {!receipt && current && <div className="space-y-2"><label htmlFor="text-field" className="block font-semibold">Choose text field</label><select id="text-field" className="min-h-11 w-full rounded-lg border border-border bg-background p-3" value={key} disabled={busy || !!receiptId && !receipt} onChange={e=>{if(dirty){setError('Save or cancel your current draft before selecting another field.');return;}const selected=e.target.value as TextKey;setKey(selected);setDraft(current.fields[selected].value);setEditVersion(0);setResetVersion(v=>v+1);onTargetRoute?.(TEXT_FIELDS[selected].route);setReceiptId(null);localStorage.removeItem(receiptStorage);setStatus('Current text loaded');}}>{(Object.keys(TEXT_FIELDS) as TextKey[]).map(field=><option key={field} value={field}>{TEXT_FIELDS[field].label}</option>)}</select></div>}
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7 space-y-4">
      <label htmlFor={`text-${key}`} className="block font-semibold">{TEXT_FIELDS[key].label}</label>
      <p className="text-sm text-muted-foreground">{TEXT_FIELDS[key].route === '*' ? 'Shared across pages' : TEXT_FIELDS[key].route} → {TEXT_FIELDS[key].label} · revision {current?.fields[key].revision ?? '…'}</p>
      <details><summary className="min-h-11 cursor-pointer py-3 text-sm">Edit as plain text</summary><textarea id={`text-${key}`} className="min-h-32 w-full rounded-lg border border-border bg-background p-3 focus:outline-2 focus:outline-primary" maxLength={TEXT_FIELDS[key].maxLength} value={draft} disabled={!current || busy || !!lockedReceipt || !!receiptId && !receipt} onChange={e=>{if(receipt && terminal(receipt)){setReceipt(null);setReceiptId(null);localStorage.removeItem(receiptStorage);}setDraft(e.target.value);setEditVersion(0);setResetVersion(v=>v+1);}} /></details>
      <div className="flex flex-wrap gap-3">
        <button className="min-h-11 rounded-full bg-primary px-6 text-white disabled:opacity-50" disabled={!dirty || busy || !!lockedReceipt} onClick={()=>void stage()}>Save to text queue</button>
        <button className="min-h-11 rounded-full border border-border px-6 disabled:opacity-50" disabled={busy || !!lockedReceipt || !!receiptId && !receipt} onClick={()=>{setReceiptId(null);setReceipt(null);localStorage.removeItem(receiptStorage);void reload();}}>Cancel draft / reload</button>
      </div>
    </section>
    {receipt?.mutation && <section className="space-y-4 rounded-2xl border border-border p-5 sm:p-7">
      <h2 className="font-display text-2xl">Text transaction review</h2>
      <p className="text-sm">{receipt.mutation.key} · Expected revision {receipt.mutation.expectedRevision} · Target route {TEXT_FIELDS[receipt.mutation.key].route} · State {receipt.state}</p>
      <div className="rounded-xl bg-surface p-4 whitespace-pre-wrap font-mono text-sm" aria-label="Exact character diff">{textDiff(receipt.mutation.previousValue,receipt.mutation.value).map((part,index)=>part.kind==='insert'?<ins key={index} className="bg-green-100 text-green-900 no-underline" aria-label="Inserted text">{part.text.replaceAll(' ','·')}</ins>:part.kind==='delete'?<del key={index} className="bg-red-100 text-red-900" aria-label="Deleted text">{part.text.replaceAll(' ','·')}</del>:<span key={index}>{part.text.replaceAll(' ','·')}</span>)}</div>
      <p className="text-xs text-muted-foreground">Green: inserted. Struck red: deleted. Dots show exact spaces. Full strings appear below.</p>
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted-foreground">Current</dt><dd className="mt-2 whitespace-pre-wrap">{receipt.mutation.previousValue}</dd></div><div><dt className="text-sm text-muted-foreground">Proposed</dt><dd className="mt-2 whitespace-pre-wrap font-semibold">{receipt.mutation.value}</dd></div></dl>
      <p className="break-all text-xs text-muted-foreground">Receipt: {receipt.transactionId}</p>
      {receipt.error && <p role="alert" className="text-red-700">{receipt.error}</p>}
      {!receipt.commitSha && receipt.stagingVerified && ['prepared','failed'].includes(receipt.state) && <>{!embedded && <iframe title="Actual homepage with staged text" className="h-[650px] w-full rounded-xl border border-border" src={`/workbench/preview?textTransaction=${encodeURIComponent(receipt.transactionId)}`} />}<button className="min-h-11 rounded-full border border-border px-6" disabled={busy} onClick={nextEdit}>Add another text field</button><button className="ml-3 min-h-11 rounded-full border border-border px-6" disabled={busy} onClick={()=>void lifecycle('cancel')}>Cancel staged transaction</button></>}
      {['committing','committed','failed'].includes(receipt.state) && <button className="min-h-11 rounded-full border border-border px-6" disabled={busy} onClick={()=>void lifecycle('reconcile')}>Reconcile retained Git receipt</button>}
    </section>}
    {receipt?.commitSha && <p className="break-all text-sm">Git commit: {receipt.commitSha}. {live ? 'Live rendering verified.' : 'This does not yet prove the text is live.'}</p>}
    {receipt && <button className="min-h-11 rounded-full border border-border px-6" disabled={busy} onClick={nextEdit}>Back to transaction dashboard</button>}
    {(live || receipt?.state==='consumed' || receipt?.state==='cancelled') && <button className="min-h-11 rounded-full border border-border px-6" onClick={nextEdit}>Start another edit</button>}
  </div>;
}
