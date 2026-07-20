"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Hammer } from "lucide-react";
import { navigation } from "@/config/navigation";
import { company } from "@/config/company";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <header className="sticky top-0 z-50 border-b border-border-soft bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-text">
          <Hammer className="h-6 w-6 text-primary" aria-hidden="true" />
          <span className="text-lg">{company.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5" aria-label="Primary">
          {navigation
            .filter((n) => !n.secondary)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "whitespace-nowrap rounded-full px-2.5 py-2 text-[13px] font-medium transition-colors",
                  isActive(item.href) ? "bg-primary/15 text-primary" : "text-text-muted hover:bg-surface-muted"
                )}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="hidden md:block">
          <Link href="/estimate" className={cn(buttonVariants({ variant: "primary", size: "sm" }), "bg-honey text-honey-foreground hover:bg-honey-hover")}>
            Free Estimate
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden rounded-md p-2 text-text-muted hover:bg-surface-muted"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-border bg-background">
          <nav className="flex flex-col p-4" aria-label="Mobile">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium",
                  isActive(item.href) ? "bg-primary/15 text-primary" : "text-text-muted hover:bg-surface-muted"
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
