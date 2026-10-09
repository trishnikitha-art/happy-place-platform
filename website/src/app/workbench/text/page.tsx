'use client';
import { useEffect, useState } from 'react';
import { TEXT_FIELDS, type TextCatalog, type TextMutation } from '@/lib/text-contract';
type Receipt = { transactionId: string; state: string; mutation: TextMutation | null; commitSha?: string };
const key = 'homepage.hero.title';
const receiptStorage = 'hpp-text-receipt';
async function api(path: string, init?: RequestInit) {
  const r = await fetch(path, { ...init, headers: {'Content-Type':'application/json'}, cache:'no-store' });
  const body = await r.json();
  if (!r.ok) throw new Error(body.error || body.message || `Request failed (${r.status})`);
  return body;
}
export default function TextEditor() {
  const [current, setCurrent] = useState<TextCatalog | null>(null);
  const [draft, setDraft] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('Loading current text…');
  const [live, setLive] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
  async function reload() {
    setError('');
    try {
      const data = await api('/api/workbench/text');
      setCurrent(data.current); setDraft(data.current.fields[key].value);
      setPending(data.pending);
      const stored = localStorage.getItem(receiptStorage);
      if (stored) {
        setReceiptId(stored);
        const recovered = await api(`/api/workbench/text?transactionId=${encodeURIComponent(stored)}`);
        setReceipt(recovered);
        setStatus(recovered.commitSha ? 'Committed; checking Production' : 'Staged; review before deploying');
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
        const headline = new DOMParser().parseFromString(await actual.text(),'text/html').querySelector('h1')?.textContent?.trim();
        const target = receipt!.mutation?.value ?? state.current.fields[key].value;
        if (!actual.ok || headline !== target || state.deployed.fields[key].value !== target) { setStatus('Deployment ready; live headline verification pending'); return; }
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
      if (JSON.stringify(saved.mutation) !== JSON.stringify(receipt.mutation)) throw new Error('Staged change differs from review. Reload before deploying.');
      if (saved.commitSha) { setReceipt(saved); setStatus('Existing commit retained; verifying Production'); return; }
      const result = await api('/api/admin/deploy',{method:'POST',body:JSON.stringify({transactionIds:[receipt.transactionId],reason:'Workbench homepage headline edit'})});
      if (!result.commitSha) throw new Error('Deployment did not return a commit receipt');
      setReceipt({...receipt,commitSha:result.commitSha,state:'consumed'}); setStatus('Committed; Production deployment pending');
    } catch(e) { setError(e instanceof Error ? e.message : 'Deployment failed; staged change retained'); }
    finally { setBusy(false); }
  }
  function nextEdit() { localStorage.removeItem(receiptStorage); setReceipt(null); setReceiptId(null); setLive(false); void reload(); }
  const dirty = current && draft !== current.fields[key].value;
  return <div className="mx-auto max-w-5xl space-y-7 px-4 py-8 sm:px-8">
    <div><p className="text-sm text-muted">Workbench content</p><h1 className="mt-2 font-display text-3xl">Text editor</h1><p className="mt-3 text-muted">Edit, stage, review in the real page, then deploy. Staged text stays out of the public site.</p></div>
    <p role="status" className="rounded-xl bg-primary/10 p-4">{status}</p>
    {error && <p role="alert" className="rounded-xl border border-red-500 p-4">{error}</p>}
    {!receipt && pending.length > 0 && <section className="space-y-3"><h2 className="font-display text-xl">Saved text queue</h2>{pending.map(id=><button key={id} className="block min-h-11 rounded-lg border border-border px-4 text-sm" onClick={()=>{localStorage.setItem(receiptStorage,id);void reload();}}>Review saved change {id}</button>)}</section>}
    <section className="rounded-2xl border border-border bg-surface p-5 sm:p-7 space-y-4">
      <label htmlFor="headline" className="block font-semibold">{TEXT_FIELDS[key].label}</label>
      <p className="text-sm text-muted">Home → hero headline · revision {current?.fields[key].revision ?? '…'}</p>
      <textarea id="headline" className="min-h-32 w-full rounded-lg border border-border bg-background p-3 focus:outline-2 focus:outline-primary" maxLength={TEXT_FIELDS[key].maxLength} value={draft} disabled={!current || busy || !!receipt} onChange={e=>setDraft(e.target.value)} />
      <div className="flex flex-wrap gap-3">
        <button className="min-h-11 rounded-full bg-primary px-6 text-white disabled:opacity-50" disabled={!dirty || busy || !!receipt} onClick={()=>void stage()}>Save to text queue</button>
        <button className="min-h-11 rounded-full border border-border px-6 disabled:opacity-50" disabled={busy || !!receipt} onClick={()=>{setReceiptId(null);localStorage.removeItem(receiptStorage);void reload();}}>Cancel draft / reload</button>
      </div>
    </section>
    {receipt?.mutation && <section className="space-y-4 rounded-2xl border border-border p-5 sm:p-7">
      <h2 className="font-display text-2xl">Pending text change</h2>
      <dl className="grid gap-4 sm:grid-cols-2"><div><dt className="text-sm text-muted">Current</dt><dd className="mt-2 whitespace-pre-wrap">{receipt.mutation.previousValue}</dd></div><div><dt className="text-sm text-muted">Proposed</dt><dd className="mt-2 whitespace-pre-wrap font-semibold">{receipt.mutation.value}</dd></div></dl>
      <p className="break-all text-xs text-muted">Receipt: {receipt.transactionId}</p>
      {!receipt.commitSha && <><iframe title="Actual homepage with staged headline" className="h-[650px] w-full rounded-xl border border-border" src={`/workbench/preview?textTransaction=${encodeURIComponent(receipt.transactionId)}`} /><button className="min-h-11 rounded-full bg-primary px-6 text-white disabled:opacity-50" disabled={busy} onClick={()=>void deploy()}>Approve and deploy this text change</button></>}
    </section>}
    {receipt?.commitSha && <p className="break-all text-sm">Git commit: {receipt.commitSha}. {live ? 'Live rendering verified.' : 'This does not yet prove the text is live.'}</p>}
    {live && <button className="min-h-11 rounded-full border border-border px-6" onClick={nextEdit}>Start another edit</button>}
  </div>;
}
