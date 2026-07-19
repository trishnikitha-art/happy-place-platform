import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { company } from "@/config/company";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contact ${company.name} for a free estimate. Serving the mid-Willamette Valley, Oregon.`,
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <>
      <Section>
        <Container className="grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="Contact"
              title="Let's talk about your project"
              description="The fastest way to a quote is the free estimate wizard — but you're welcome to reach out directly."
            />
            <dl className="mt-8 space-y-4 text-stone-700">
              <div>
                <dt className="text-sm font-semibold uppercase text-stone-500">Phone</dt>
                <dd><a href={`tel:${company.phone}`} className="text-lg font-semibold text-amber-700">{company.phoneDisplay}</a></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-stone-500">Email</dt>
                <dd><a href={`mailto:${company.email}`} className="text-lg font-semibold text-amber-700">{company.email}</a></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-stone-500">Service area</dt>
                <dd className="text-lg">{company.serviceArea}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-stone-500">Hours</dt>
                <dd className="text-lg">{company.businessHours}</dd>
              </div>
            </dl>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-8">
            <h2 className="text-xl font-bold text-stone-900">Start a free estimate</h2>
            <p className="mt-2 text-stone-600">
              Pick your service, upload a few photos, answer a couple of quick questions, and we&apos;ll
              be in touch. It takes about two minutes.
            </p>
            <a
              href="/estimate"
              className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-amber-500 px-8 font-semibold text-stone-900 transition-colors hover:bg-amber-400"
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
