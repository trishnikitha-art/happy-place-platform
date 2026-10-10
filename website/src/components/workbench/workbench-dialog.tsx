'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Native top-layer modality keeps keyboard focus and nested scrolling in the task. */
export function WorkbenchDialog({ children, labelledBy, onCancel, className, fallbackFocusSelector }: {
  children: ReactNode;
  labelledBy: string;
  onCancel: () => void;
  className?: string;
  fallbackFocusSelector?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    if (!dialog.open) dialog.showModal();
    document.body.style.overflow = 'hidden';
    dialog.querySelector<HTMLElement>('[data-dialog-initial-focus]')?.focus();
    return () => {
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      const target = opener?.isConnected && opener !== document.body && !opener.matches(':disabled') ? opener
        : fallbackFocusSelector ? document.querySelector<HTMLElement>(fallbackFocusSelector) : null;
      target?.focus({ preventScroll: true });
    };
  }, [fallbackFocusSelector]);
  return <dialog ref={dialogRef} aria-labelledby={labelledBy} aria-modal="true" data-lenis-prevent
    onCancel={event => { event.preventDefault(); onCancel(); }}
    className={cn('workbench-dialog fixed m-auto w-[calc(100%_-_2rem)] max-w-lg max-h-[85dvh] overflow-y-auto overscroll-contain rounded-lg border border-border bg-white p-5 text-foreground backdrop:bg-black/50', className)}>
    {children}
  </dialog>;
}
