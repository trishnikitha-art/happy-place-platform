import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { pageMetadata } from "@/config/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Newsletter Archive",
    description: "Read homeowner articles from Happy Place Carpentry and sign up for future newsletters.",
    path: "/newsletter",
  }),
  // Keep this unfinished archive out of search until its articles are browsable.
  robots: { index: false, follow: true },
};

export const dynamic = 'force-dynamic';

export default function NewsletterArchivePage() {
  return (
    <>
      <Section size="minor" className="bg-deep">
        <Container className="max-w-4xl">
          <SectionHeading
            as="h1"
            eyebrow={<span className="text-accent-on-deep"><TextCopy textKey="newsletterArchive.copy.1" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="newsletterArchive.copy.2" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="newsletterArchive.copy.3" /></span>}
          />
        </Container>
      </Section>

      <Section size="minor">
        <Container className="max-w-4xl">
          <Link href="/blog" className="inline-flex min-h-11 items-center font-semibold text-accent-on-paper underline underline-offset-4">
            <TextCopy textKey="newsletterArchive.copy.4" />
          </Link>
          <div className="mt-6 rounded-lg bg-surface p-6 sm:p-8">
            <h2 className="mb-2 text-xl font-bold text-text"><TextCopy textKey="newsletterArchive.copy.5" /></h2>
            <p className="mb-4 text-text-muted"><TextCopy textKey="newsletterArchive.copy.6" /></p>
            <Link href="/#newsletter" className="inline-flex min-h-11 items-center rounded-lg bg-honey px-5 py-3 font-semibold text-honey-foreground hover:bg-honey-hover">
              <TextCopy textKey="newsletterArchive.copy.7" />
            </Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
