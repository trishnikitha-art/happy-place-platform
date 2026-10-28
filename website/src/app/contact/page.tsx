import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import Image from "next/image";
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
              eyebrow={<span className="text-text-on-dark"><TextCopy textKey="contact.copy.1" /></span>}
              title={<span className="text-text-on-dark"><TextCopy textKey="contact.hero.title" /></span>}
              description={<span className="text-text-on-dark/90"><TextCopy textKey="contact.hero.description" /></span>}
              descriptionColor="text-text-on-dark/90"
            />
            <dl className="mt-8 space-y-4 text-text-on-dark">
              <div>
                <dt className="text-sm font-semibold uppercase text-text-on-dark"><TextCopy textKey="contact.copy.2" /></dt>
                <dd><PhoneLink phone={company.phone} className="inline-flex min-h-11 items-center text-lg font-semibold text-text-on-dark underline decoration-honey/60 underline-offset-4">{company.phoneDisplay}</PhoneLink></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-text-on-dark"><TextCopy textKey="contact.copy.3" /></dt>
                <dd><EmailLink email={company.email} className="text-lg font-semibold text-text-on-dark underline decoration-honey/60 underline-offset-4"><span className="min-w-0 [overflow-wrap:anywhere]">{company.email}</span></EmailLink></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-text-on-dark"><TextCopy textKey="contact.copy.4" /></dt>
                <dd className="text-lg text-text-on-dark"><TextCopy textKey="company.serviceArea" /></dd>
              </div>
              <div>
                <dt className="text-sm font-semibold uppercase text-text-on-dark"><TextCopy textKey="contact.copy.5" /></dt>
                <dd className="text-lg text-text-on-dark"><TextCopy textKey="company.businessHours" /></dd>
              </div>
            </dl>
          </div>
          <div className="self-start rounded-2xl bg-[#EDEAE0] p-6 text-[#352423] shadow-warm sm:p-8">
            <h2 className="font-display text-2xl font-bold text-[#352423]" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}><TextCopy textKey="contact.details.title" /></h2>
            <p className="measure mt-3 text-[#352423]" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
              <TextCopy textKey="contact.details.description" />
            </p>
            <EmailLink email={company.email} className="mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-honey px-6 py-3 font-semibold text-[#352423] transition-colors hover:bg-honey-hover"><TextCopy textKey="contact.details.action" /></EmailLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
