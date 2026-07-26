import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectSpotlight } from "@/components/project-spotlight";
import { CTASection } from "@/components/cta-section";
import { ProjectPhotos } from "@/components/project-photos";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { BlueprintGrid } from "@/components/blueprint-grid";
import { getAllProjects, getProjectBySlug } from "@/lib/projects";
import { getMediaById } from "@/lib/media";
import { Container, Section, SectionHeading } from "@/components/section";
import type { Media } from "@/types/media";

export function generateStaticParams() {
  const projects = getAllProjects();
  return projects.map((p) => ({ slug: p.slug || p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  const heroMedia = project.media?.hero ? getMediaById(project.media.hero) : null;
  const ogImagePath = heroMedia?.variants?.web || heroMedia?.variants?.original;
  return {
    title: project.title,
    description: project.story?.outcome || project.title,
    alternates: { canonical: `/projects/${project.slug || project.id}` },
    openGraph: {
      title: project.title,
      description: project.story?.outcome || project.title,
      images: ogImagePath ? [{ url: ogImagePath }] : [],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  
  // Load gallery photos from media authority
  const galleryMediaIds = project.media?.gallery || [];
  const photos = galleryMediaIds
    .map(id => getMediaById(id))
    .filter(m => m !== null && (m.variants?.web || m.variants?.original)) as Media[];
  
  return (
    <>
      <ProjectSpotlight project={project} variant="full" />
      
      {/* MATERIALS USED SECTION */}
      {project.materials && (
        <ScrollReveal>
          <Section className="relative bg-deep text-text-on-dark">
            <BlueprintGrid gridSize={20} lineColor="rgba(217, 154, 78, 0.04)" />
            <Container>
              <SectionHeading
                eyebrow={<span className="text-honey">Materials Used</span>}
                title={<span className="text-text-on-dark">Quality materials for lasting results</span>}
                description={<span className="text-text-on-dark/90">The premium materials we used to bring this project to life.</span>}
              />
              <div className="mt-8 flex flex-wrap gap-3">
                {project.materials.primary && (
                  <span className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-text-on-dark text-sm font-medium">
                    {project.materials.primary}
                  </span>
                )}
                {project.materials.secondary?.map((material, i) => (
                  <span
                    key={`secondary-${i}`}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-text-on-dark text-sm font-medium"
                  >
                    {material}
                  </span>
                ))}
                {project.materials.customMaterials?.map((material, i) => (
                  <span
                    key={`custom-${i}`}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-text-on-dark text-sm font-medium"
                  >
                    {material}
                  </span>
                ))}
              </div>
            </Container>
          </Section>
        </ScrollReveal>
      )}
      
      <Section className="bg-deep text-text-on-dark">
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">Project Photos</span>}
            title={<span className="text-text-on-dark">Project Gallery</span>}
            description={<span className="text-text-on-dark/90">Photos from this project</span>}
          />
          <div className="mt-8">
            <ProjectPhotos photos={photos} />
          </div>
        </Container>
      </Section>
      
      <CTASection title="Want results like this?" subtitle="Tell us about your project and get a free estimate." />
    </>
  );
}
