import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import { Container, Section } from "@/components/section";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Happy Place Carpentry handles your information.",
  alternates: { canonical: "/privacy" },
};

export const dynamic = 'force-dynamic';

export default function PrivacyPage() {
  const company = getCompany();

  return (
    <Section>
      <Container className="max-w-3xl">
        <h1 className="text-3xl font-bold text-text"><TextCopy textKey="privacy.copy.1" /></h1>
        <p className="mt-4 text-sm text-text-subtle"><TextCopy textKey="privacy.updatedLabel" />{new Date().getFullYear()}</p>
        <div className="mt-8 space-y-6 text-text-muted">
          <section>
            <h2 className="text-xl font-bold text-text"><TextCopy textKey="privacy.copy.2" /></h2>
            <p className="mt-2"><TextCopy textKey="privacy.copy.3" /></p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-text"><TextCopy textKey="privacy.copy.4" /></h2>
            <p className="mt-2"><TextCopy textKey="privacy.copy.5" /></p>
          </section>
          <section>
            <h2 className="text-xl font-bold text-text"><TextCopy textKey="privacy.copy.6" /></h2>
            <p className="mt-2">
              <TextCopy textKey="privacy.contact.prefix" />{company.email}<TextCopy textKey="privacy.contact.middle" />{company.phoneDisplay}.
            </p>
          </section>
        </div>
      </Container>
    </Section>
  );
}
