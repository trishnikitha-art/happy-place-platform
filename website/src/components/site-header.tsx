"use client";
import { TextCopy } from '@/components/text-copy';
import { navigationTextKey } from '@/lib/editable-shared-fields';

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { getNavigation } from "@/lib/navigation";
import { getCompany } from "@/lib/company";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { CedarCorner } from "@/components/cedar-corner";
import { ThemeToggle } from "@/components/theme-toggle";
import { HappyBrandSignature } from "@/components/happy-brand-signature";
import { TapeMeasureNav } from "@/components/tape-measure-nav";
import { MobileSiteNavigation } from "@/components/mobile-site-navigation";

function NavShimmer({ children, className }: { children: React.ReactNode; className?: string }) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <span
      className={cn("relative inline-block", className)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Base gold text with layered gradients */}
      <span
        className={`
          relative z-10
          bg-gradient-to-br from-[#A67C00] via-[#D99A4E] via-[#E7AD63] to-[#F0C070]
          bg-clip-text text-transparent
          transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]
          ${isHovered ? 'scale-[1.01]' : 'scale-100'}
        `}
        style={{
          filter: isHovered ? 'brightness(1.08) saturate(1.1)' : 'brightness(1) saturate(1)',
        }}
      >
        {children}
      </span>
      
      {/* Animated shimmer sweep - warm light traveling left to right */}
      <span
        aria-hidden="true"
        className={`
          absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/15 via-white/10 to-transparent
          bg-clip-text text-transparent
          pointer-events-none
          ${isHovered ? 'animate-shimmer-fast' : 'animate-shimmer-slow'}
        `}
        style={{
          backgroundSize: '200% 100%',
        }}
      >
        {children}
      </span>
    </span>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const navigation = getNavigation();
  const company = getCompany();
  const navRef = React.useRef<HTMLDivElement>(null);
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const closeMenu = React.useCallback(() => setOpen(false), []);

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const primary = React.useMemo(() => navigation.filter((n) => !n.secondary), [navigation]);
  const contact = navigation.find((n) => n.secondary);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-2 px-4 sm:px-6 md:px-4 lg:gap-3 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-center gap-2 lg:gap-2.5" aria-label={`${company.name} home`}>
          {/* Happy Place Carpentry logo */}
          <span className="relative block h-9 w-auto transition-transform duration-300 group-hover:-rotate-3 lg:h-10">
            <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} priority className="h-full w-auto" />
            <CedarCorner className="absolute -left-1 -top-1 h-3 w-3 text-honey" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display text-lg font-bold tracking-tight text-text lg:text-xl"><HappyBrandSignature /> Place</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-text-subtle">Carpentry</span>
          </span>
        </Link>

        <nav className="relative hidden shrink-0 items-center md:flex" aria-label="Primary" ref={navRef}>
          <TapeMeasureNav items={primary} activeHref={pathname} containerRef={navRef} />
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={cn(
                "relative z-10 inline-flex min-h-11 min-w-11 items-center justify-center whitespace-nowrap px-2 py-2.5 text-xs font-medium tracking-wide transition-all duration-200 lg:px-3.5 lg:text-[13px]",
                isActive(item.href) ? "text-primary" : "text-text hover:text-text hover:bg-surface/50 rounded-md"
              )}
            >
              {isActive(item.href) ? <NavShimmer>{navigationTextKey(item.href) ? <TextCopy textKey={navigationTextKey(item.href)!} /> : item.label}</NavShimmer> : navigationTextKey(item.href) ? <TextCopy textKey={navigationTextKey(item.href)!} /> : item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <div className="[&>button]:h-11 [&>button]:w-11"><ThemeToggle /></div>
          {contact && (
            <Link
              href={contact.href}
              className={cn(buttonVariants({ variant: "primary", size: "sm" }), "min-h-11 bg-honey px-3 text-honey-foreground shadow-warm hover:bg-honey-hover lg:px-4")}
            >
              {navigationTextKey(contact.href) ? <TextCopy textKey={navigationTextKey(contact.href)!} /> : contact.label}
            </Link>
          )}
        </div>

        <button
          ref={menuButtonRef}
          type="button"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen(true)}
        >
          <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      <MobileSiteNavigation open={open} navigation={navigation} pathname={pathname} openerRef={menuButtonRef} onClose={closeMenu} />
    </header>
  );
}
