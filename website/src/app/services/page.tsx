import type { Metadata } from "next";
import Link from "next/link";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { Icon } from "@/components/icon";
import { getNonArchivedServices } from "@/lib/registries";
import { resolvePublicMedia, getMediaByIdAsync } from "@/lib/media";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Painting, repairs, restoration, fences, and drywall by Happy Place Carpentry.",
  alternates: { canonical: "/services" },
};

export const dynamic = 'force-dynamic';

export default async function ServicesPage() {
  const services = getNonArchivedServices();
  
  // Resolve service card media through static configuration (services.v1.json)
  // This matches the Home page strategy to avoid dynamic Redis reads during static generation
  // DEVELOPMENT FALLBACK: Uses static authority when KV is unavailable for development testing
  const serviceCardMediaMap = new Map<string, any>();
  
  for (const service of services) {
    try {
      if (service.cardMediaId) {
        console.log('[SERVICES_PAGE] STATIC_CONFIG_MEDIA_ID', {
          serviceSlug: service.slug,
          cardMediaId: service.cardMediaId,
        });
        
        const resolvedMedia = await resolvePublicMedia(service.cardMediaId);
        if (resolvedMedia) {
          serviceCardMediaMap.set(service.slug, resolvedMedia);
        } else {
          console.log('[SERVICES_PAGE] STATIC_MEDIA_ID_REJECTED', {
            serviceSlug: service.slug,
            rejectedMediaId: service.cardMediaId,
          });
          
          // Development fallback: try static authority when KV is unavailable
          if (process.env.NODE_ENV === 'development') {
            try {
              const staticMedia = await getMediaByIdAsync(service.cardMediaId);
              if (staticMedia && staticMedia.storage === 'static') {
                console.log('[SERVICES_PAGE] STATIC_FALLBACK_RESOLUTION', {
                  serviceSlug: service.slug,
                  cardMediaId: service.cardMediaId,
                  reason: 'KV authority unavailable, using static fallback'
                });
                serviceCardMediaMap.set(service.slug, staticMedia);
              }
            } catch (error) {
              console.error('[SERVICES_PAGE] STATIC_FALLBACK_FAILED', {
                serviceSlug: service.slug,
                cardMediaId: service.cardMediaId,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('[SERVICES_PAGE] Failed to resolve media for service:', service.slug, error);
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
                    <div key={s.id}>
                      <ServiceCard 
                        service={s} 
                        runtimeCardMediaObject={serviceCardMediaMap.get(s.slug) || null} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-16 rounded-2xl border border-border-soft bg-linen p-8">
            <h3 className="text-xl font-bold text-deep" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>Not seeing what you're looking for?</h3>
            <p className="mt-3 text-base text-deep/90" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
              We handle many other residential repair and improvement projects. If it isn't listed above, reach out — we'll let you know if it's a good fit or recommend someone who is.
            </p>
            <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-deep/90">
              <span>Trim & finish carpentry</span>
              <span className="text-deep/60">·</span>
              <span>Deck repairs</span>
              <span className="text-deep/60">·</span>
              <span>Doors</span>
              <span className="text-deep/60">·</span>
              <span>Windows</span>
              <span className="text-deep/60">·</span>
              <span>Siding repairs</span>
              <span className="text-deep/60">·</span>
              <span>Small remodels</span>
              <span className="text-deep/60">·</span>
              <span>Hardware installation</span>
              <span className="text-deep/60">·</span>
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
