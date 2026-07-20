import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { Badge } from "@/components/ui/card";
import { company } from "@/config/company";
import { counties } from "@/config/counties";

export const metadata: Metadata = {
  title: "About",
  description: `About ${company.name} — Taylor & Lanie, a licensed Oregon carpentry partnership serving the mid-Willamette Valley.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const [taylor, lanie] = company.owners;

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-deep text-text-on-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep to-primary/30" />
        <Container className="relative grid items-center gap-10 py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-honey">Family-owned · {company.ccbNumber}</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
              The people you&rsquo;ll actually be working with.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-text-on-dark/75">
              {company.name} is a hands-on carpentry partnership. The person who estimates
              your job is the person who builds it — and the person who keeps you in the loop
              the whole way through.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card border border-text-on-dark/20 shadow-2xl">
            <Image src="/images/about.svg" alt="Taylor & Lanie of Happy Place Carpentry" width={1200} height={900} className="h-full w-full object-cover" />
          </div>
        </Container>
      </section>

      {/* PARTNERSHIP */}
      <Section>
        <Container className="grid gap-8 md:grid-cols-2">
          {[taylor, lanie].map((o, i) => (
            <div key={o.name} className="rounded-card border border-border bg-surface p-8 shadow-sm">
              <p className="font-signature text-3xl text-honey">{o.name}</p>
              <h2 className="mt-1 font-display text-2xl font-bold text-text">{o.title}</h2>
              <p className="mt-4 text-text-muted">{o.focus}</p>
            </div>
          ))}
        </Container>
        <Container className="mt-8">
          <div className="flex flex-wrap gap-2">
            <Badge> Licensed &amp; Insured</Badge>
            <Badge> {company.ccbNumber}</Badge>
            <Badge> {company.proof.yearsInBusiness} years in business</Badge>
            <Badge> {company.proof.projectsCompleted} projects</Badge>
          </div>
        </Container>
      </Section>

      {/* SERVICE AREA */}
      <Section className="bg-cream">
        <Container>
          <SectionHeading eyebrow="Where we work" title="Serving the mid-Willamette Valley" />
          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {counties.map((c) => (
              <div key={c.slug} className="rounded-2xl border border-border bg-surface p-5">
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
