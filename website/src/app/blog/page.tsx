import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";

export const metadata: Metadata = {
  title: "Blog",
  description: "Homeowner tips, carpentry advice, and project inspiration from Happy Place Carpentry.",
  alternates: { canonical: "/blog" },
};

export const dynamic = 'force-dynamic';

import { BLOG_COPY_RECORDS as blogPosts } from '@/lib/blog-copy';

export default function BlogPage() {
  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow={<span className="text-honey"><TextCopy textKey="blog.copy.1" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="blog.copy.2" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="blog.copy.3" /></span>}
          />
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <div className="space-y-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="rounded-lg border border-border-soft bg-surface p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="inline-block px-2 py-1 bg-honey/10 text-honey rounded text-xs font-semibold">
                    <TextCopy textKey={post.categoryKey} />
                  </span>
                  <span>·</span>
                  <span>
                    {new Date(post.date).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <h3 className="mb-2 text-xl font-bold text-text"><TextCopy textKey={post.titleKey} /></h3>
                <p className="text-text-muted mb-4"><TextCopy textKey={post.excerptKey} /></p>
                <a
                  href={`/blog/${post.slug}`}
                  className="text-honey hover:underline font-medium"
                ><TextCopy textKey="blog.copy.4" /></a>
              </article>
            ))}
          </div>
        </Container>
      </Section>
    </>
  );
}
