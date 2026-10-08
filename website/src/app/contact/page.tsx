import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { PhoneLink, EmailLink } from "@/components/tracked-contact";
import { getCompany } from "@/lib/company";

export const metadata: Metadata = {
  title: "Contact",
  description: "Talk about your project with Happy Place Carpentry. Serving the Mid-Willamette Valley, Oregon.",
  alternates: { canonical: "/contact" },
};

export const dynamic = 'force-dynamic';

export default function ContactPage() {
  const company = getCompany();

  return (
    <>
      <Section className="bg-deep">
        <Container className="grid gap-10 lg:grid-cols-2">
          <div className="min-w-0">
            <div className="mb-6 flex items-center gap-3">
              <span className="relative block h-10 w-auto">
                <Image src="/brand/logo.png" alt="Happy Place Carpentry logo" width={120} height={40} className="h-full w-auto" />
              </span>
            </div>
            <SectionHeading
              as="h1"
              eyebrow={<span className="text-honey">Contact</span>}
              title={<span className="text-text-on-dark">Let's talk about your project</span>}
              description={<span className="text-text-on-dark/90">Give us a call or email us—whatever's easiest. Tell us what you're planning and where your project is located.</span>}
              descriptionColor="text-text-on-dark/90"
            />
            <dl className="mt-8 space-y-4 text-text-on-dark">
              <div>
                <dt className="text-sm font-semibold uppercase text-honey">Phone</dt>
                <dd><PhoneLink phone={company.phone} className="inline-flex min-h-11 items-center text-lg font-semibold text-text-on-dark underline decoration-honey/60 underline-offset-4">{company.phoneDisplay}</PhoneLink></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-honey">Email</dt>
                <dd><EmailLink email={company.email} className="inline-flex min-h-11 max-w-full items-center break-all text-lg font-semibold text-text-on-dark underline decoration-honey/60 underline-offset-4">{company.email}</EmailLink></dd>
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
          <div className="self-start rounded-2xl bg-linen p-6 text-deep shadow-warm sm:p-8">
            <h2 className="font-display text-2xl font-bold" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>Tell us what you have in mind</h2>
            <p className="measure mt-3" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
              A few details help us understand your project: the kind of work you need, your location, and anything you'd like us to take a closer look at. You can include photos in your email.
            </p>
            <EmailLink email={company.email} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-honey px-6 py-3 font-semibold text-deep transition-colors hover:bg-honey-hover">Email Happy Place Carpentry</EmailLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
