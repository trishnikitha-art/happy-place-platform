"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BeforeAfterPair {
  id: string;
  title: string;
  before: { src: string; alt: string; width: number; height: number };
  after: { src: string; alt: string; width: number; height: number };
  county?: string;
  service?: string;
}

/**
 * BeforeAfterSlider — draggable before/after reveal.
 * Grouped pairs feed this (e.g. 4×8 grids of before/afters). All client-side;
 * images are structured assets so swapping placeholders for real photos is a
 * single config change. Keyboard + reduced-motion accessible.
 */
export function BeforeAfterSlider({
  pair,
  className,
}: {
  pair: BeforeAfterPair;
  className?: string;
}) {
  const [pos, setPos] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dragging = React.useRef(false);
  const [containerW, setContainerW] = React.useState(0);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      setContainerW(entries[0].contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const setFromClientX = React.useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const pct = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, pct)));
  }, []);

  React.useEffect(() => {
    const onMove = (e: MouseEvent) => dragging.current && setFromClientX(e.clientX);
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [setFromClientX]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
    if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
  };

  return (
    <figure className={cn("group relative select-none overflow-hidden rounded-card border border-border bg-surface", className)}>
      <div
        ref={containerRef}
        className="relative aspect-[4/3] w-full"
        onMouseDown={(e) => {
          dragging.current = true;
          setFromClientX(e.clientX);
        }}
        onTouchStart={(e) => setFromClientX(e.touches[0].clientX)}
        onTouchMove={(e) => setFromClientX(e.touches[0].clientX)}
      >
        {/* AFTER (base) */}
        <Image src={pair.after.src} alt={pair.after.alt} width={pair.after.width} height={pair.after.height} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
        {/* BEFORE (clipped) */}
        <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
          <Image src={pair.before.src} alt={pair.before.alt} width={pair.before.width} height={pair.before.height} className="absolute inset-0 h-full object-cover [filter:grayscale(0.6)_brightness(0.85)_sepia(0.15)]" style={{ width: containerW || "100%", maxWidth: "none" }} draggable={false} />
        </div>
        {/* Handle */}
        <div
          className="absolute top-0 bottom-0 z-10 w-1 bg-honey shadow-[0_0_12px_rgba(217,154,78,0.7)]"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          role="slider"
          tabIndex={0}
          aria-label={`Before/after slider for ${pair.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(pos)}
          onKeyDown={onKey}
        >
          <span className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-honey text-honey-foreground shadow-md">
            <span className="text-xs font-bold">↔</span>
          </span>
        </div>
        {/* Labels */}
        <span className="absolute left-3 top-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-semibold text-text-on-dark">Before</span>
        <span className="absolute right-3 top-3 rounded-full bg-honey px-3 py-1 text-xs font-semibold text-honey-foreground">After</span>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
        <span className="font-semibold text-text">{pair.title}</span>
        {pair.county && <span className="text-text-subtle">{pair.county}</span>}
      </figcaption>
    </figure>
  );
}
