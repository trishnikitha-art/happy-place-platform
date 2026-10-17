import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Mail, Phone } from 'lucide-react';
import { TextCopy } from '@/components/text-copy';
import { PhoneLink, EmailLink } from '@/components/tracked-contact';
import { getCompany } from '@/lib/company';

export const metadata: Metadata = { title: 'Contact', description: 'Talk about your project with Happy Place Carpentry. Serving Oregon’s Mid-Willamette Valley.', alternates: { canonical: '/contact' } };
export const dynamic = 'force-dynamic';
export default function ContactPage() {
  const company = getCompany();
  return <div className="craft-page">
    <section className="craft-section"><div className="craft-shell grid gap-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-24">
      <div><span className="craft-eyebrow text-primary"><TextCopy textKey="contact.copy.1" /></span><h1 className="craft-title mt-5 text-primary"><TextCopy textKey="contact.hero.title" /></h1><p className="craft-copy mt-7"><TextCopy textKey="contact.hero.description" /></p><div className="mt-10 border-y border-border-soft py-6"><span className="craft-eyebrow text-primary"><TextCopy textKey="contact.copy.2" /></span><PhoneLink phone={company.phone} className="mt-3 flex min-h-12 items-center gap-4 font-display text-3xl text-primary sm:text-4xl"><Phone size={24} strokeWidth={1.3} aria-hidden="true" />{company.phoneDisplay}</PhoneLink></div><div className="border-b border-border-soft py-6"><span className="craft-eyebrow text-primary"><TextCopy textKey="contact.copy.3" /></span><EmailLink email={company.email} className="mt-3 flex min-h-12 items-center gap-3 text-base text-primary sm:text-xl"><Mail size={21} strokeWidth={1.3} className="shrink-0" aria-hidden="true" /><span className="break-all">{company.email}</span></EmailLink></div></div>
      <div className="bg-[#EDEAE0] p-7 text-[#1F3F3C] sm:p-10"><span className="craft-eyebrow">Start with an idea</span><h2 className="mt-5 font-display text-3xl leading-tight sm:text-4xl"><TextCopy textKey="contact.details.title" /></h2><p className="mt-6 text-sm leading-relaxed"><TextCopy textKey="contact.details.description" /></p><Link href="/estimate" className="craft-button mt-7">Prepare your project email <ArrowUpRight size={16} aria-hidden="true" /></Link><p className="mt-4 text-xs leading-relaxed">A few guided questions, then an email draft you review and send yourself.</p><dl className="mt-9 space-y-6 border-t border-[#1F3F3C]/20 pt-7"><div><dt className="craft-eyebrow"><TextCopy textKey="contact.copy.4" /></dt><dd className="mt-2 text-sm leading-relaxed"><TextCopy textKey="company.serviceArea" /></dd></div><div><dt className="craft-eyebrow"><TextCopy textKey="contact.copy.5" /></dt><dd className="mt-2 text-sm leading-relaxed"><TextCopy textKey="company.businessHours" /></dd></div></dl></div>
    </div></section>
    <section className="border-t border-border-soft"><div className="craft-shell flex flex-wrap items-center justify-between gap-6 py-10"><div><p className="craft-eyebrow text-primary">Still exploring?</p><p className="mt-3 font-display text-2xl">Find a little inspiration before you begin.</p></div><div className="flex flex-wrap gap-x-7"><Link href="/our-work" className="craft-link">See our work <ArrowUpRight size={16} aria-hidden="true" /></Link><Link href="/newsletter?source=contact" className="craft-link">Explore the email list <ArrowUpRight size={16} aria-hidden="true" /></Link></div></div></section>
  </div>;
}
