import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { notFound } from "next/navigation";

import { Fragment } from 'react';
import { getBlogCopy } from '@/lib/blog-copy';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogCopy(slug);
  if (!post) return { title: "Blog Post Not Found" };

  return {
    title: post.title,
    description: post.content.split("\n")[1]?.replace("# ", "") || post.title,
    alternates: { canonical: `/blog/${slug}` },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getBlogCopy(slug);

  if (!post) {
    notFound();
  }

  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-4xl">
          <div className="mb-4">
            <span className="inline-block px-3 py-1 bg-honey/10 text-honey rounded text-sm font-semibold">
              <TextCopy textKey={post.categoryKey} />
            </span>
          </div>
          <h1 className="font-display text-4xl font-bold text-text-on-dark sm:text-5xl">
            <TextCopy textKey={post.titleKey} />
          </h1>
          <div className="mt-4 text-text-on-dark/80">
            {new Date(post.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <article className="prose prose-lg max-w-none">
            <div className="whitespace-pre-line">{post.body.map((key,index)=><Fragment key={index}>{index>0?'\n':''}{key&&<TextCopy textKey={key} />}</Fragment>)}</div>
          </article>

          <div className="mt-12 pt-8 border-t border-border-soft">
            <h3 className="text-xl font-bold text-text mb-4"><TextCopy textKey="blogPost.copy.1" /></h3>
            <p className="text-text-muted mb-6"><TextCopy textKey="blogPost.copy.2" /></p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-honey px-6 py-3 font-semibold text-deep transition-colors hover:bg-honey/90"
            ><TextCopy textKey="blogPost.copy.3" /></a>
          </div>
        </Container>
      </Section>
    </>
  );
}
