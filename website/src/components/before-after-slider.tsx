"use client";

import { useId, useState } from 'react';
import Image from 'next/image';
import type { Project } from '@/types/projects';
import { VisualSlot } from '@/components/visual-slot';
import { cn } from '@/lib/utils';

export interface BeforeAfterPair {
  id: string;
  title: string;
  beforeMediaId: string;
  afterMediaId: string;
  county?: string;
  service?: string;
}

/** Only explicit, resolved project pairs appear. Native controls work without dragging. */
export function BeforeAfterSlider({ project, className, route = '/' }: {
  project: Project;
  className?: string;
  route?: string;
}) {
  const [position, setPosition] = useState(50);
  const inputId = useId();
  const before = project.media.beforeMedia;
  const after = project.media.afterMedia;
  if (!before || !after || before.id === after.id || before.contentHash === after.contentHash) return null;
  const beforeSrc = before.variants.web || before.variants.original || before.variants.webp;
  const afterSrc = after.variants.web || after.variants.original || after.variants.webp;
  if (!beforeSrc || !afterSrc) return null;
  const page = route.startsWith('/projects/') ? 'ProjectDetail' : route === '/our-work' ? 'OurWork' : 'Homepage';

  return <figure className={cn('overflow-hidden bg-[#EDEAE0] text-[#1F3F3C]', className)}>
    <div className="relative aspect-[4/3] overflow-hidden">
      <VisualSlot id={`slider-right-${project.id}`} route={route} page={page} section="Featured Transformations"
        slotName={`${project.title} Slider Right`} currentMediaId={project.media.after || null} component="BeforeAfterSlider" className="absolute inset-0">
        <Image src={afterSrc} alt={after.alt || `${project.title} — after`} fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" draggable={false} />
      </VisualSlot>
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <VisualSlot id={`slider-left-${project.id}`} route={route} page={page} section="Featured Transformations"
          slotName={`${project.title} Slider Left`} currentMediaId={project.media.before || null} component="BeforeAfterSlider" className="absolute inset-0">
          <Image src={beforeSrc} alt={before.alt || `${project.title} — before`} fill sizes="(max-width: 768px) 100vw, 60vw" className="object-cover" draggable={false} />
        </VisualSlot>
      </div>
      <span className="pointer-events-none absolute inset-y-0 w-0.5 bg-[#EDEAE0]" style={{ left: `${position}%` }} aria-hidden="true" />
      <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-[#162B29]/90 px-3 py-2 text-xs text-[#EDEAE0]">Before</span>
      <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-[#162B29]/90 px-3 py-2 text-xs text-[#EDEAE0]">After</span>
    </div>
    <div className="px-4 pb-4 pt-3 sm:px-6">
      <label htmlFor={inputId} className="text-sm font-medium">Compare the photographs</label>
      <input id={inputId} type="range" min={0} max={100} value={position} onChange={event => setPosition(Number(event.target.value))}
        aria-label={`Before and after comparison for ${project.title}`} aria-valuetext={`${position}% before, ${100 - position}% after`}
        className="mt-1 block h-11 w-full cursor-pointer accent-[#1F3F3C] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F3F3C]" />
      <div role="group" aria-label="Choose comparison view" className="flex gap-2">
        {[{ label: 'Before', value: 100 }, { label: 'Both', value: 50 }, { label: 'After', value: 0 }].map(option =>
          <button key={option.label} type="button" onClick={() => setPosition(option.value)} aria-pressed={position === option.value}
            className={cn('min-h-11 flex-1 rounded border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F3F3C]', position === option.value ? 'border-[#1F3F3C] bg-[#1F3F3C] text-[#EDEAE0]' : 'border-[#1F3F3C]/25 hover:bg-[#1F3F3C]/5')}>{option.label}</button>)}
      </div>
    </div>
    <figcaption className="border-t border-[#1F3F3C]/15 px-4 py-4 text-sm sm:px-6"><span className="font-medium">{project.title}</span>{project.location.city && <span className="mt-1 block text-[#1F3F3C]/65">{project.location.city}</span>}</figcaption>
  </figure>;
}