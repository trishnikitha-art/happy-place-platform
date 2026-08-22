import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { Icon } from "@/components/icon";
import { VisualSlot } from "@/components/visual-slot";
import { getNonArchivedServices } from "@/lib/registries";
import { getServiceCardAssignment } from "@/lib/assignment-store";
import { resolvePublicMedia } from "@/lib/media";
import type { Media } from "@/types/media";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Painting, repairs, restoration, fences, and drywall by Happy Place Carpentry.",
  alternates: { canonical: "/services" },
};

export default async function ServicesPage() {
  const services = getNonArchivedServices();
  
  // Load runtime assignments for service cards on server side (avoids client-side Redis access)
  // Resolve media object through public media gate (rejects Drive references)
  const serviceCardAssignments = new Map<string, { mediaId: string; mediaObject: Media | null }>();
  for (const service of services) {
    try {
      const assignment = await getServiceCardAssignment(service.slug);
      if (assignment?.mediaId) {
        // Resolve media object through public media gate (rejects Drive references)
        const mediaObject = await resolvePublicMedia(assignment.mediaId);

        console.log('[PUBLIC_MEDIA_GATE] SERVICE_CARD_RESOLUTION', {
          serviceSlug: service.slug,
          runtimeCardMediaId: assignment.mediaId,
          resolved: Boolean(mediaObject),
          resolvedMediaId: mediaObject?.id ?? null,
        });

        serviceCardAssignments.set(service.slug, {
          mediaId: assignment.mediaId,
          mediaObject,
        });
      }
    } catch (error) {
      console.error('[SERVICES_PAGE] Failed to load service card assignment:', service.slug, error);
    }
  }
  
  // Group services by category using a simple categorization
  const groupedServices = services.reduce((acc, service) => {
    let category = 'Other';
    
    // Simple categorization based on service name/description
    if (service.slug === 'fences') {
      category = 'Outdoor Structures';
    } else if (service.slug === 'painting') {
      category = 'Painting';
    } else if (service.slug === 'restoration') {
      category = 'Restoration';
    } else if (service.slug === 'repairs') {
      category = 'Repairs';
    } else if (service.slug === 'drywall') {
      category = 'Interior Services';
    }
    
    if (!acc[category]) acc[category] = [];
    acc[category].push(service);
    return acc;
  }, {} as Record<string, typeof services>);

  return (
    <>
      <Section className="bg-deep">
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">Services</span>}
            title={<span className="text-text-on-dark">Carpentry for your whole home</span>}
            description={<span className="text-text-on-dark/90">Every service has its own estimate questions, so your quote is built around exactly what you need.</span>}
            descriptionColor="text-text-on-dark/90"
          />
          <div className="mt-10 space-y-14">
            {Object.entries(groupedServices).map(([category, categoryServices]) => (
              <div key={category} id={category.toLowerCase().replace(/\s+/g, '-')} className="scroll-mt-20">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 text-accent">
                    <Icon name="hammer" className="h-5 w-5" />
                  </span>
                  <h2 className="text-2xl font-bold text-text-on-dark" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>{category}</h2>
                </div>
                <p className="mb-6 mt-2 max-w-2xl text-text-on-dark/90" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
                  {categoryServices[0]?.description || 'Professional carpentry services'}
                </p>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {categoryServices.map((s) => (
                    <Link key={s.id} href={`/services/${s.slug}`}>
                      <VisualSlot
                        id={`services-page-service-card-${s.slug}`}
                        route="/services"
                        page="Services"
                        section={category}
                        slotName={`${s.name} Service Card`}
                        currentMediaId={serviceCardAssignments.get(s.slug)?.mediaId || null}
                        component="ServiceCard"
                      >
                        <ServiceCard service={s} runtimeCardMediaObject={serviceCardAssignments.get(s.slug)?.mediaObject || null} />
                      </VisualSlot>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 rounded-2xl border border-border-soft bg-linen p-8">
            <h3 className="text-xl font-bold text-deep" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>Not seeing what you're looking for?</h3>
            <p className="mt-3 text-base text-gray-600" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
              We handle many other residential repair and improvement projects. If it isn't listed above, reach out — we'll let you know if it's a good fit or recommend someone who is.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-deep">
              <span>Trim & finish carpentry</span>
              <span className="text-gray-300">·</span>
              <span>Deck repairs</span>
              <span className="text-gray-300">·</span>
              <span>Doors</span>
              <span className="text-gray-300">·</span>
              <span>Windows</span>
              <span className="text-gray-300">·</span>
              <span>Siding repairs</span>
              <span className="text-gray-300">·</span>
              <span>Small remodels</span>
              <span className="text-gray-300">·</span>
              <span>Hardware installation</span>
              <span className="text-gray-300">·</span>
              <span>General maintenance</span>
            </div>
          </div>
          <div className="mt-12">
            <Link
              href="/estimate"
              className="inline-flex items-center gap-1 text-base font-semibold text-text-on-dark hover:text-honey hover:underline"
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
