"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

interface LightboxImage { src: string; alt: string; blurDataURL?: string }
interface ProjectLightboxProps {
  images: LightboxImage[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

/** Full photographs with keyboard, touch and native modal focus handling. */
export function ProjectLightbox({ images, initialIndex = 0, isOpen, onClose }: ProjectLightboxProps) {
  const [mounted, setMounted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isZoomed, setIsZoomed] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const captionId = useId();
  const hasImages = images.length > 0;
  const safeIndex = Math.max(0, Math.min(currentIndex, images.length - 1));
  const currentImage = images[safeIndex];

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(Math.max(0, Math.min(initialIndex, images.length - 1)));
      setIsZoomed(false);
    }
  }, [isOpen, initialIndex, images.length]);

  // The native modal makes the page inert and traps focus in the viewer.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!mounted || !isOpen || !hasImages || !dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, [mounted, isOpen, hasImages]);

  const goToNext = useCallback(() => {
    if (!images.length) return;
    setCurrentIndex((index) => (Math.max(0, Math.min(index, images.length - 1)) + 1) % images.length);
    setIsZoomed(false);
  }, [images.length]);
  const goToPrevious = useCallback(() => {
    if (!images.length) return;
    setCurrentIndex((index) => (Math.max(0, Math.min(index, images.length - 1)) - 1 + images.length) % images.length);
    setIsZoomed(false);
  }, [images.length]);

  if (!mounted || !isOpen || !currentImage) return null;
  const controlClass = "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey";

  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label="Project photo viewer"
      aria-describedby={captionId}
      aria-modal="true"
      className="fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-black/95 p-0 text-white backdrop:bg-black/80"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") { event.preventDefault(); goToPrevious(); }
        if (event.key === "ArrowRight") { event.preventDefault(); goToNext(); }
      }}
    >
      <div className="flex h-full flex-col gap-3 p-3 sm:p-5">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <p className="text-sm font-medium" aria-live="polite" aria-atomic="true">Photo {safeIndex + 1} of {images.length}</p>
          <div className="flex gap-2">
            <button type="button" className={controlClass} onClick={() => setIsZoomed((zoomed) => !zoomed)} aria-label={isZoomed ? "Zoom out" : "Zoom in"} aria-pressed={isZoomed}>
              {isZoomed ? <ZoomOut className="h-5 w-5" aria-hidden="true" /> : <ZoomIn className="h-5 w-5" aria-hidden="true" />}
            </button>
            <button ref={closeRef} type="button" className={controlClass} onClick={onClose} aria-label="Close photo viewer"><X className="h-6 w-6" aria-hidden="true" /></button>
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          <div
            className="h-full overflow-auto"
            onTouchStart={(event) => {
              touchStart.current = !isZoomed && event.touches.length === 1 ? event.touches[0].clientX : null;
              touchEnd.current = null;
            }}
            onTouchMove={(event) => {
              if (event.touches.length !== 1) { touchStart.current = null; return; }
              touchEnd.current = event.touches[0].clientX;
            }}
            onTouchEnd={() => {
              if (touchStart.current !== null && touchEnd.current !== null) {
                const distance = touchStart.current - touchEnd.current;
                if (distance > 50) goToNext();
                if (distance < -50) goToPrevious();
              }
              touchStart.current = null;
              touchEnd.current = null;
            }}
          >
            <div className={cn("relative h-full w-full", isZoomed && "h-[150%] w-[150%]")}>
              <Image key={currentImage.src} src={currentImage.src} alt={currentImage.alt} fill className="object-contain" sizes="(max-width: 640px) calc(100vw - 24px), calc(100vw - 40px)" priority placeholder={currentImage.blurDataURL ? "blur" : "empty"} blurDataURL={currentImage.blurDataURL} />
            </div>
          </div>
          {images.length > 1 && <>
            <button type="button" className={cn(controlClass, "absolute left-2 top-1/2 z-10 -translate-y-1/2")} onClick={goToPrevious} aria-label="Previous image"><ChevronLeft className="h-6 w-6" aria-hidden="true" /></button>
            <button type="button" className={cn(controlClass, "absolute right-2 top-1/2 z-10 -translate-y-1/2")} onClick={goToNext} aria-label="Next image"><ChevronRight className="h-6 w-6" aria-hidden="true" /></button>
          </>}
        </div>
        <p id={captionId} className="shrink-0 text-center text-sm leading-relaxed text-white/85" aria-live="polite">{currentImage.alt}</p>
        {images.length > 1 && (
          <div className="mx-auto flex max-w-full shrink-0 gap-2 overflow-x-auto px-1 py-2">
            {images.map((image, index) => (
              <button
                key={image.src + "-" + index}
                type="button"
                onClick={() => { setCurrentIndex(index); setIsZoomed(false); }}
                className={cn("relative h-12 w-12 shrink-0 overflow-hidden rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey", index === safeIndex ? "ring-2 ring-white" : "opacity-60 hover:opacity-100")}
                aria-label={"View photo " + (index + 1) + ": " + image.alt}
                aria-current={index === safeIndex ? "true" : undefined}
              >
                <Image src={image.src} alt="" fill className="object-contain" sizes="48px" />
              </button>
            ))}
          </div>
        )}
      </div>
    </dialog>,
    document.body,
  );
}
