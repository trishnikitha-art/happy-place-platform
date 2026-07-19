import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { Icon } from "@/components/icon";
import { serviceCategories } from "@/config/serviceCategories";
import { services } from "@/config/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Decks, fences, pergolas, kitchen and bath remodels, custom built-ins, and repairs by Happy Place Carpentry.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  return (
    <>
      <Section className="bg-stone-50">
        <Container>
          <SectionHeading
            eyebrow="Services"
            title="Carpentry for your whole home"
            description="Every service has its own estimate questions, so your quote is built around exactly what you need."
          />
          <div className="mt-10 space-y-14">
            {serviceCategories.map((cat) => (
              <div key={cat.slug} id={cat.slug} className="scroll-mt-20">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <Icon name={cat.icon} className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-bold text-stone-900">{cat.title}</h2>
                </div>
                <p className="mb-6 mt-2 max-w-2xl text-stone-600">{cat.description}</p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {services
                    .filter((s) => s.category === cat.slug)
                    .map((s) => (
                      <ServiceCard key={s.slug} service={s} />
                    ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link
              href="/estimate"
              className="inline-flex items-center gap-1 text-base font-semibold text-amber-700 hover:underline"
            >
              Start a free estimate →
            </Link>
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}
