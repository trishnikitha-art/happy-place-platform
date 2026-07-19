import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { Badge } from "@/components/ui/card";
import { company } from "@/config/company";
import { counties } from "@/config/counties";

export const metadata: Metadata = {
  title: "About",
  description: `About ${company.name} — a licensed Oregon carpentry contractor serving the mid-Willamette Valley.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      <Section>
        <Container className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading
              eyebrow="About us"
              title="We build your happy place"
              description={company.description}
            />
            <div className="mt-6 space-y-4 text-text-muted">
              <p>
                We started {company.name} with one idea: your home should be a happy place, and
                good carpentry is how we get you there. From the first conversation to the final
                walk-through, we keep things clear, clean, and on schedule.
              </p>
              <p>
                We&apos;re licensed ({company.ccbNumber}), insured, and local — and we treat your
                home like it&apos;s our own. No upsells, no surprises, just honest work done right.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge> Licensed &amp; Insured</Badge>
              <Badge> {company.ccbNumber}</Badge>
              <Badge> Locally Owned</Badge>
            </div>
          </div>
          <div className="relative">
            <Image
              src="/images/about.svg"
              alt="The Happy Place Carpentry team at work"
              width={1200}
              height={800}
              className="rounded-2xl border border-border object-cover"
            />
          </div>
        </Container>
      </Section>

      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading eyebrow="Where we work" title="Serving the mid-Willamette Valley" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {counties.map((c) => (
              <div key={c.slug} className="rounded-2xl border border-border bg-white p-5">
                <h3 className="font-bold text-text">{c.name}</h3>
                <p className="mt-2 text-sm text-text-subtle">{c.cities?.join(", ")}</p>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      <CTASection />
    </>
  );
}
