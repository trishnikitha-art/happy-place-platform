import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Newsletter Subscription Confirmed",
  description: "You're subscribed to Happy Place Carpentry's homeowner tips and maintenance reminders.",
  alternates: { canonical: "/newsletter/thank-you" },
};

export const dynamic = 'force-dynamic';

export default function NewsletterThankYouPage() {
  const company = getCompany();

  return (
    <>
      <Section className="bg-deep">
        <Container className="max-w-3xl text-center">
          <div className="mb-8 flex items-center justify-center gap-3">
            <span className="relative block h-10 w-auto">
              <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} className="h-full w-auto" />
            </span>
          </div>
          <SectionHeading
            eyebrow={<span className="text-honey"><TextCopy textKey="newsletterThanks.copy.1" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="newsletterThanks.copy.2" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="newsletterThanks.copy.3" /></span>}
          />
        </Container>
      </Section>

      <Section>
        <Container className="max-w-3xl">
          <div className="prose prose-lg mx-auto">
            <h3><TextCopy textKey="newsletterThanks.copy.4" /></h3>
            <ul>
              <li><strong><TextCopy textKey="newsletterThanks.copy.5" /></strong><TextCopy textKey="newsletterThanks.copy.6" /></li>
              <li><strong><TextCopy textKey="newsletterThanks.copy.7" /></strong><TextCopy textKey="newsletterThanks.copy.8" /></li>
              <li><strong><TextCopy textKey="newsletterThanks.copy.9" /></strong><TextCopy textKey="newsletterThanks.copy.10" /></li>
              <li><strong><TextCopy textKey="newsletterThanks.copy.11" /></strong><TextCopy textKey="newsletterThanks.copy.12" /></li>
            </ul>

            <h3><TextCopy textKey="newsletterThanks.copy.13" /></h3>
            <p><TextCopy textKey="newsletterThanks.copy.14" /><Link href="/our-work" className="text-honey hover:underline"><TextCopy textKey="newsletterThanks.copy.15" /></Link><TextCopy textKey="newsletterThanks.copy.16" /><Link href="/resources" className="text-honey hover:underline"><TextCopy textKey="newsletterThanks.copy.17" /></Link><TextCopy textKey="newsletterThanks.copy.18" /></p>

            <h3><TextCopy textKey="newsletterThanks.copy.19" /></h3>
            <p><TextCopy textKey="newsletterThanks.copy.20" /></p>

            <div className="mt-8">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center rounded-lg bg-honey px-8 py-4 font-semibold text-deep transition-colors hover:bg-honey/90"
              ><TextCopy textKey="newsletterThanks.copy.21" /></Link>
            </div>
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
