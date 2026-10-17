import type { Metadata } from 'next';
import Link from 'next/link';
import { TextCopy } from '@/components/text-copy';
import { BLOG_COPY_RECORDS as blogPosts } from '@/lib/blog-copy';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Homeowner tips, carpentry advice, and project inspiration from Happy Place Carpentry.',
  alternates: { canonical: '/blog' },
};
export const dynamic = 'force-dynamic';

export default function BlogPage() {
  return <div className="craft-page bg-[#EDEAE0] text-[#1F3F3C]">
    <section className="craft-shell pb-12 pt-12 sm:pb-20 sm:pt-20">
      <p className="craft-eyebrow"><TextCopy textKey="blog.copy.1" /></p>
      <h1 className="craft-display mt-6 max-w-5xl"><TextCopy textKey="blog.copy.2" /></h1>
      <div className="mt-8 grid gap-6 lg:grid-cols-2"><p className="craft-copy max-w-xl"><TextCopy textKey="blog.copy.3" /></p><Link href="/resources" className="craft-link inline-flex min-h-11 w-fit items-center lg:justify-self-end">Browse homeowner resources <span aria-hidden="true">↗</span></Link></div>
    </section>
    <section className="craft-shell pb-16 sm:pb-24" aria-label="Articles">
      {blogPosts.map((post, index) => <article key={post.id} className="grid gap-5 border-t border-[#1F3F3C]/20 py-10 sm:py-14 lg:grid-cols-[0.4fr_1.6fr_0.8fr] lg:gap-12">
        <div className="flex items-center gap-4 text-sm text-[#1F3F3C]/65 lg:block"><span className="font-display text-4xl text-[#9A6829]">{String(index + 1).padStart(2, '0')}</span><p className="lg:mt-5"><time dateTime={post.date}>{new Date(`${post.date}T12:00:00`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</time></p></div>
        <div><p className="craft-eyebrow mb-4"><TextCopy textKey={post.categoryKey} /></p><h2 className="font-display text-3xl leading-tight sm:text-4xl"><Link href={`/blog/${post.slug}`} className="decoration-[#1F3F3C]/30 underline-offset-8 hover:underline"><TextCopy textKey={post.titleKey} /></Link></h2></div>
        <div className="lg:pt-8"><p className="leading-relaxed text-[#1F3F3C]/75"><TextCopy textKey={post.excerptKey} /></p><Link href={`/blog/${post.slug}`} className="craft-link mt-5 inline-flex min-h-11 items-center"><TextCopy textKey="blog.copy.4" /></Link></div>
      </article>)}
    </section>
    <section className="bg-[#162B29] py-12 text-[#EDEAE0] sm:py-16"><div className="craft-shell flex flex-wrap items-center justify-between gap-8"><div><p className="craft-eyebrow text-[#D99A4E]">Keep in touch</p><p className="mt-4 max-w-xl font-display text-3xl sm:text-4xl">A little care goes a long way.</p></div><Link href="/newsletter?source=blog" className="craft-button craft-button--gold">Homeowner notes by email <span aria-hidden="true">↗</span></Link></div></section>
  </div>;
}
