"use client";

import Link from "next/link";
import Image from "next/image";
import { Container, Section, SectionHeading } from "@/components/section";
import { CTASection } from "@/components/cta-section";
import { ScrollReveal } from "@/components/scroll-reveal";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { CraftCard } from "@/components/ui/card";
import { getServiceBySlug } from "@/lib/registries";
import { ProjectLightbox } from "@/components/project-lightbox";
import { BlueprintGrid } from "@/components/blueprint-grid";
import { VisualSlot } from "@/components/visual-slot";
import { useState } from "react";
import type { Project } from "@/types/projects";

interface OurWorkClientProps {
  company: {
    proof: {
      projectsCompleted: string;
    };
    ccbNumber: string;
  };
  allProjects: Project[];
  featuredProjects: Project[];
}

export default function OurWorkClient({ company, allProjects, featuredProjects }: OurWorkClientProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxImages, setLightboxImages] = useState<Array<{src: string; alt: string; blurDataURL?: string}>>([]);

  const openLightbox = (images: Array<{src: string; alt: string; blurDataURL?: string}>, index: number) => {
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-deep text-text-on-dark">
        <div className="absolute inset-0 bg-[radial-gradient(120%_120%_at_80%_-10%,rgba(217,154,78,0.18),transparent_55%),radial-gradient(90%_90%_at_10%_110%,rgba(31,63,60,0.6),transparent_60%)]" aria-hidden="true" />
        <Container className="relative py-24">
          <p className="text-sm font-semibold uppercase tracking-wide text-honey">
            {company.proof.projectsCompleted} projects · {company.ccbNumber}
          </p>
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-text-on-dark sm:text-6xl">
            Our Work
          </h1>
          <p className="mt-5 max-w-xl text-lg text-text-on-dark">
            Every project solves a different problem. Here are a few of the homes we've worked on and the decisions behind them.
          </p>
        </Container>
      </section>

      {/* FEATURED TRANSFORMATIONS — the emotional open */}
      <Section className="relative bg-deep">
        <BlueprintGrid gridSize={24} lineColor="rgba(217, 154, 78, 0.06)" />
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">Featured transformations</span>}
            title={<span className="text-text-on-dark">Start to finish</span>}
            description={<span className="text-text-on-dark/90">Real projects, real craftsmanship — the moments that turn a house into a happy place.</span>}
          />
          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            {featuredProjects.slice(0, 4).map((project, i) => (
              <ScrollReveal key={project.id} delay={i * 60}>
                <BeforeAfterSlider project={project} />
              </ScrollReveal>
            ))}
          </div>
        </Container>
      </Section>

      {/* RECENT PROJECTS — photo-led project stories */}
      <Section className="relative bg-deep">
        <BlueprintGrid gridSize={20} lineColor="rgba(217, 154, 78, 0.04)" />
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">Recent projects</span>}
            title={<span className="text-text-on-dark">Why We Built It This Way</span>}
            description={<span className="text-text-on-dark/90">Real challenges, real solutions. Tap a project for the full story.</span>}
          />
          <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
            {allProjects.map((project, i) => {
              // P0 FIX: Use pre-validated heroMedia from server-side resolution (passed public media gate)
              // This prevents client-side getMediaById() bypass
              const heroMedia = project.media.heroMedia;
              
              // Use responsive variants if available to select best quality
              const responsiveVariants = heroMedia?.variants?.responsive;
              const hasResponsiveVariants = responsiveVariants && responsiveVariants.length > 0;
              const heroSrc = heroMedia 
                ? (hasResponsiveVariants 
                    ? responsiveVariants[responsiveVariants.length - 1].webp 
                    : (heroMedia.variants?.web || heroMedia.variants?.original))
                : null;
              
              if (!heroSrc) return null;
              return (
                <ScrollReveal key={project.id} delay={i * 80}>
                  <Link
                    href={`/projects/${project.slug || project.id}`}
                    className="group block"
                  >
                    <div className="relative">
                      <div className="relative z-10">
                        <CraftCard className="overflow-hidden transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl">
                          <div className="relative aspect-[16/9] overflow-hidden">
                            <VisualSlot
                              id={`our-work-project-card-${project.id}`}
                              route="/our-work"
                              page="OurWork"
                              section="Recent Projects"
                              slotName={`${project.title} Project Card`}
                              currentMediaId={heroMedia?.id || null}
                              component="ProjectCard"
                            >
                              <Image
                                src={heroSrc}
                                alt={heroMedia?.alt || project.title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                            </VisualSlot>
                          </div>
                          <div className="p-6 transition-transform duration-300 group-hover:translate-y-[-4px]">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                                {(() => {
                                  const service = getServiceBySlug(project.service);
                                  return service?.name || project.service;
                                })()}
                              </span>
                              <span className="text-primary/30">·</span>
                              <span className="text-xs text-text-muted">{project.location.city}</span>
                            </div>
                            <h2 className="text-xl font-bold text-text">{project.title}</h2>
                            <p className="mt-2 line-clamp-2 text-sm text-text-muted">{project.story?.outcome || project.story?.solution || project.title}</p>
                          </div>
                        </CraftCard>
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </Container>
      </Section>

      {/* BROWSE ALL WORK — project gallery grid (masonry layout) */}
      <Section className="bg-deep">
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey">Browse all work</span>}
            title={<span className="text-text-on-dark">The complete archive</span>}
            description={<span className="text-text-on-dark/90">Every project, every detail. Future projects simply append here.</span>}
          />
          <div className="gallery-grid mt-10 columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4">
            {allProjects.map((project, projectIndex) => {
              // P0 FIX: Use pre-validated galleryMedia from server-side resolution (passed public media gate)
              // This prevents client-side getMediaById() bypass
              const galleryPhotos = project.media.galleryMedia || [];
              
              return galleryPhotos.map((photo, photoIndex) => {
                // Use responsive variants if available to select best quality
                const responsiveVariants = photo.variants?.responsive;
                const hasResponsiveVariants = responsiveVariants && responsiveVariants.length > 0;
                const src = photo 
                  ? (hasResponsiveVariants 
                      ? responsiveVariants[responsiveVariants.length - 1].webp 
                      : (photo.variants.web || photo.variants.original || photo.variants.thumbnail))
                  : null;
                if (!src) return null;
                const mediaId = photo.id;
                
                return (
                  <button
                    key={`${project.id}-${mediaId}`}
                    className="group relative block aspect-[4/3] overflow-hidden cursor-pointer break-inside-avoid mb-4"
                    onClick={() => {
                      console.log('[OUR_WORK] GALLERY_BUTTON_CLICK', {
                        projectId: project.id,
                        mediaId,
                        slotId: `our-work-gallery::${project.id}::${mediaId}`,
                        timestamp: Date.now(),
                      });

                      // P0 FIX: Use pre-validated galleryMedia from server-side resolution (passed public media gate)
                      // This prevents client-side getMediaById() bypass
                      const allGalleryImages = allProjects.flatMap(p => {
                        const pGalleryMedia = p.media.galleryMedia || [];
                        return pGalleryMedia.map(m => {
                          // Use highest quality variant for lightbox
                          const responsiveVariants = m.variants?.responsive;
                          const highestQuality = responsiveVariants && responsiveVariants.length > 0
                            ? responsiveVariants[responsiveVariants.length - 1].webp
                            : (m.variants.web || m.variants.original || m.variants.thumbnail!);
                          return {
                            src: highestQuality,
                            alt: m.alt,
                            blurDataURL: m.variants?.blur
                          };
                        });
                      });
                      const globalIndex = allGalleryImages.findIndex(img => img.src === src);
                      openLightbox(allGalleryImages, globalIndex);
                    }}
                    aria-label={`View ${photo!.alt} in full screen`}
                  >
                    <CraftCard className="overflow-hidden">
                      <VisualSlot
                        id={`our-work-gallery::${project.id}::${mediaId}`}
                        route="/our-work"
                        page="OurWork"
                        section="Gallery"
                        slotName={`${project.title} Gallery Photo ${photoIndex + 1}`}
                        currentMediaId={mediaId || null}
                        component="GalleryPhoto"
                        isGallerySlot={true}
                        projectId={project.id}
                      >
                        <img
                          src={src}
                          alt={photo!.alt || `${project.title} photo ${photoIndex + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          onLoad={() => {
                            console.log('[OUR_WORK] GALLERY_IMAGE_LOADED', {
                              projectId: project.id,
                              mediaId,
                              slotId: `our-work-gallery::${project.id}::${mediaId}`,
                              src: src.substring(0, 100),
                              timestamp: Date.now(),
                            });
                          }}
                        />
                      </VisualSlot>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                      <span className="absolute bottom-2 left-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {project.title}
                      </span>
                    </CraftCard>
                  </button>
                );
              });
            })}
          </div>
        </Container>
      </Section>

      {/* Lightbox */}
      <ProjectLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />

      <CTASection
        title="Ready to love coming home again?"
        subtitle="Let's start building your happy place."
      />
    </>
  );
}
