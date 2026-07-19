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
    <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-bold text-stone-900">
          <Hammer className="h-6 w-6 text-amber-500" aria-hidden="true" />
          <span className="text-lg">{company.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1" aria-label="Primary">
          {navigation
            .filter((n) => !n.secondary)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  isActive(item.href) ? "bg-amber-100 text-amber-900" : "text-stone-700 hover:bg-stone-100"
                )}
              >
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="hidden md:block">
          <Link href="/estimate" className={cn(buttonVariants({ variant: "primary", size: "sm" }))}>
            Free Estimate
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden rounded-md p-2 text-stone-700 hover:bg-stone-100"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="md:hidden border-t border-stone-200 bg-white">
          <nav className="flex flex-col p-4" aria-label="Mobile">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium",
                  isActive(item.href) ? "bg-amber-100 text-amber-900" : "text-stone-700 hover:bg-stone-100"
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
