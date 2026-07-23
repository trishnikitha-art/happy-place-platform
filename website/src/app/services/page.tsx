import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { Icon } from "@/components/icon";
import { getAllServices } from "@/lib/registries";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Decks, fences, pergolas, bathroom remodels, custom built-ins, and repairs by Happy Place Carpentry.",
  alternates: { canonical: "/services" },
};

export default function ServicesPage() {
  const services = getAllServices();
  
  // Group services by category using a simple categorization
  const groupedServices = services.reduce((acc, service) => {
    let category = 'Other';
    
    // Simple categorization based on service name/description
    if (service.slug === 'decks' || service.slug === 'fences' || service.slug === 'pergolas' || service.slug === 'outdoor-living') {
      category = 'Outdoor Structures';
    } else if (service.slug === 'bathrooms') {
      category = 'Bathroom Remodeling';
    } else if (service.slug === 'painting') {
      category = 'Painting';
    } else if (service.slug === 'finish-carpentry' || service.slug === 'built-ins') {
      category = 'Finish Carpentry';
    } else if (service.slug === 'restoration') {
      category = 'Restoration';
    } else if (service.slug === 'repairs') {
      category = 'Repairs';
    } else if (service.slug === 'adus' || service.slug === 'pole-barns') {
      category = 'Structures';
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  return (
    <>
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow="Services"
            title="Carpentry for your whole home"
            description="Every service has its own estimate questions, so your quote is built around exactly what you need."
          />
          <div className="mt-10 space-y-14">
            {Object.entries(groupedServices).map(([category, categoryServices]) => (
              <div key={category} id={category.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-20">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-accent">
                    <Icon name="hammer" className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-bold text-text">{category}</h2>
                </div>
                <p className="mb-6 mt-2 max-w-2xl text-text-muted">
                  {categoryServices[0]?.description || 'Professional carpentry services'}
                </p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryServices.map((s) => (
                    <Link key={s.id} href={`/services/${s.slug}`}>
                      <ServiceCard service={s} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-12">
            <Link
              href="/estimate"
              className="inline-flex items-center gap-1 text-base font-semibold text-accent hover:underline"
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
