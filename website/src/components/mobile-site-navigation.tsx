"use client";
import { TextCopy } from '@/components/text-copy';
import { navigationTextKey } from '@/lib/editable-shared-fields';

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { X } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/navigation";

interface MobileSiteNavigationProps {
  open: boolean;
  navigation: NavItem[];
  pathname: string;
  openerRef: React.RefObject<HTMLButtonElement>;
  onClose: () => void;
}

/** Native modal focus handling keeps the public page inert behind the drawer. */
export function MobileSiteNavigation({ open, navigation, pathname, openerRef, onClose }: MobileSiteNavigationProps) {
  const dialogRef = React.useRef<HTMLDialogElement>(null);
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const headingId = React.useId();

  React.useEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;

    const opener = openerRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = "hidden";
    closeRef.current?.focus({ preventScroll: true });

    const desktop = window.matchMedia("(min-width: 768px)");
    const closeOnDesktop = () => { if (desktop.matches) onClose(); };
    desktop.addEventListener("change", closeOnDesktop);
    closeOnDesktop();

    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      if (dialog.open) dialog.close();
      document.body.style.overflow = previousOverflow;
      if (opener?.isConnected && opener.getClientRects().length) {
        opener.focus({ preventScroll: true });
      } else if (desktop.matches) {
        document.querySelector<HTMLElement>('header nav[aria-label="Primary"] a[aria-current="page"]')?.focus({ preventScroll: true });
      }
    };
  }, [open, openerRef, onClose]);

  if (!open) return null;

  return createPortal(
    <dialog
      id="mobile-menu"
      ref={dialogRef}
      aria-labelledby={headingId}
      aria-modal="true"
      data-lenis-prevent
      className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-text backdrop:bg-black/45"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')).filter((element) => element.getClientRects().length > 0);
        const first = controls[0];
        const last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
    >
      <div data-lenis-prevent className="ml-auto flex h-full w-[calc(100%_-_3rem)] max-w-[22rem] flex-col overflow-y-auto overscroll-contain border-l border-border/60 bg-background p-5 shadow-2xl">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 pb-4">
          <h2 id={headingId} className="font-display text-xl font-semibold">Happy Place</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <X className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <nav className="flex flex-col gap-1 py-5" aria-label="Mobile">
          {navigation.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-lg px-3 py-3 text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                  active ? "bg-primary/10 text-text" : "text-text hover:bg-surface-muted",
                  item.secondary && "mt-3 justify-center bg-honey text-honey-foreground shadow-warm hover:bg-honey-hover",
                )}
              >
                {navigationTextKey(item.href) ? <TextCopy textKey={navigationTextKey(item.href)!} /> : navigationTextKey(item.href) ? <TextCopy textKey={navigationTextKey(item.href)!} /> : item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex shrink-0 items-center justify-between border-t border-border/60 pt-4">
          <span className="text-sm text-text-muted"><TextCopy textKey="navigation.themeLabel" /></span>
          <div className="[&>button]:h-11 [&>button]:w-11"><ThemeToggle /></div>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
