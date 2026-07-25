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
      <Section className="bg-deep">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <span className="relative block h-10 w-auto">
                <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} className="h-full w-auto" />
              </span>
            </div>
            <SectionHeading
              eyebrow={<span className="text-honey">Contact</span>}
              title={<span className="text-text-on-dark">Let's talk about your project</span>}
              description={<span className="text-text-on-dark/90">The quickest way to get started is the Estimate Wizard. If you'd rather talk first, give us a call, send a text, or email us—whatever's easiest.</span>}
            />
            <dl className="mt-8 space-y-4 text-text-on-dark">
              <div>
                <dt className="text-sm font-semibold uppercase text-honey">Phone</dt>
                <dd><PhoneLink phone={company.phone} className="text-lg font-semibold text-text-on-dark">{company.phoneDisplay}</PhoneLink></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-honey">Email</dt>
                <dd><EmailLink email={company.email} className="text-lg font-semibold text-text-on-dark">{company.email}</EmailLink></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-honey">Service area</dt>
                <dd className="text-lg text-text-on-dark">{company.serviceArea}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-honey">Hours</dt>
                <dd className="text-lg text-text-on-dark">{company.businessHours}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-border bg-surface-muted p-8">
            <h2 className="text-xl font-bold text-text-on-dark">Start your free estimate</h2>
            <p className="mt-2 text-text-on-dark">
              Pick a service, upload a photo if you have one, and tell us what you're planning. It takes about two minutes.
            </p>
            <a
              href="/estimate"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-primary px-8 font-semibold text-text transition-colors hover:bg-primary-hover"
            >
              Start Your Free Estimate
            </a>
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}
