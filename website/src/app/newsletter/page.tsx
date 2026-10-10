import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";

export const metadata: Metadata = {
  title: "Newsletter Archive",
  description: "Archive of Happy Place Carpentry's homeowner tips, maintenance reminders, and project inspiration.",
  alternates: { canonical: "/newsletter" },
};

export const dynamic = 'force-dynamic';

// Placeholder newsletter data - will be replaced with actual content system
const newsletters = [
  {
    id: 1,
    titleKey: "newsletterArchive.article.1.title",
    date: "2024-03-15",
    excerptKey: "newsletterArchive.article.1.excerpt",
  },
  {
    id: 2,
    titleKey: "newsletterArchive.article.2.title",
    date: "2024-02-20",
    excerptKey: "newsletterArchive.article.2.excerpt",
  },
  {
    id: 3,
    titleKey: "newsletterArchive.article.3.title",
    date: "2024-01-10",
    excerptKey: "newsletterArchive.article.3.excerpt",
  },
] as const;

export default function NewsletterArchivePage() {
  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-4xl">
          <SectionHeading
            eyebrow={<span className="text-honey"><TextCopy textKey="newsletterArchive.copy.1" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="newsletterArchive.copy.2" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="newsletterArchive.copy.3" /></span>}
          />
        </Container>
      </Section>

      <Section>
        <Container className="max-w-4xl">
          <div className="space-y-6">
            {newsletters.map((newsletter) => (
              <article
                key={newsletter.id}
                className="rounded-lg border border-border-soft bg-surface p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-3 text-sm text-muted-foreground">
                  {new Date(newsletter.date).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <h3 className="mb-2 text-xl font-bold text-text"><TextCopy textKey={newsletter.titleKey} /></h3>
                <p className="text-text-muted"><TextCopy textKey={newsletter.excerptKey} /></p>
                <div className="mt-4">
                  <button className="text-honey hover:underline font-medium"><TextCopy textKey="newsletterArchive.copy.4" /></button>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-12 rounded-lg bg-surface-muted p-8 text-center">
            <h3 className="text-xl font-bold text-text mb-2"><TextCopy textKey="newsletterArchive.copy.5" /></h3>
            <p className="text-text-muted mb-4"><TextCopy textKey="newsletterArchive.copy.6" /></p>
            <a
              href="/#newsletter"
              className="inline-flex items-center justify-center rounded-lg bg-honey px-6 py-3 font-semibold text-deep transition-colors hover:bg-honey/90"
            ><TextCopy textKey="newsletterArchive.copy.7" /></a>
          </div>
        </Container>
      </Section>
    </>
  );
}
