import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectSpotlight } from "@/components/project-spotlight";
import { CTASection } from "@/components/cta-section";
import { ProjectPhotos } from "@/components/project-photos";
import { getProjects, getProject } from "@/config/projects";
import { Container, Section, SectionHeading } from "@/components/section";

export function generateStaticParams() {
  return getProjects().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary,
    alternates: { canonical: `/projects/${project.slug}` },
    openGraph: {
      title: project.title,
      description: project.summary,
      images: project.photos[0] ? [{ url: project.photos[0].src }] : [],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();
  
  // Use slug as projectId (old project structure compatibility)
  const projectId = project.slug;
  
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
            <ProjectPhotos projectId={projectId} />
          </div>
        </Container>
      </Section>
      
      <CTASection title="Want results like this?" subtitle="Tell us about your project and get a free estimate." />
    </>
  );
}
