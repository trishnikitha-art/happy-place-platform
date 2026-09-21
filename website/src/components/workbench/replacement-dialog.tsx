"use client";

import { useEffect, useRef } from 'react';
import { ArrowRight, FileImage, X } from 'lucide-react';

export interface ReplacementPreview {
  name: string;
  thumbnail?: string;
  source: 'Drive' | 'Published media';
  targets: Array<{ slotId: string; name: string; page: string; expectedRevision: number }>;
}

export function ReplacementDialog({ preview, onCancel, onConfirm }: {
  preview: ReplacementPreview;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} onCancel={onCancel} aria-labelledby="replacement-title"
    className="w-[calc(100%-2rem)] max-w-lg max-h-[85dvh] overflow-y-auto rounded-lg border border-border bg-white p-5 text-foreground backdrop:bg-black/50">
    <div className="flex items-start justify-between gap-3">
      <h2 id="replacement-title" style={{ fontSize: 18 }} className="font-semibold">Confirm replacement</h2>
      <button type="button" onClick={onCancel} aria-label="Cancel replacement" title="Cancel replacement" className="flex h-11 w-11 shrink-0 items-center justify-center"><X size={20} /></button>
    </div>
    <div className="my-4 flex items-center gap-3">
      <div className="h-20 w-24 shrink-0 overflow-hidden rounded bg-surface flex items-center justify-center">
        {preview.thumbnail ? <img src={preview.thumbnail} alt="Replacement image" className="h-full w-full object-cover" /> : <FileImage size={28} />}
      </div>
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{preview.source}</p><p className="text-sm font-medium break-all">{preview.name}</p></div>
      <ArrowRight size={20} className="shrink-0" />
      <span className="shrink-0 text-sm">{preview.targets.length} slots</span>
    </div>
    <ul className="divide-y divide-border border-y border-border">
      {preview.targets.map(t => <li key={t.slotId} className="py-3">
        <p className="text-sm font-medium break-words">{t.name}</p>
        <p className="text-xs text-muted-foreground break-all">{t.page} / {t.slotId} / Revision {t.expectedRevision}</p>
      </li>)}
    </ul>
    <div className="mt-5 flex flex-wrap justify-end gap-3">
      <button type="button" onClick={onCancel} className="min-h-11 px-4 text-sm">Cancel</button>
      <button type="button" onClick={onConfirm} className="min-h-11 rounded bg-primary px-4 text-sm font-medium text-white">Replace {preview.targets.length} Slots</button>
    </div>
  </dialog>;
}
