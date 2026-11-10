import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { notFound } from "next/navigation";

import Link from "next/link";
import { BlogArticleBody } from "@/components/blog-article-body";
import { getBlogCopy } from '@/lib/blog-copy';
import { pageMetadata } from "@/config/seo";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = getBlogCopy(slug);
  if (!post) return { title: "Blog Post Not Found" };

  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${slug}`,
    type: 'article',
  });
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
            <span className="inline-block px-3 py-1 bg-honey/10 text-accent-on-deep rounded text-sm font-semibold">
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
          <Link href="/blog" className="mb-6 inline-flex min-h-11 items-center font-semibold text-accent-on-paper underline underline-offset-4">
            Back to homeowner articles
          </Link>
          <BlogArticleBody titleKey={post.titleKey} body={post.body} />

          <div className="mt-12 pt-8 border-t border-border-soft">
            <h2 className="text-xl font-bold text-text mb-4"><TextCopy textKey="blogPost.copy.1" /></h2>
            <p className="text-text-muted mb-6"><TextCopy textKey="blogPost.copy.2" /></p>
            <a
              href="/contact"
              className="inline-flex items-center justify-center rounded-lg bg-honey px-6 py-3 font-semibold text-honey-foreground transition-colors hover:bg-honey/90"
            ><TextCopy textKey="blogPost.copy.3" /></a>
          </div>
        </Container>
      </Section>
    </>
  );
}
