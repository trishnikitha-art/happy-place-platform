'use client';
import { useEffect, useState } from 'react';
import { TEXT_FIELDS, sameTextMutation, type TextCatalog, type TextMutation, type TextKey } from '@/lib/text-contract';
import { textDiff } from '@/lib/text-lifecycle';
import { publicationMatches } from '@/lib/text-publication';
type Receipt = { transactionId: string; state: string; mutation: TextMutation | null; commitSha?: string; lastTransition?:string;error?:string;stagingVerified?:boolean;recoverable?:boolean };
const receiptStorage = 'hpp-text-receipt';
async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, headers: {'Content-Type':'application/json'}, cache:'no-store' });
  const body = await r.json();
  if (!r.ok) throw new Error(`${body.error || body.message || `Request failed (${r.status})`}${body.correlationId ? ` · Reference ${body.correlationId}` : ''}`);
  return body;
}
export function TextEditor({ embedded = false, active = true, selection, onPreview, onTransaction }: {
  embedded?: boolean; active?: boolean;
  selection?: { key: TextKey; request: number };
  onPreview?: (draft: { key: TextKey; value: string } | null) => void;
  onTransaction?: (transactionId: string | null) => void;
} = {}) {
  const [key, setKey] = useState<TextKey>('homepage.hero.title');
  const [current, setCurrent] = useState<TextCatalog | null>(null);
  const [draft, setDraft] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Loading current text…');
  const [live, setLive] = useState(false);
  const [transactions, setTransactions] = useState<Receipt[]>([]);
  const [servedSha,setServedSha] = useState<string|null>(null);
  useEffect(() => {
    if (!selection || !current) return;
    if (busy || receipt) {
      if (selection.key !== key) setError('Finish or cancel the current change before editing another field.');
      return;
    }
    if (selection.key === key) return;
    if (draft !== current.fields[key].value) { setError('Save or cancel your current draft before selecting another field.'); return; }
    setKey(selection.key); setDraft(current.fields[selection.key].value); setError('');
  }, [selection, current]);
  useEffect(() => {
    onPreview?.(active && current ? { key, value: draft } : null);
  }, [active, key, draft, current, onPreview]);
  useEffect(() => {
    onTransaction?.(receipt && !receipt.commitSha && receipt.stagingVerified && ['prepared','failed'].includes(receipt.state) ? receipt.transactionId : null);
  }, [receipt, onTransaction]);
  async function reload() {
    setError('');
    try {
      const data = await api('/api/workbench/text');
      setCurrent(data.current); setDraft(data.current.fields[key].value);
      setTransactions(data.transactions);setServedSha(data.served.commitSha);
      const stored = localStorage.getItem(receiptStorage);
      if (stored) {
        setReceiptId(stored);
        const recovered = await api(`/api/workbench/text?transactionId=${encodeURIComponent(stored)}`);
        setReceipt(recovered);
        if (recovered.mutation) { setKey(recovered.mutation.key); setDraft(recovered.mutation.value); }
        setStatus(recovered.commitSha ? 'Committed; checking Production' : `Transaction state: ${recovered.state}`);
      } else setStatus('Current text loaded');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load text'); }
  }
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    if (!receipt?.commitSha || live) return;
    let canceled = false;
    async function check() {
      try {
        const deployment = await api(`/api/admin/deploy/status?commitSha=${receipt!.commitSha}`);
        if (canceled) return;
        if (['failure','error'].includes(deployment.vercelStatus)) { setStatus('Production deployment failed; commit retained'); return; }
        if (deployment.vercelStatus !== 'success') { setStatus('Committed; Production deployment pending'); return; }
        const state = await api('/api/workbench/text');
        const actual = await fetch('/', {cache:'no-store'});
        const document = new DOMParser().parseFromString(await actual.text(),'text/html');
        const headline = document.querySelector(`[data-text-key="${receipt!.mutation!.key}"]`)?.textContent;
        const fieldKey = receipt!.mutation!.key;
        const target = receipt!.mutation!.value;
        if (!actual.ok || !publicationMatches({expectedSha:receipt!.commitSha!,statusSha:deployment.commitSha,vercelStatus:deployment.vercelStatus,statusDeploymentId:deployment.deploymentId,servedSha:document.querySelector('meta[name="hpp-git-commit"]')?.getAttribute('content'),servedDeploymentId:document.querySelector('meta[name="hpp-deployment-id"]')?.getAttribute('content'),apiSha:state.served.commitSha,apiDeploymentId:state.served.deploymentId,actualValue:headline,bundledValue:state.deployed.fields[fieldKey].value,expectedValue:target})) { setStatus('Deployment ready; served release identity or text does not match this receipt'); return; }
        if(receipt!.state!=='consumed') {setStatus('Matching release rendered; transaction requires reconciliation');return;}
        if (!canceled) { setLive(true); setStatus('Live homepage verified'); setCurrent(state.current); setDraft(target); }
      } catch (e) { if (!canceled) setError(e instanceof Error ? e.message : 'Verification unavailable'); }
    }
    void check(); const timer = setInterval(() => { void check(); }, 10000);
    return () => { canceled = true; clearInterval(timer); };
  }, [receipt, live]);
  async function stage() {
    if (!current) return;
    setBusy(true); setError('');
    const id = receiptId ?? `WBDEP-${Date.now()}-${crypto.randomUUID()}`;
    setReceiptId(id); localStorage.setItem(receiptStorage,id);
    try {
      const mutation = { schema:'text.v1', key, previousValue:current.fields[key].value, expectedRevision:current.fields[key].revision, value:draft };
      const saved = await api('/api/workbench/text',{method:'POST',body:JSON.stringify({transactionId:id,mutation})});
      setReceipt(saved); setStatus('Staged; review before deploying');
    } catch(e) { setError(e instanceof Error ? e.message : 'Stage failed; receipt retained for retry'); }
    finally { setBusy(false); }
  }
  async function deploy() {
    if (!receipt) return;
    setBusy(true); setError('');
    try {
      const saved = await api(`/api/workbench/text?transactionId=${receipt.transactionId}`);
      if(!saved.stagingVerified || !['prepared','failed'].includes(saved.state)) throw new Error('This receipt requires reconciliation before approval.');
      if (!saved.mutation || !receipt.mutation || !sameTextMutation(saved.mutation, receipt.mutation)) throw new Error('Staged change differs from review. Reload before deploying.');
      if (saved.commitSha) { setReceipt(saved); setStatus('Existing commit retained; verifying Production'); return; }
      const result = await api('/api/admin/deploy',{method:'POST',body:JSON.stringify({transactionIds:[receipt.transactionId],textApprovals:[{transactionId:receipt.transactionId,mutation:receipt.mutation}],reason:`Workbench text edit: ${receipt.mutation!.key}`})});
      if (!result.commitSha) throw new Error('Deployment did not return a commit receipt');
      setReceipt(await api(`/api/workbench/text?transactionId=${receipt.transactionId}`)); setStatus('Committed; Production deployment pending');
    } catch(e) { setError(e instanceof Error ? e.message : 'Deployment failed; staged change retained');try {setReceipt(await api(`/api/workbench/text?transactionId=${receipt.transactionId}`));} catch {/* Retain existing receipt when dependency is unavailable. */} }
    finally { setBusy(false); }
  }
  function nextEdit() { localStorage.removeItem(receiptStorage); setReceipt(null); setReceiptId(null); setLive(false); void reload(); }
  async function lifecycle(action:'cancel'|'reconcile') {
    if(!receipt) return;setBusy(true);setError('');
    try {const saved=await api('/api/workbench/text/lifecycle',{method:'POST',body:JSON.stringify({transactionId:receipt.transactionId,action})});setReceipt(saved);if(action==='cancel')setDraft(current?.fields[key].value ?? saved.mutation?.previousValue ?? '');setStatus(action==='cancel'?'Staged transaction cancelled on the server':'Git receipt reconciled; checking served release');}
    catch(e) {setError(e instanceof Error?e.message:'Lifecycle operation failed; receipt retained');}
    finally {setBusy(false);}
  }
  const dirty = current && draft !== current.fields[key].value;
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(!dirty || receipt)return;event.preventDefault();event.returnValue='';};
    window.addEventListener('beforeunload',warn);
    return ()=>window.removeEventListener('beforeunload',warn);
  },[dirty,receipt]);
  return <div className={embedded ? "space-y-5 p-4 text-deep" : "mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-8"}>
    <div><h2 className="font-display text-2xl">Edit website text</h2><p className="mt-2 text-deep/80">Select highlighted copy in the website preview, or choose a field below. Your draft appears beside you while you type.</p></div>
    <p role="status" className="rounded-xl bg-primary/10 p-4">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-500 p-4">{error}</p>}
    <p className="text-sm text-deep/80">Draft preview only. Save, review, then publish to change the public site. Live release: {servedSha?.slice(0,7) || 'unavailable'}.</p>
    {!receipt && transactions.length > 0 && <details open={transactions.some(tx=>!['consumed','cancelled'].includes(tx.state))} className="space-y-3"><summary className="min-h-11 cursor-pointer py-3 font-semibold">Saved changes ({transactions.length})</summary>{transactions.map(tx=><div key={tx.transactionId} className="rounded-lg border border-border p-4"><button className="min-h-11 text-left text-sm underline" onClick={()=>{localStorage.setItem(receiptStorage,tx.transactionId);void reload();}}>Review transaction {tx.transactionId}</button><p className="text-sm">State: {tx.state} · Last transition: {tx.lastTransition}</p>{tx.commitSha && <p className="break-all text-xs">Git receipt: {tx.commitSha}</p>}{tx.error && <p className="text-sm text-red-700">{tx.error}</p>}</div>)}</details>}
    {!receipt && current && <div className="space-y-2"><label htmlFor="text-field" className="block font-semibold">Choose text field</label><select id="text-field" className="min-h-11 w-full rounded-lg border border-border bg-background p-3" value={key} disabled={busy} onChange={e=>{if(dirty){setError('Save or cancel your current draft before selecting another field.');return;}const selected=e.target.value as TextKey;setKey(selected);setDraft(current.fields[selected].value);setReceiptId(null);localStorage.removeItem(receiptStorage);setStatus('Current text loaded');}}>{(Object.keys(TEXT_FIELDS) as TextKey[]).map(field=><option key={field} value={field}>{TEXT_FIELDS[field].label}</option>)}</select></div>}
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7 space-y-4">
      <label htmlFor={`text-${key}`} className="block font-semibold">{TEXT_FIELDS[key].label}</label>
      <p className="text-sm text-deep/75">Home → {TEXT_FIELDS[key].label} · revision {current?.fields[key].revision ?? '…'}</p>
      <textarea id={`text-${key}`} className="min-h-32 w-full rounded-lg border border-border bg-background p-3 focus:outline-2 focus:outline-primary" maxLength={TEXT_FIELDS[key].maxLength} value={draft} disabled={!current || busy || !!receipt} onChange={e=>setDraft(e.target.value)} />
      <div className="flex flex-wrap gap-3">
        <button className="min-h-11 rounded-full bg-primary px-6 text-white disabled:opacity-50" disabled={!dirty || busy || !!receipt} onClick={()=>void stage()}>Save to text queue</button>
        <button className="min-h-11 rounded-full border border-border px-6 disabled:opacity-50" disabled={busy || !!receipt} onClick={()=>{setReceiptId(null);localStorage.removeItem(receiptStorage);void reload();}}>Cancel draft / reload</button>
      </div>
    </section>
    {receipt?.mutation && <section className="space-y-4 rounded-2xl border border-border p-5 sm:p-7">
      <h2 className="font-display text-2xl">Text transaction review</h2>
      <p className="text-sm">{receipt.mutation.key} · Expected revision {receipt.mutation.expectedRevision} · Target route {TEXT_FIELDS[receipt.mutation.key].route} · State {receipt.state}</p>
      <div className="rounded-xl bg-surface p-4 whitespace-pre-wrap font-mono text-sm" aria-label="Exact character diff">{textDiff(receipt.mutation.previousValue,receipt.mutation.value).map((part,index)=>part.kind==='insert'?<ins key={index} className="bg-green-100 text-green-900 no-underline" aria-label="Inserted text">{part.text.replaceAll(' ','·')}</ins>:part.kind==='delete'?<del key={index} className="bg-red-100 text-red-900" aria-label="Deleted text">{part.text.replaceAll(' ','·')}</del>:<span key={index}>{part.text.replaceAll(' ','·')}</span>)}</div>
      <p className="text-xs text-deep/75">Green: inserted. Struck red: deleted. Dots show exact spaces. Full strings appear below.</p>
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-deep/75">Current</dt><dd className="mt-2 whitespace-pre-wrap">{receipt.mutation.previousValue}</dd></div><div><dt className="text-sm text-deep/75">Proposed</dt><dd className="mt-2 whitespace-pre-wrap font-semibold">{receipt.mutation.value}</dd></div></dl>
      <p className="break-all text-xs text-deep/75">Receipt: {receipt.transactionId}</p>
      {receipt.error && <p role="alert" className="text-red-700">{receipt.error}</p>}
      {!receipt.commitSha && receipt.stagingVerified && ['prepared','failed'].includes(receipt.state) && <>{!embedded && <iframe title="Actual homepage with staged text" className="h-[650px] w-full rounded-xl border border-border" src={`/workbench/preview?textTransaction=${encodeURIComponent(receipt.transactionId)}`} />}<button className="min-h-11 rounded-full bg-primary px-6 text-white disabled:opacity-50" disabled={busy} onClick={()=>void deploy()}>Approve and deploy this text change</button><button className="ml-3 min-h-11 rounded-full border border-border px-6" disabled={busy} onClick={()=>void lifecycle('cancel')}>Cancel staged transaction</button></>}
      {['committing','committed','failed'].includes(receipt.state) && <button className="min-h-11 rounded-full border border-border px-6" disabled={busy} onClick={()=>void lifecycle('reconcile')}>Reconcile retained Git receipt</button>}
    </section>}
    {receipt?.commitSha && <p className="break-all text-sm">Git commit: {receipt.commitSha}. {live ? 'Live rendering verified.' : 'This does not yet prove the text is live.'}</p>}
    {receipt && <button className="min-h-11 rounded-full border border-border px-6" disabled={busy} onClick={nextEdit}>Back to transaction dashboard</button>}
    {(live || receipt?.state==='consumed' || receipt?.state==='cancelled') && <button className="min-h-11 rounded-full border border-border px-6" onClick={nextEdit}>Start another edit</button>}
  </div>;
}
