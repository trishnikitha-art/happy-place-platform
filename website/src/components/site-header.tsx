'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowUpRight, Menu } from 'lucide-react';
import { getNavigation } from '@/lib/navigation';
import { getCompany } from '@/lib/company';
import { TextCopy } from '@/components/text-copy';
import { navigationTextKey } from '@/lib/editable-shared-fields';
import { MobileSiteNavigation } from '@/components/mobile-site-navigation';
import { ThemeToggle } from '@/components/theme-toggle';

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const opener = React.useRef<HTMLButtonElement>(null);
  const close = React.useCallback(() => setOpen(false), []);
  const company = getCompany();
  const primary = getNavigation().filter(item => !item.secondary && !['/', '/reviews'].includes(item.href));
  const links = [...primary, { label: 'Ideas & advice', href: '/resources' }];
  const mobile = [...links, { label: 'Newsletter', href: '/newsletter' }, { label: 'Contact', href: '/contact' }, { label: 'Start a project', href: '/estimate', secondary: true }];
  React.useEffect(() => { setOpen(false); }, [pathname]);
  React.useEffect(() => {
    let frame = 0;
    const update = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        const height = document.documentElement.scrollHeight - window.innerHeight;
        setProgress(height > 0 ? Math.min(1, Math.max(0, window.scrollY / height)) : 0);
        frame = 0;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { window.removeEventListener('scroll', update); window.removeEventListener('resize', update); cancelAnimationFrame(frame); };
  }, [pathname]);
  const active = (href: string) => pathname === href || pathname.startsWith(href + '/');
  return <header className="craft-site-header sticky top-0 z-50">
    <div className="craft-shell flex h-[78px] items-center justify-between gap-3 lg:h-[88px]">
      <Link href="/" className="flex shrink-0 items-center gap-2.5" aria-label={company.name + ' home'}>
        <Image src="/brand/logo.png" alt="" width={66} height={34} priority className="h-auto w-14 object-contain" />
        <span className="leading-none"><span className="block font-display text-lg font-semibold tracking-[-.04em] text-text lg:text-xl">Happy Place</span><span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[.26em] text-text-subtle">Carpentry · Oregon</span></span>
      </Link>
      <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex lg:gap-2">
        {links.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? 'page' : undefined} className="relative inline-flex min-h-11 items-center px-2.5 text-[11px] font-medium text-text transition-colors hover:text-primary lg:px-3 lg:text-xs">{navigationTextKey(item.href) ? <TextCopy textKey={navigationTextKey(item.href)!} /> : item.label}</Link>)}
        <Link href="/newsletter" aria-current={active('/newsletter') ? 'page' : undefined} className="relative hidden min-h-11 items-center px-3 text-xs font-medium text-text xl:inline-flex">Newsletter</Link>
      </nav>
      <div className="hidden items-center gap-2 md:flex"><ThemeToggle /><Link href="/estimate" className="craft-button min-h-11 px-4 text-xs">Start a project <ArrowUpRight size={15} aria-hidden="true" /></Link></div>
      <button ref={opener} type="button" onClick={() => setOpen(true)} aria-label="Open menu" aria-expanded={open} aria-controls="mobile-menu" className="inline-flex h-11 w-11 items-center justify-center text-primary md:hidden"><Menu size={23} aria-hidden="true" /></button>
    </div>
    <span className="craft-reading-progress" style={{ transform: 'scaleX(' + progress + ')' }} aria-hidden="true" />
    <MobileSiteNavigation open={open} navigation={mobile} pathname={pathname} openerRef={opener} onClose={close} />
  </header>;
}
