import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectSpotlight } from "@/components/project-spotlight";
import { CTASection } from "@/components/cta-section";
import { ProjectPhotos } from "@/components/project-photos";
import { getAllProjects, getProjectById, getProjectBySlug } from "@/lib/projects";
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
      
      <Section className="bg-surface-muted">
        <Container>
          <SectionHeading
            eyebrow="Project Photos"
            title="Project Gallery"
            description="Photos from this project"
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
