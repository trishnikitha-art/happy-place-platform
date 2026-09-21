"use client";

import { FileImage, Lock } from 'lucide-react';
import type { RegisteredSlot } from '@/lib/slot-registry';
import type { VisualAsset } from '@/lib/visual-asset-registry';
import { resolveAssignmentKey } from '@/lib/workbench-assignment-contract';

export function SlotGallery({ slots, assets, selected, disabled, onSelect }: {
  slots: RegisteredSlot[];
  assets: VisualAsset[];
  selected: RegisteredSlot[];
  disabled: boolean;
  onSelect: (slot: RegisteredSlot, toggle: boolean) => void;
}) {
  const sections = [...new Set(slots.map(s => s.section))];
  if (!slots.length) return <p className="p-5 text-sm text-muted-foreground" role="status">No registered slots on this page.</p>;
  return <div className="space-y-6 p-4" aria-label="Page slots">
    {sections.map(section => <section key={section} aria-label={section}>
      <h2 style={{ fontSize: 14 }} className="mb-3 font-semibold text-foreground">{section}</h2>
      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-3">
        {slots.filter(s => s.section === section).map(slot => {
          const asset = assets.find(a => a.id === slot.currentMediaId);
          const thumbnail = asset?.variants?.thumbnail || asset?.variants?.webp || asset?.variants?.original;
          const writable = !!resolveAssignmentKey(slot.id);
          const checked = selected.some(s => s.id === slot.id);
          return <article key={slot.id} data-slot-card={slot.id}
            className={`min-w-0 overflow-hidden rounded-md border-2 bg-white ${checked ? 'border-primary' : 'border-border'}`}>
            <button type="button" disabled={disabled || !writable} aria-pressed={checked}
              aria-label={`Select ${slot.slotName}`} onClick={e => onSelect(slot, e.ctrlKey || e.metaKey)}
              className="block w-full text-left disabled:cursor-default focus-visible:outline-2 focus-visible:outline-primary">
              <div className="aspect-[4/3] w-full bg-surface flex items-center justify-center overflow-hidden">
                {thumbnail ? <img src={thumbnail} alt={asset?.alt || slot.slotName} className="h-full w-full object-cover" loading="lazy" />
                  : <FileImage size={28} className="text-muted-foreground" />}
              </div>
              <div className="p-3 pb-1">
                <h3 style={{ fontSize: 14 }} className="font-semibold break-words">{slot.slotName}</h3>
                <p className="mt-1 text-xs text-muted-foreground break-words">{slot.page} / {section}</p>
                <p className="mt-2 text-xs break-all">{asset?.filename || slot.currentMediaId || 'Unassigned'}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {asset ? `${asset.provenance?.driveFileId ? 'Drive import' : 'Local'} / ${asset.lifecycleState === 'published' ? 'Published' : 'Unavailable'}` : slot.currentMediaId ? 'Media unavailable' : 'Empty'}
                </p>
              </div>
            </button>
            <div className="px-3 pb-2">
              {writable ? <label className="flex min-h-11 items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={checked} disabled={disabled}
                  onChange={() => onSelect(slot, true)} aria-label={`Include ${slot.slotName}`} className="h-4 w-4 accent-primary" />
                {checked ? 'Selected' : 'Select slot'}
              </label> : <span className="flex min-h-11 items-center gap-2 text-xs text-muted-foreground"><Lock size={13} />Read-only</span>}
            </div>
          </article>;
        })}
      </div>
    </section>)}
  </div>;
}
