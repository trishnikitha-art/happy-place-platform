import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { PhoneLink, EmailLink } from "@/components/tracked-contact";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact Happy Place Carpentry for a free estimate. Serving the mid-Willamette Valley, Oregon.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const company = getCompany();

  return (
    <>
      <Section>
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="relative block h-10 w-auto">
                <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} className="h-full w-auto" />
              </span>
            </div>
            <SectionHeading
              eyebrow="Contact"
              title="Let's talk about your project"
              description="The fastest way to a quote is the free estimate wizard — but you're welcome to reach out directly."
            />
            <dl className="mt-8 space-y-4 text-text-muted">
              <div>
                <dt className="text-sm font-semibold uppercase text-text-subtle">Phone</dt>
                <dd><PhoneLink phone={company.phone} className="text-lg font-semibold text-accent">{company.phoneDisplay}</PhoneLink></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-text-subtle">Email</dt>
                <dd><EmailLink email={company.email} className="text-lg font-semibold text-accent">{company.email}</EmailLink></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-text-subtle">Service area</dt>
                <dd className="text-lg">{company.serviceArea}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-text-subtle">Hours</dt>
                <dd className="text-lg">{company.businessHours}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-8">
            <h2 className="text-xl font-bold text-text">Start a free estimate</h2>
            <p className="mt-2 text-text-muted">
              Pick your service, upload a few photos, answer a couple of quick questions, and we&apos;ll
              be in touch. It takes about two minutes.
            </p>
            <a
              href="/estimate"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-semibold text-text transition-colors hover:bg-primary-hover"
            >
              Get a Free Estimate
            </a>
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}
