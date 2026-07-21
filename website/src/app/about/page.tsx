import type { Metadata } from "next";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { company } from "@/config/company";
import { counties } from "@/config/counties";
import { ownerPortrait } from "@/lib/media";

export const metadata: Metadata = {
  title: "About",
  description: `About ${company.name} — the family behind Happy Place Carpentry, helping homeowners across the mid-Willamette Valley find their happy place.`,
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-deep text-text-on-dark">
        <div className="absolute inset-0 bg-gradient-to-br from-deep via-deep to-primary/30" />
        <Container className="relative grid items-center gap-10 py-20 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-honey">Family-owned · {company.ccbNumber}</p>
            <h1 className="mt-3 font-display text-4xl font-bold leading-tight sm:text-5xl">
              Every family deserves a happy place.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-text-on-dark/75">
              {company.name} isn&rsquo;t built around salespeople, project managers, and
              handoffs. It&rsquo;s built around one family that believes your home should
              become your happy place — from your first conversation to the final
              walkthrough, you&rsquo;ll work with the same people who care about getting
              every detail right.
            </p>
            <p className="mt-6 font-display text-xl text-honey/90">
              Built carefully. Communicated clearly. Finished with pride.
            </p>
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-card photo-mounted">
            <Image src={ownerPortrait().src} alt="Taylor & Lanie of Happy Place Carpentry" fill sizes="(max-width: 1024px) 100vw, 50vw" className="h-full w-full object-cover" />
          </div>
        </Container>
      </section>

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

      <CTASection
        title="Ready to love coming home again?"
        subtitle="Let's start building your happy place."
      />
    </>
  );
}
