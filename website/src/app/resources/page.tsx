import type { Metadata } from 'next';
import Link from 'next/link';
import { TextCopy } from '@/components/text-copy';
import { BLOG_COPY_RECORDS } from '@/lib/blog-copy';

export const metadata: Metadata = {
  title: 'Homeowner resources',
  description: 'Maintenance checklists, deck care advice, and practical answers from Happy Place Carpentry.',
  alternates: { canonical: '/resources' },
};

export default function ResourcesPage() {
  const guides = BLOG_COPY_RECORDS.filter(post => post.slug === 'spring-maintenance-checklist' || post.slug === 'deck-maintenance-guide');
  return <div className="craft-page bg-[#EDEAE0] text-[#1F3F3C]">
    <section className="craft-shell pb-12 pt-12 sm:pb-20 sm:pt-20"><p className="craft-eyebrow">Homeowner resources</p><h1 className="craft-display mt-6 max-w-4xl">A little knowledge.<br />A better cared-for home.</h1><p className="craft-copy mt-8 max-w-xl"><TextCopy textKey="blog.copy.3" /></p><Link href="/blog" className="craft-link mt-6 inline-flex min-h-11 items-center">Browse all articles <span aria-hidden="true">↗</span></Link></section>
    <section className="craft-shell pb-16 sm:pb-24" aria-label="Maintenance guides">
      {guides.map((guide, index) => <article key={guide.id} className="grid gap-6 border-t border-[#1F3F3C]/20 py-10 sm:py-14 lg:grid-cols-[0.3fr_1.1fr_0.6fr] lg:gap-12"><p className="font-display text-5xl text-[#9A6829]">{String(index + 1).padStart(2, '0')}</p><div><p className="craft-eyebrow mb-4"><TextCopy textKey={guide.categoryKey} /></p><h2 className="font-display text-3xl leading-tight sm:text-4xl"><Link href={`/blog/${guide.slug}`}><TextCopy textKey={guide.titleKey} /></Link></h2></div><div className="lg:pt-8"><p className="leading-relaxed text-[#1F3F3C]/75"><TextCopy textKey={guide.excerptKey} /></p><Link href={`/blog/${guide.slug}`} className="craft-link mt-5 inline-flex min-h-11 items-center">Read the guide <span aria-hidden="true">↗</span></Link></div></article>)}
      <div className="grid gap-8 border-t border-[#1F3F3C]/20 pt-10 sm:grid-cols-2 sm:pt-14"><div><p className="craft-eyebrow">Practical answers</p><h2 className="mt-5 font-display text-3xl">A few questions before you begin?</h2><Link href="/faq" className="craft-link mt-5 inline-flex min-h-11 items-center">Read our frequently asked questions <span aria-hidden="true">↗</span></Link></div><div><p className="craft-eyebrow">See it in practice</p><h2 className="mt-5 font-display text-3xl">Explore the work behind the words.</h2><Link href="/our-work" className="craft-link mt-5 inline-flex min-h-11 items-center">View our projects <span aria-hidden="true">↗</span></Link></div></div>
    </section>
    <section className="bg-[#162B29] py-12 text-[#EDEAE0] sm:py-16"><div className="craft-shell flex flex-wrap items-center justify-between gap-8"><div><p className="craft-eyebrow text-[#D99A4E]">Keep in touch</p><h2 className="mt-4 max-w-xl font-display text-3xl sm:text-4xl">Homeowner notes, in your inbox.</h2></div><Link href="/newsletter?source=resources" className="craft-button craft-button--gold">Explore the newsletter <span aria-hidden="true">↗</span></Link></div></section>
  </div>;
}
