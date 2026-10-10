import { TextCopy } from '@/components/text-copy';
import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { getNonArchivedServices } from "@/lib/registries";
import { getServiceCardAssignment } from "@/lib/assignment-store";
import { resolvePublicMedia } from "@/lib/media";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Painting, repairs, restoration, fences, and drywall by Happy Place Carpentry.",
  alternates: { canonical: "/services" },
};

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const services = getNonArchivedServices();
  
  // Resolve service card media through authoritative path: getServiceCardAssignment → resolvePublicMedia
  // This is the same path used successfully by Home page
  const serviceCardMediaMap = new Map<string, any>();
  
  for (const service of services) {
    try {
      const assignment = await getServiceCardAssignment(service.slug, 'services-page');
      if (assignment?.mediaId) {
        const resolvedMedia = await resolvePublicMedia(assignment.mediaId);
        if (resolvedMedia) {
          serviceCardMediaMap.set(service.slug, resolvedMedia);
        }
      }

      // Defensive fallback: if no runtime assignment or resolution failed, try canonical static cardMediaId
      // This preserves runtime assignment as authoritative while providing fallback for missing assignments
      if (!serviceCardMediaMap.has(service.slug) && service.cardMediaId) {
        const staticMedia = await resolvePublicMedia(service.cardMediaId);
        if (staticMedia) {
          serviceCardMediaMap.set(service.slug, staticMedia);
          console.log('[SERVICES_PAGE] Using static fallback for service:', service.slug);
        }
      }
    } catch (error) {
      console.error('[SERVICES_PAGE] Failed to resolve media for service:', service.slug, error);
    }
  }
  
  return (
    <>
      <Section className="bg-deep">
        <Container>
          <SectionHeading
            as="h1"
            eyebrow={<span className="text-honey"><TextCopy textKey="services.copy.1" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="services.hero.title" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="services.hero.description" /></span>}
            descriptionColor="text-text-on-dark/90"
          />
          <div data-service-grid className="mt-10 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <ServiceCard key={service.id} service={service}
                runtimeCardMediaObject={serviceCardMediaMap.get(service.slug) || null} />
            ))}
          </div>
          <div className="mt-16 rounded-2xl border border-border-soft bg-linen p-8">
            <h3 className="text-xl font-bold text-deep" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}><TextCopy textKey="services.other.title" /></h3>
            <p className="mt-3 text-base text-deep/90" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
              <TextCopy textKey="services.other.description" />
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-deep/90">
              <span><TextCopy textKey="services.copy.2" /></span>
              <span className="text-deep/60">·</span>
              <span><TextCopy textKey="services.copy.3" /></span>
              <span className="text-deep/60">·</span>
              <span><TextCopy textKey="services.copy.4" /></span>
              <span className="text-deep/60">·</span>
              <span><TextCopy textKey="services.copy.5" /></span>
              <span className="text-deep/60">·</span>
              <span><TextCopy textKey="services.copy.6" /></span>
              <span className="text-deep/60">·</span>
              <span><TextCopy textKey="services.copy.7" /></span>
              <span className="text-deep/60">·</span>
              <span><TextCopy textKey="services.copy.8" /></span>
              <span className="text-deep/60">·</span>
              <span><TextCopy textKey="services.copy.9" /></span>
            </div>
          </div>
          <div className="mt-12">
            <Link
              href="/contact"
              className="inline-flex items-center gap-1 text-base font-semibold text-text-on-dark hover:text-honey hover:underline"
            ><TextCopy textKey="services.copy.10" /></Link>
          </div>
        </Container>
      </Section>
      <CTASection />
    </>
  );
}
