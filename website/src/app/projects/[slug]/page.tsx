import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectSpotlight } from "@/components/project-spotlight";
import { CTASection } from "@/components/cta-section";
import { ProjectPhotos } from "@/components/project-photos";
import { getAllProjects, getProjectById, getProjectBySlug } from "@/lib/projects";
import { Container, Section, SectionHeading } from "@/components/section";

export function generateStaticParams() {
  const projects = getAllProjects();
  return projects.map((p) => ({ slug: p.seo?.slug || p.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.story?.outcome || project.title,
    alternates: { canonical: `/projects/${project.seo?.slug || project.id}` },
    openGraph: {
      title: project.title,
      description: project.story?.outcome || project.title,
      images: project.media?.hero ? [{ url: project.media.hero }] : [],
    },
  };
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) notFound();
  
  // Use id as projectId for ProjectPhotos component
  const projectId = project.id;
  
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
