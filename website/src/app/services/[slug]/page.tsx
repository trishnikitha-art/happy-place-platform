import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section, SectionHeading } from "@/components/section";
import { ServiceCard } from "@/components/service-card";
import { CTASection } from "@/components/cta-section";
import { Icon } from "@/components/icon";
import { getServiceBySlug, getAllServices } from "@/lib/registries";
import { getServiceGallery } from "@/lib/galleries";
import { PlaceholderSection } from "@/components/placeholder-section";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getProjectById } from "@/lib/projects";

interface ServicePageProps {
  params: {
    slug: string;
  };
}

export async function generateStaticParams() {
  const services = getAllServices();
  return services.map((service) => ({
    slug: service.slug,
  }));
}

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const service = getServiceBySlug(params.slug);
  
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

export default function ServicePage({ params }: ServicePageProps) {
  const service = getServiceBySlug(params.slug);
  
  if (!service) {
    notFound();
  }

  const serviceGallery = getServiceGallery(service.id);
  const allServices = getAllServices();
  const relatedServices = allServices
    .filter(s => s.id !== service.id)
    .slice(0, 3);

  // Get featured project for this service
  const featuredProject = serviceGallery.projects[0] || null;

  return (
    <>
      {/* HERO SECTION */}
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow={service.name}
            title={service.name}
            description={service.description}
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
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Featured Project"
              title={featuredProject.title}
              description={featuredProject.story?.outcome || "See our latest work in this service area."}
            />
            <div className="mt-8">
              {featuredProject.media.before && featuredProject.media.after && (
                <BeforeAfterSlider project={featuredProject} />
              )}
              <Link
                href={`/projects/${featuredProject.seo?.slug || featuredProject.id}`}
                className="inline-flex items-center gap-2 mt-6 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
              >
                View Full Project →
              </Link>
            </div>
          </Container>
        </Section>
      )}

      {/* PROJECT GALLERY */}
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow="Our Work"
            title={`${service.name} Projects`}
            description={`Browse our completed ${service.name.toLowerCase()} projects across the Mid-Willamette Valley.`}
          />
          <div className="mt-8">
            {serviceGallery.projects.length > 0 ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {serviceGallery.projects.slice(0, 6).map((project) => (
                  <Link key={project.id} href={`/projects/${project.seo?.slug || project.id}`}>
                    <div className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-surface">
                      {project.media.hero && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      )}
                      <div className="absolute bottom-4 left-4 right-4">
                        <h3 className="text-white font-semibold text-lg">{project.title}</h3>
                        <p className="text-white/80 text-sm">{project.location.city}, {project.location.county}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <PlaceholderSection
                type="gallery"
                title={`${service.name} Projects Coming Soon`}
                description={`We're currently working on exciting ${service.name.toLowerCase()} projects. Check back soon to see our latest work.`}
                count={0}
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
                className="inline-flex items-center gap-2 text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
              >
                View All Projects →
              </Link>
            </div>
          )}
        </Container>
      </Section>

      {/* RELATED SERVICES */}
      {relatedServices.length > 0 && (
        <Section>
          <Container>
            <SectionHeading
              eyebrow="Other Services"
              title="Explore More"
              description="We offer a full range of carpentry services for your home."
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
