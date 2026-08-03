import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { Icon } from "@/components/icon";
import { getServiceBySlug, getNonArchivedServices } from "@/lib/registries";
import { getServiceGallery } from "@/lib/galleries";
import { PlaceholderSection } from "@/components/placeholder-section";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getProjectById } from "@/lib/projects";
import { getMediaById } from "@/lib/media";

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

  return {
    title: `${service.name} | Happy Place Carpentry`,
    description: service.description,
    alternates: { canonical: `/services/${service.slug}` },
  };
}

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

  // Get featured project for this service
  const featuredProject = serviceGallery.projects[0] || null;

  return (
    <>
      {/* HERO SECTION */}
      <Section className="bg-deep text-text-on-dark">
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">{service.name}</span>}
            title={<span className="text-text-on-dark">{service.name}</span>}
            description={<span className="text-text-on-dark/90">{service.description}</span>}
          />
          <div className="mt-8">
            <Link
              href="/estimate"
              className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors"
            >
              Get a Free Estimate
            </Link>
          </div>
        </Container>
      </Section>

      {/* FEATURED PROJECT */}
      {featuredProject && (
        <Section className="bg-deep text-text-on-dark">
          <Container>
            <SectionHeading
              eyebrow={<span className="text-honey">Featured Project</span>}
              title={<span className="text-text-on-dark">{featuredProject.title}</span>}
              description={<span className="measure text-text-on-dark/90">{featuredProject.story?.outcome || "See our latest work in this service area."}</span>}
            />
            <div className="mt-8">
              {featuredProject.media.before && featuredProject.media.after && (
                <BeforeAfterSlider project={featuredProject} />
              )}
              <Link
                href={`/projects/${featuredProject.slug || featuredProject.id}`}
                className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-honey hover:text-honey-hover transition-colors"
              >
                View Full Project →
              </Link>
            </div>
          </Container>
        </Section>
      )}

      {/* PROJECT GALLERY (masonry layout) */}
      <Section className="bg-deep text-text-on-dark">
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">Our Work</span>}
            title={<span className="text-text-on-dark">{`${service.name} Projects`}</span>}
            description={<span className="text-text-on-dark/90">{`Browse our completed ${service.name.toLowerCase()} projects across the Mid-Willamette Valley.`}</span>}
          />
          <div className="mt-8">
            {serviceGallery.projects.length > 0 ? (
              <div className="columns-1 gap-6 space-y-6 sm:columns-2 lg:columns-3">
                {serviceGallery.projects.slice(0, 6).map((project) => {
                  const projectHeroMedia = project.media.hero ? getMediaById(project.media.hero) : null;
                  const projectHeroSrc = projectHeroMedia?.variants?.web || projectHeroMedia?.variants?.original;
                  return (
                    <Link key={project.id} href={`/projects/${project.slug || project.id}`} className="block break-inside-avoid mb-6">
                      <div className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-surface">
                        {projectHeroSrc && (
                          <Image
                            src={projectHeroSrc}
                            alt={`${project.title} - ${project.location.city}, ${project.location.county}`}
                            fill
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <h3 className="text-white font-semibold text-lg">{project.title}</h3>
                          <p className="text-white/80 text-sm">{project.location.city}, {project.location.county}</p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <PlaceholderSection
                type="gallery"
                title={`${service.name} Projects Coming Soon`}
                description={`We're currently working on exciting ${service.name.toLowerCase()} projects. Check back soon to see our latest work.`}
                count={0}
                darkMode={true}
                action={{
                  label: "Get a Free Estimate",
                  href: "/estimate",
                }}
              />
            )}
          </div>
          {serviceGallery.projects.length > 6 && (
            <div className="mt-8 text-center">
              <Link
                href="/our-work"
                className="inline-flex items-center gap-2 text-sm font-semibold text-honey hover:text-honey-hover transition-colors"
              >
                View All Projects →
              </Link>
            </div>
          )}
        </Container>
      </Section>

      {/* RELATED SERVICES */}
      {relatedServices.length > 0 && (
        <Section className="bg-deep text-text-on-dark">
          <Container>
            <SectionHeading
              eyebrow={<span className="text-honey">Other Services</span>}
              title={<span className="text-text-on-dark">Explore More</span>}
              description={<span className="text-text-on-dark/90">We offer a full range of carpentry services for your home.</span>}
            />
            <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {relatedServices.map((s) => (
                <Link key={s.id} href={`/services/${s.slug}`}>
                  <ServiceCard service={s} />
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      )}

      <CTASection />
    </>
  );
}
