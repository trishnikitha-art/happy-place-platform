import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Mail, Phone } from 'lucide-react';
import { TextCopy } from '@/components/text-copy';
import { navigationTextKey } from '@/lib/editable-shared-fields';
import { getCompany } from '@/lib/company';
import { getNavigation } from '@/lib/navigation';
import { getNonArchivedServices } from '@/lib/registries';
import { PhoneLink, EmailLink } from '@/components/tracked-contact';

export function SiteFooter() {
  const company = getCompany();
  return <footer className="bg-[#162B29] text-[#FFF8EC]">
    <div className="craft-shell border-b border-white/20 py-12 sm:py-16">
      <div className="flex flex-wrap items-end justify-between gap-8"><div><span className="craft-eyebrow text-[#E3B77C]">Happy Place Carpentry</span><p className="mt-4 font-display text-4xl tracking-[-.03em] sm:text-6xl">Make yourself at home.</p></div><Link href="/estimate" className="craft-link text-[#FFF8EC]">Let’s talk about your project <ArrowUpRight size={19} aria-hidden="true" /></Link></div>
    </div>
    <div className="craft-shell grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
      <div><Link href="/" aria-label={company.name + ' home'}><Image src="/brand/logo.png" alt={company.name} width={110} height={45} className="h-auto w-24" /></Link><p className="mt-5 max-w-60 text-sm leading-relaxed text-white/75"><TextCopy textKey="company.serviceArea" /></p><p className="mt-5 text-xs text-[#E3B77C]">{company.ccbNumber}</p></div>
      <div><h2 className="craft-eyebrow"><TextCopy textKey="footer.explore" /></h2><ul className="mt-4 space-y-1 text-sm">{getNavigation().filter(item => !item.secondary).map(item => <li key={item.href}><Link className="inline-flex min-h-11 items-center hover:text-[#E3B77C]" href={item.href}>{navigationTextKey(item.href) ? <TextCopy textKey={navigationTextKey(item.href)!} /> : item.label}</Link></li>)}<li><Link href="/resources" className="inline-flex min-h-11 items-center hover:text-[#E3B77C]">Ideas &amp; advice</Link></li></ul></div>
      <div><h2 className="craft-eyebrow">Find your kind of work</h2><ul className="mt-4 space-y-1 text-sm">{getNonArchivedServices().map(service => <li key={service.id}><Link href={'/services/' + service.slug} className="inline-flex min-h-11 items-center hover:text-[#E3B77C]">{service.name}</Link></li>)}</ul></div>
      <div><h2 className="craft-eyebrow"><TextCopy textKey="footer.contactTitle" /></h2><PhoneLink phone={company.phone} className="mt-4 flex min-h-11 items-center gap-2 text-sm hover:text-[#E3B77C]"><Phone size={14} aria-hidden="true" />{company.phoneDisplay}</PhoneLink><EmailLink email={company.email} className="flex min-h-11 items-center gap-2 text-sm hover:text-[#E3B77C]"><Mail size={14} className="shrink-0" aria-hidden="true" /><span className="break-all">{company.email}</span></EmailLink><p className="mt-3 text-xs leading-relaxed text-white/75"><TextCopy textKey="company.businessHours" /></p><Link href="/newsletter?source=footer" className="craft-link mt-5 text-[#E3B77C]">Join the email list <ArrowUpRight size={14} aria-hidden="true" /></Link></div>
    </div>
    <div className="border-t border-white/20"><div className="craft-shell flex flex-wrap items-center justify-between gap-4 py-6 text-[11px] text-white/65"><span>© {new Date().getFullYear()} {company.legalName}</span><div className="flex gap-6"><Link className="inline-flex min-h-11 items-center hover:text-white" href="/privacy">Privacy</Link><Link className="inline-flex min-h-11 items-center hover:text-white" href="/contact">Contact</Link></div></div></div>
  </footer>;
}
