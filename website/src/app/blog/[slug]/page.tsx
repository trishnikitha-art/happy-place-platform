import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TextCopy } from '@/components/text-copy';
import { ArticleCopy } from '@/components/article-copy';
import { getBlogCopy } from '@/lib/blog-copy';
import type { TextKey } from '@/lib/text-contract';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogCopy(slug);
  return post ? { title: post.title, description: post.excerpt, alternates: { canonical: `/blog/${slug}` } } : { title: 'Blog Post Not Found' };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogCopy(slug);
  if (!post) notFound();
  const lines = post.content.split('\n');
  const blocks: Array<{ kind: 'heading' | 'paragraph' | 'list' | 'ordered-list' | 'title'; keys: TextKey[] }> = [];
  post.body.forEach((key, index) => {
    if (!key) return;
    const text = lines[index] || '';
    const kind = /^#\s/.test(text) ? 'title' : /^#{2,6}\s/.test(text) ? 'heading' : /^-\s/.test(text) ? 'list' : /^\d+\.\s/.test(text) ? 'ordered-list' : 'paragraph';
    const previous = blocks[blocks.length - 1];
    if ((kind === 'list' || kind === 'ordered-list') && previous?.kind === kind) previous.keys.push(key);
    else blocks.push({ kind, keys: [key] });
  });

  return <div className="craft-page bg-[#EDEAE0] text-[#1F3F3C]">
    <header className="craft-shell pb-12 pt-10 sm:pb-16 sm:pt-16">
      <Link href="/blog" className="inline-flex min-h-11 items-center gap-3 text-sm font-semibold"><span aria-hidden="true">←</span> All articles</Link>
      <p className="craft-eyebrow mt-8"><TextCopy textKey={post.categoryKey} /></p>
      <h1 className="craft-display mt-5 max-w-5xl"><TextCopy textKey={post.titleKey} /></h1>
      <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-[#1F3F3C]/65"><time dateTime={post.date}>{new Date(`${post.date}T12:00:00`).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time><span aria-hidden="true">/</span><span>Happy Place Carpentry</span></div>
    </header>
    <div className="craft-shell grid gap-12 border-t border-[#1F3F3C]/20 py-12 sm:py-16 lg:grid-cols-[0.35fr_1fr_0.25fr] lg:gap-16">
      <aside className="self-start lg:sticky lg:top-28"><p className="craft-eyebrow">Around the home</p><nav aria-label="Related resources" className="mt-5 flex flex-wrap gap-x-6 gap-y-2 lg:flex-col lg:items-start"><Link href="/resources" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Homeowner resources ↗</Link><Link href="/faq" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Practical answers ↗</Link><Link href="/services" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Explore our services ↗</Link></nav></aside>
      <article className="min-w-0 max-w-[68ch] text-lg leading-[1.8] text-[#1F3F3C]/85">
        {blocks.map((block, index) => block.kind === 'title' ? <span key={index} className="sr-only" aria-hidden="true"><ArticleCopy textKey={block.keys[0]} /></span> : block.kind === 'heading' ? <h2 key={index} className="mb-5 mt-10 font-display text-3xl leading-tight text-[#1F3F3C] first:mt-0 sm:text-4xl"><ArticleCopy textKey={block.keys[0]} /></h2> : block.kind === 'list' ? <ul key={index} className="my-6 list-disc space-y-3 pl-6 marker:text-[#9A6829]">{block.keys.map(key => <li key={key} className="pl-1"><ArticleCopy textKey={key} /></li>)}</ul> : block.kind === 'ordered-list' ? <ol key={index} className="my-6 list-decimal space-y-3 pl-6 marker:text-[#9A6829]">{block.keys.map(key => <li key={key} className="pl-1"><ArticleCopy textKey={key} /></li>)}</ol> : <p key={index} className="my-6 first:mt-0"><ArticleCopy textKey={block.keys[0]} /></p>)}
      </article>
    </div>
    <section className="craft-section bg-[#162B29] text-[#EDEAE0]"><div className="craft-shell grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-end lg:gap-20"><div><p className="craft-eyebrow text-[#D99A4E]">From an idea to a conversation</p><h2 className="mt-5 max-w-3xl font-display text-4xl leading-tight sm:text-5xl"><TextCopy textKey="blogPost.copy.1" /></h2><p className="mt-5 max-w-xl text-lg leading-relaxed text-[#EDEAE0]/80"><TextCopy textKey="blogPost.copy.2" /></p></div><div className="flex flex-col items-start gap-5"><Link href="/estimate" className="craft-button craft-button--gold"><TextCopy textKey="blogPost.copy.3" /><span aria-hidden="true">↗</span></Link><Link href={`/newsletter?source=article-${encodeURIComponent(slug)}`} className="inline-flex min-h-11 items-center text-sm underline decoration-white/40 underline-offset-4">More homeowner notes by email ↗</Link></div></div></section>
  </div>;
}
