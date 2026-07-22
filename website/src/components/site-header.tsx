"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { getNavigation } from "@/lib/navigation";
import { getCompany } from "@/lib/company";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CedarCorner } from "@/components/cedar-corner";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const navigation = getNavigation();
  const company = getCompany();

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const primary = navigation.filter((n) => !n.secondary);
  const estimate = navigation.find((n) => n.secondary);

  return (
    <header className="sticky top-0 z-50 border-b border-border-soft bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${company.name} home`}>
          {/* Simple tape-measure mark (brand signature) */}
          <span className="relative block h-9 w-14 text-primary transition-transform duration-300 group-hover:-rotate-3">
            <Image src="/brand/logo-icon.svg" alt="" width={56} height={36} priority className="h-full w-full" />
            <CedarCorner className="absolute -left-1 -top-1 h-3 w-3 text-honey" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-xl font-bold tracking-tight text-text">Happy Place</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-subtle">Carpentry</span>
          </span>
        </Link>

        <nav className="hidden items-center md:flex" aria-label="Primary">
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium tracking-wide transition-colors",
                isActive(item.href) ? "text-primary" : "text-text-muted hover:text-text"
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {estimate && (
          <div className="hidden shrink-0 md:block">
            <Link
              href={estimate.href}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "bg-honey text-honey-foreground shadow-warm hover:bg-honey-hover")}
            >
              {estimate.label}
            </Link>
          </div>
        )}

        <button
          type="button"
          className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-border bg-background md:hidden">
          <nav className="flex flex-col p-3" aria-label="Mobile">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium",
                  isActive(item.href) ? "bg-primary/10 text-primary" : "text-text-muted hover:bg-surface-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
