import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectSpotlight } from "@/components/project-spotlight";
import { CTASection } from "@/components/cta-section";
import { ProjectPhotos } from "@/components/project-photos";
import { JobTimeline } from "@/components/job-timeline";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { ScrollReveal } from "@/components/scroll-reveal";
import { BlueprintGrid } from "@/components/blueprint-grid";
import { StarRating } from "@/components/star-rating";
import { CraftCard } from "@/components/ui/card";
import { WorkshopAtmosphere } from "@/components/workshop-atmosphere";
import { getAllProjects, getProjectBySlug } from "@/lib/projects";
import { getMediaById } from "@/lib/media";
import { getReviewById } from "@/lib/reviews";
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
  
  // Load customer review if available
  const reviewId = project.reviews?.[0];
  const review = reviewId ? await getReviewById(reviewId) : null;
  
  return (
    <>
      <ProjectSpotlight project={project} variant="full" />
      
      {/* JOB TIMELINE — canonical project view (Project = aggregate root) */}
      <JobTimeline project={project} />
      
      {/* PROJECT OVERVIEW — owned concerns hang off Project (object-first, no new systems) */}
      <Section className="bg-linen">
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">Project Overview</span>}
            title={<span className="text-evergreen">At a glance</span>}
            description={<span className="text-evergreen/80">Everything attached to this project, in one place.</span>}
          />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Estimate — owned by Project */}
            <CraftCard className="p-5 bg-surface border-evergreen/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-evergreen/50">Estimate</p>
              {project.estimate ? (
                <div className="mt-2 space-y-1 text-sm text-evergreen">
                  <p className="font-semibold">
                    {project.estimate.acceptedDate
                      ? "Accepted"
                      : project.estimate.estimateDate
                        ? "Sent"
                        : "Draft"}
                  </p>
                  {project.estimate.finalCost != null && (
                    <p>${project.estimate.finalCost.toLocaleString()}</p>
                  )}
                  {project.estimate.estimatedRange && (
                    <p className="text-evergreen/60">
                      ${project.estimate.estimatedRange.low.toLocaleString()}–
                      ${project.estimate.estimatedRange.high.toLocaleString()}
                    </p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-evergreen/50">No estimate on file</p>
              )}
            </CraftCard>

            {/* Schedule — owned by Project */}
            <CraftCard className="p-5 bg-surface border-evergreen/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-evergreen/50">Schedule</p>
              <div className="mt-2 space-y-1 text-sm text-evergreen">
                <p className="font-semibold capitalize">{project.status.replace("-", " ")}</p>
                {project.startDate && (
                  <p>Start {new Date(project.startDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                )}
                {project.completionDate && (
                  <p className="text-evergreen/60">
                    Done {new Date(project.completionDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                )}
              </div>
            </CraftCard>

            {/* Crew — owned by Project */}
            <CraftCard className="p-5 bg-surface border-evergreen/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-evergreen/50">Crew</p>
              <div className="mt-2 space-y-1 text-sm text-evergreen">
                {project.team?.leadCarpenter && <p className="font-semibold">{project.team.leadCarpenter}</p>}
                {project.team?.crew?.length ? (
                  <p className="text-evergreen/60">{project.team.crew.length} on crew</p>
                ) : (
                  <p className="text-evergreen/50">Unassigned</p>
                )}
              </div>
            </CraftCard>

            {/* Customer — owned by Project */}
            <CraftCard className="p-5 bg-surface border-evergreen/10">
              <p className="text-xs font-semibold uppercase tracking-wide text-evergreen/50">Customer</p>
              <div className="mt-2 space-y-1 text-sm text-evergreen">
                {project.client?.name && <p className="font-semibold">{project.client.name}</p>}
                {project.client?.referralSource && (
                  <p className="text-evergreen/60">Ref: {project.client.referralSource}</p>
                )}
                {!project.client?.name && <p className="text-evergreen/50">—</p>}
              </div>
            </CraftCard>
          </div>
        </Container>
      </Section>
      
      {/* MATERIALS USED SECTION */}
      {project.materials && (
        <ScrollReveal>
          <Section className="relative bg-deep text-text-on-dark">
            <BlueprintGrid gridSize={20} lineColor="rgba(217, 154, 78, 0.04)" />
            <WorkshopAtmosphere particleCount={18} className="opacity-35" />
            <Container className="relative z-10">
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
      
      {/* CUSTOMER REVIEW SECTION */}
      {review && (
        <ScrollReveal>
          <Section className="relative bg-deep text-text-on-dark">
            <BlueprintGrid gridSize={20} lineColor="rgba(217, 154, 78, 0.04)" />
            <Container className="relative z-10">
              <SectionHeading
                eyebrow={<span className="text-honey">Customer Review</span>}
                title={<span className="text-text-on-dark">What the homeowner says</span>}
                description={<span className="text-text-on-dark/90">Real feedback from the homeowner after project completion.</span>}
              />
              <div className="mt-8">
                <CraftCard className="p-6 sm:p-8 bg-primary/5 border-primary/10">
                  <div className="relative z-10">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                          <StarRating rating={review.rating} />
                          {review.title && <h3 className="text-lg font-bold text-text-on-dark">{review.title}</h3>}
                        </div>
                        <blockquote className="text-base sm:text-lg text-text-on-dark/90 leading-relaxed">
                          &ldquo;{review.body}&rdquo;
                        </blockquote>
                        <figcaption className="mt-4 text-sm text-text-on-dark/70">
                          <span className="font-semibold text-text-on-dark">{review.reviewer.name}</span>
                          {review.location && <span> · {review.location.city}, {review.location.county}</span>}
                        </figcaption>
                      </div>
                    </div>
                  </div>
                </CraftCard>
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
