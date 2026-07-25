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
import { ThemeToggle } from "@/components/theme-toggle";

function NavShimmer({ children, className }: { children: React.ReactNode; className?: string }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span className="relative z-10">{children}</span>
      <span
        className={cn(
          "absolute inset-0 z-20 pointer-events-none opacity-0",
          isHovered ? "animate-shimmer-fast" : "animate-shimmer-slow"
        )}
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
          backgroundSize: '200% 100%',
          mixBlendMode: 'overlay',
        }}
      />
    </span>
  );
}

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
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5" aria-label={`${company.name} home`}>
          {/* Happy Place Carpentry logo */}
          <span className="relative block h-10 w-auto transition-transform duration-300 group-hover:-rotate-3">
            <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} priority className="h-full w-auto" />
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
                "whitespace-nowrap px-3.5 py-2.5 text-[13px] font-medium tracking-wide transition-all duration-200",
                isActive(item.href) ? "text-primary" : "text-text hover:text-text hover:bg-surface/50 rounded-md"
              )}
            >
              {isActive(item.href) ? <NavShimmer>{item.label}</NavShimmer> : item.label}
            </Link>
          ))}
        </nav>

        {estimate && (
          <div className="hidden shrink-0 md:flex items-center gap-2">
            <ThemeToggle />
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
        <div id="mobile-menu" className="border-t border-border/60 bg-[#F8F6F3] md:hidden">
          <nav className="flex flex-col p-3" aria-label="Mobile">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-3 text-base font-medium transition-colors duration-200",
                  isActive(item.href) ? "bg-primary/10 text-primary" : "text-text hover:bg-white/50"
                )}
              >
                {isActive(item.href) ? <NavShimmer>{item.label}</NavShimmer> : item.label}
              </Link>
            ))}
            <div className="mt-2 pt-2 border-t border-border/40 flex items-center justify-between">
              <span className="text-sm text-text-muted">Theme</span>
              <ThemeToggle />
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
