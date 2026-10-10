import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import type { TextKey } from "@/lib/text-contract";
import { getAllFaqs } from "@/lib/faq";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Common questions about getting started, permits, service area, materials, and warranties.",
  alternates: { canonical: "/faq" },
};

export const dynamic = 'force-dynamic';

export default function FaqPage() {
  const faqItems = getAllFaqs();

  return (
    <>
      <Section>
        <Container>
          <SectionHeading as="h1" eyebrow={<TextCopy textKey="faq.eyebrow" />} title={<TextCopy textKey="faq.title" />} />
          <div className="faq-list mt-8 divide-y divide-border border-y border-border">
            {faqItems.map((it) => (
              <details key={it.id} className="group py-5">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 font-semibold text-text">
                  <TextCopy textKey={`faq.${it.id}.question` as TextKey} />
                  <span className="text-accent transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="measure mt-3 text-text-muted"><TextCopy textKey={`faq.${it.id}.answer` as TextKey} /></p>
              </details>
            ))}
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}
