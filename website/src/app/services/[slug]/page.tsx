import type { Metadata } from "next";
import { ContentCopy } from '@/components/content-copy';
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { getServiceBySlug, getNonArchivedServices } from "@/lib/registries"; // use filtered services
import { getServiceGallery } from "@/lib/galleries";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { hasBeforeAfterPhotos } from "@/lib/project-comparison";
import { getProjectWithResolvedMedia, getProjectsWithResolvedMedia } from "@/lib/projects";
import { resolvePublicMedia } from "@/lib/media";
import { VisualSlot } from "@/components/visual-slot";
import { getServiceCardAssignment } from "@/lib/assignment-store";
import type { Media } from "@/types/media";
import { pageMetadata } from "@/config/seo";
import { ScrollReveal } from "@/components/scroll-reveal";

interface ServicePageProps {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateStaticParams() {
  const services = getNonArchivedServices();
  return services.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  
  if (!service) {
    return {
      title: "Service Not Found",
    };
  }

  let media: Media | null = null;
  try {
    const assignment = await getServiceCardAssignment(service.slug, 'services-page');
    if (assignment?.mediaId) media = await resolvePublicMedia(assignment.mediaId);
  } catch (error) {
    console.error('[SERVICE_METADATA] Published image unavailable', error);
  }
  return pageMetadata({
    title: `${service.name} – Willamette Valley`,
    description: service.description,
    path: `/services/${service.slug}`,
    image: media?.variants?.web || media?.variants?.original,
    imageAlt: media?.alt,
  });
}

export const dynamic = 'force-dynamic';

export default async function ServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  
  if (!service) {
    notFound();
  }

  const serviceGallery = getServiceGallery(service.id);
  const allServices = getNonArchivedServices();
  const relatedServices = allServices
    .filter(s => s.id !== service.id)
    .slice(0, 3);

  // Load runtime assignments for related service cards on server side (avoids client-side Redis access)
  // Resolve media object through public media gate (rejects Drive references)
  const serviceCardAssignments = new Map<string, { mediaId: string; mediaObject: Media | null }>();
  for (const relatedService of relatedServices) {
    try {
      const assignment = await getServiceCardAssignment(relatedService.slug);
      if (assignment?.mediaId) {
        // Resolve media object through public media gate (rejects Drive references)
        const mediaObject = await resolvePublicMedia(assignment.mediaId);

        console.log('[PUBLIC_MEDIA_GATE] SERVICE_CARD_RESOLUTION', {
          serviceSlug: relatedService.slug,
          runtimeCardMediaId: assignment.mediaId,
          resolved: Boolean(mediaObject),
          resolvedMediaId: mediaObject?.id ?? null,
        });

        serviceCardAssignments.set(relatedService.slug, {
          mediaId: assignment.mediaId,
          mediaObject,
        });
      }
    } catch (error) {
      console.error('[SERVICE_DETAIL] Failed to load service card assignment:', relatedService.slug, error);
    }
  }

  const projectsWithResolvedMedia = await getProjectsWithResolvedMedia(serviceGallery.projects.slice(0, 6));
  const preferredProject = serviceGallery.projects.find(project => project.featured);
  const preferredProjectWithMedia = preferredProject
    && (projectsWithResolvedMedia.find(project => project.id === preferredProject.id) ?? await getProjectWithResolvedMedia(preferredProject));

  const projectsWithPhotos = projectsWithResolvedMedia.filter(project => project.media.heroMedia);
  const featuredProject = preferredProjectWithMedia?.media.heroMedia
    ? preferredProjectWithMedia
    : projectsWithPhotos[0] ?? preferredProjectWithMedia ?? projectsWithResolvedMedia[0];
  const moreProjects = projectsWithPhotos.filter(project => project.id !== featuredProject?.id);
  const featuredHero = featuredProject?.media.heroMedia;
  const featuredHeroSrc = featuredHero?.variants.web || featuredHero?.variants.original;
  const showComparison = featuredProject ? hasBeforeAfterPhotos(featuredProject) : false;

  return (
    <>
      <Section size="minor" className="bg-deep text-text-on-dark">
        <Container className={featuredProject ? "grid items-start gap-10 lg:grid-cols-2" : undefined}>
          <div>
            <SectionHeading
              as="h1"
              title={<span className="text-text-on-dark"><ContentCopy collection="services" id={service.id} field="name" value={service.name} route={'/services/' + service.slug} /></span>}
              description={<span className="text-text-on-dark/90"><ContentCopy collection="services" id={service.id} field="description" value={service.description} route={'/services/' + service.slug} /></span>}
            />
            {!featuredHeroSrc && !showComparison && <p className="mt-5 text-text-on-dark/90">Tell us what needs work and where the project is located. Photos are welcome if you have them.</p>}
            <Link
              href="/contact"
              className="cta-signature mt-6 inline-flex min-h-11 items-center gap-2 rounded-full px-6 py-3 font-semibold"
            >
              Talk About Your Project
            </Link>
          </div>

          {featuredProject && (
            <div>
              {showComparison ? (
                <BeforeAfterSlider project={featuredProject} />
              ) : featuredHeroSrc && (
                <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary">
                  <VisualSlot
                    id={'project-hero-' + featuredProject.id}
                    route={'/projects/' + (featuredProject.slug || featuredProject.id)}
                    page="ProjectDetail"
                    section="Hero"
                    slotName={featuredProject.title + ' Hero'}
                    currentMediaId={featuredHero?.id || null}
                    component="ProjectSpotlight"
                  >
                    <Image
                      src={featuredHeroSrc}
                      alt={featuredHero?.alt || featuredProject.title}
                      fill
                      loading="lazy"
                      sizes="(min-width: 1280px) 592px, (min-width: 1024px) calc((100vw - 7rem) / 2), calc(100vw - 2rem)"
                      className="object-contain"
                    />
                  </VisualSlot>
                </div>
              )}
              <h2 className="mt-4 text-xl font-semibold text-text-on-dark">
                <Link href={'/projects/' + (featuredProject.slug || featuredProject.id)} className="inline-flex min-h-11 items-center underline decoration-honey underline-offset-4">
                  {featuredProject.title}
                </Link>
              </h2>
              {featuredProject.story?.outcome && <p className="mt-1 text-text-on-dark/90">{featuredProject.story.outcome}</p>}
            </div>
          )}
        </Container>
      </Section>

      {moreProjects.length > 0 && (
        <Section size="minor" className="bg-deep text-text-on-dark">
          <Container>
            <SectionHeading title={<span className="text-text-on-dark">More projects</span>} />
            <ScrollReveal variant="sequence" data-motion-group="service-projects" className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {moreProjects.map(project => {
                const hero = project.media.heroMedia;
                const src = hero?.variants.web || hero?.variants.original;
                return (
                  <Link key={project.id} href={'/projects/' + (project.slug || project.id)} className="project-motion-card craft-card-link group block overflow-hidden rounded-lg bg-surface text-text">
                    {src && (
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <VisualSlot
                          id={'services-' + slug + '-project-card-' + project.id}
                          route={'/services/' + slug}
                          page="ServiceDetail"
                          section="Project Gallery"
                          slotName={project.title + ' Project Card'}
                          currentMediaId={hero?.id || null}
                          component="ProjectCard"
                        >
                          <Image
                            src={src}
                            alt={hero?.alt || project.title}
                            fill
                            sizes="(min-width: 1280px) 392px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            className="craft-photo object-cover"
                          />
                        </VisualSlot>
                      </div>
                    )}
                    <h3 className="p-4 text-lg font-semibold underline underline-offset-4">{project.title}</h3>
                  </Link>
                );
              })}
            </ScrollReveal>
            {serviceGallery.projects.length > 6 && (
              <Link href="/our-work" className="mt-8 inline-flex min-h-11 items-center font-semibold text-text-on-dark underline decoration-honey underline-offset-4">
                View All Projects
              </Link>
            )}
          </Container>
        </Section>
      )}

      {/* RELATED SERVICES */}
      {relatedServices.length > 0 && (
        <Section className="bg-deep text-text-on-dark">
          <Container>
            <SectionHeading
              eyebrow={<span className="text-accent-on-deep">Other Services</span>}
              title={<span className="text-text-on-dark">Explore More</span>}
              description={<span className="text-text-on-dark/90">We offer a full range of carpentry services for your home.</span>}
            />
            <ScrollReveal variant="sequence" data-motion-group="service-related" className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedServices.map((s) => (
                <div key={s.id}>
                  <VisualSlot
                    id={`services-${slug}-related-service-card-${s.slug}`}
                    route={`/services/${slug}`}
                    page="ServiceDetail"
                    section="Related Services"
                    slotName={`${s.name} Service Card`}
                    currentMediaId={serviceCardAssignments.get(s.slug)?.mediaId || null}
                    component="ServiceCard"
                  >
                    <ServiceCard
                      service={s}
                      runtimeCardMediaObject={serviceCardAssignments.get(s.slug)?.mediaObject || null}
                      imageSizes="(max-width: 639px) calc(100vw - 2rem), (max-width: 1023px) calc((100vw - 4.5rem) / 2), (max-width: 1279px) calc((100vw - 7rem) / 3), 24.34rem"
                    />
                  </VisualSlot>
                </div>
              ))}
            </ScrollReveal>
          </Container>
        </Section>
      )}

      <CTASection />
    </>
  );
}
