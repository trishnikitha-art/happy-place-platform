import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import { Container, Section, SectionHeading } from "@/components/section";
import { PhoneLink, EmailLink } from "@/components/tracked-contact";
import { getCompany } from "@/lib/company";
import { pageMetadata } from "@/config/seo";

export const metadata: Metadata = pageMetadata({
  title: "Talk About Your Home Project",
  description: "Planning painting, repairs or carpentry? Call or email Happy Place Carpentry. Serving Benton, Linn, Marion and Polk Counties in Oregon.",
  path: "/contact",
});

export const dynamic = 'force-dynamic';

export default function ContactPage() {
  const company = getCompany();

  return (
    <Section size="minor" className="bg-deep text-text-on-dark">
      <Container className="grid gap-8 lg:grid-cols-2">
        <div className="min-w-0">
          <SectionHeading
            as="h1"
            title={<span className="text-text-on-dark"><TextCopy textKey="contact.hero.title" /></span>}
            description={<TextCopy textKey="contact.hero.description" />}
            descriptionColor="text-text-on-dark/90"
          />
          <div className="mt-5 flex flex-col items-start gap-3">
            <PhoneLink phone={company.phone} className="max-w-full flex-wrap gap-x-3 font-semibold underline decoration-honey underline-offset-4">
              <TextCopy textKey="contact.copy.2" />
              <span>{company.phoneDisplay}</span>
            </PhoneLink>
            <EmailLink email={company.email} className="max-w-full flex-wrap gap-x-3 font-semibold underline decoration-honey underline-offset-4">
              <TextCopy textKey="contact.details.action" />
              <span className="min-w-0 [overflow-wrap:anywhere]">{company.email}</span>
            </EmailLink>
          </div>
        </div>

        <div className="self-start rounded-2xl bg-[#EDEAE0] p-6 text-[#352423] shadow-warm sm:p-8">
          <h2 className="font-display text-2xl font-bold"><TextCopy textKey="contact.details.title" /></h2>
          <p className="mt-3"><TextCopy textKey="contact.details.description" /></p>
          <ul className="mt-3 list-disc space-y-1 ps-5">
            <li>The kind of work you need</li>
            <li>Your city or project location</li>
            <li>Photos by email, if you have them</li>
          </ul>
        </div>

        <dl className="grid gap-5 text-text-on-dark/90 sm:grid-cols-2 lg:col-span-2">
          <div>
            <dt className="text-sm font-semibold uppercase"><TextCopy textKey="contact.copy.4" /></dt>
            <dd className="mt-1"><TextCopy textKey="company.serviceArea" /></dd>
          </div>
          <div>
            <dt className="text-sm font-semibold uppercase"><TextCopy textKey="contact.copy.5" /></dt>
            <dd className="mt-1"><TextCopy textKey="company.businessHours" /></dd>
          </div>
        </dl>
      </Container>
    </Section>
  );
}
