"use client";

import * as React from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { GalleryItem } from "@/types";
import { cn } from "@/lib/utils";

/**
 * GalleryLightbox — responsive grid + accessible lightbox.
 * Keyboard: ←/→ navigate, Esc closes. Mobile: swipe left/right. Images lazy-load.
 * Reusable for any service business (renders GalleryItem[] from config).
 */
export function GalleryLightbox({ items, className }: { items: GalleryItem[]; className?: string }) {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  const touchStartX = React.useRef<number | null>(null);
  const dialogRef = React.useRef<HTMLDivElement>(null);

  const show = (i: number) => {
    setIndex(i);
    setOpen(true);
  };
  const close = React.useCallback(() => setOpen(false), []);
  const next = React.useCallback(() => setIndex((i) => (i + 1) % items.length), [items.length]);
  const prev = React.useCallback(() => setIndex((i) => (i - 1 + items.length) % items.length), [items.length]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, next, prev]);

  const current = items[index];

  return (
    <>
      {/* Responsive grid (clean grid, not masonry — Directive 023 v1) */}
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
        {items.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => show(i)}
            className="group relative overflow-hidden rounded-card border border-border bg-surface-muted focus-visible:ring-2 focus-visible:ring-primary"
            aria-label={`View ${item.project}`}
          >
            <Image
              src={item.src}
              alt={item.alt}
              width={item.width}
              height={item.height}
              loading="lazy"
              placeholder={item.blurDataURL ? "blur" : undefined}
              blurDataURL={item.blurDataURL}
              className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            {item.beforeAfter && (
              <span className="absolute left-3 top-3 rounded-full bg-secondary/80 px-2 py-1 text-xs font-semibold uppercase text-secondary-foreground">
                {item.beforeAfter}
              </span>
            )}
            <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-secondary/80 to-transparent p-4 text-left text-sm font-medium text-white">
              {item.project}
            </span>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {open && current && (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${current.project} — image ${index + 1} of ${items.length}`}
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={close}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 50) (dx < 0 ? next : prev)();
            touchStartX.current = null;
          }}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
          >
            <X className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous image"
            className="absolute left-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:left-6"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>

          <figure className="max-h-[85vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={current.src}
              alt={current.alt}
              width={current.width}
              height={current.height}
              className="max-h-[80vh] w-auto rounded-lg object-contain"
              sizes="100vw"
              priority
            />
            <figcaption className="mt-3 text-center text-sm text-white/80">
              {current.project} — {index + 1} / {items.length}
            </figcaption>
          </figure>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next image"
            className="absolute right-2 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 sm:right-6"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      )}
    </>
  );
}
