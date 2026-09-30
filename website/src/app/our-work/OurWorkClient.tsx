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
import { useState, useEffect, useRef } from "react";
import type { Project } from "@/types/projects";
import { dragBridge } from "@/lib/workbench-drag-bridge";

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
  const [isDragging, setIsDragging] = useState(false);
  const [galleryAddStatus, setGalleryAddStatus] = useState<'idle' | 'pending' | 'accepted' | 'rejected'>('idle');
  const galleryGridRef = useRef<HTMLDivElement>(null);

  // P0 FIX: Determine workbench mode from URL parameter
  const isWorkbenchMode = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('workbench') === 'true'
    : false;

  console.log('[OURWORK] WORKBENCH_MODE_DETERMINATION', {
    pathname: typeof window !== 'undefined' ? window.location.pathname : 'SSR',
    search: typeof window !== 'undefined' ? window.location.search : 'SSR',
    workbenchParam: typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('workbench') : 'SSR',
    isWorkbenchMode,
    windowIsIframe: typeof window !== 'undefined' ? window.parent !== window : 'SSR',
    timestamp: Date.now(),
  });



  // P0 FIX: Runtime drag-data schema validation
  // Validates that dragData conforms to expected DriveReference or AssetReference contract
  const validateDragData = (dragData: any): { valid: boolean; reason?: string } => {
    if (!dragData || typeof dragData !== 'object') {
      return { valid: false, reason: 'dragData is not an object' };
    }

    // Validate source field (discriminator)
    const validSources = ['google-drive', 'local', 'drive'];
    if (!dragData.source || !validSources.includes(dragData.source)) {
      return { valid: false, reason: `invalid source: ${dragData.source}` };
    }

    // Validate identity fields (at least one required)
    const hasAssetId = !!dragData.assetId && typeof dragData.assetId === 'string';
    const hasFileId = !!dragData.fileId && typeof dragData.fileId === 'string';

    if (!hasAssetId && !hasFileId) {
      return { valid: false, reason: 'missing assetId or fileId' };
    }

    // Validate Google Drive specific fields
    if (dragData.source === 'google-drive' || dragData.source === 'drive') {
      if (!hasFileId) {
        return { valid: false, reason: 'Drive source requires fileId' };
      }
      // P1 FIX: Require canonical fileName field only (eliminate schema duality)
      if (!dragData.fileName || typeof dragData.fileName !== 'string') {
        return { valid: false, reason: 'Drive source requires fileName' };
      }
    }

    return { valid: true };
  };

  // CEO FIX: Remove automatic drag state reset timeout
  // The 5-second timeout was causing GALLERY_DROP_NO_BRIDGED_DATA by clearing
  // dragBridge data before the user could complete the drop.
  // Drag state is now only reset explicitly by:
  // 1. Successful drop (handleProjectDrop clears data after sending GALLERY_ADD)
  // 2. Explicit drag cancellation by user
  // This prevents race condition where drop happens after auto-reset.

  // CEO FIX: Make project sections explicit drop boundaries
  // Each project gallery section carries its own project identity via data-project-id
  // Drop listeners are attached to each project section, not just the outer container
  // This eliminates fragile DOM ancestry inference for project context
  useEffect(() => {
    const isWorkbench = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('workbench');
    if (!isWorkbench) return;

    const container = galleryGridRef.current;
    if (!container) return;

    const handleDragStart = (e: MessageEvent) => {
      // Only accept messages from parent at same origin
      if (e.origin !== window.location.origin || e.source !== window.parent) {
        return;
      }

      // P0 FIX: Handle BRIDGE_INIT to initialize with parent-issued generation
      if (e.data.type === 'BRIDGE_INIT') {
        const generation = e.data.generation;
        if (typeof generation === 'number') {
          console.log('[OUR_WORK] BRIDGE_INIT_RECEIVED', {
            generation,
            timestamp: Date.now(),
          });
          dragBridge.initialize(generation);

          // P0 FIX: Re-send BRIDGE_READY with correct generation after initialization
          dragBridge.registerSlot('our-work-gallery-grid');
          const iframeGeneration = dragBridge.getIframeGeneration();
          window.parent.postMessage({
            type: 'BRIDGE_READY',
            slotId: 'our-work-gallery-grid',
            iframeGeneration,
          }, window.location.origin);
          console.log('[OUR_WORK] BRIDGE_READY_RESENT_AFTER_INIT', {
            iframeGeneration,
            timestamp: Date.now(),
          });
        } else {
          console.error('[OUR_WORK] BRIDGE_INIT_REJECTED', {
            reason: 'INVALID_GENERATION',
            generation,
          });
        }
        return;
      }

      if (e.data.type === 'DRAG_START') {
        // P1 FIX: Normalize legacy 'name' field to canonical 'fileName' for backward compatibility
        const normalizedDragData = { ...e.data.dragData };
        if (normalizedDragData.name && !normalizedDragData.fileName) {
          normalizedDragData.fileName = normalizedDragData.name;
          console.log('[OUR_WORK] NORMALIZED_LEGACY_NAME_TO_FILENAME', {
            originalName: normalizedDragData.name,
          });
        }

        // P0 FIX: Validate drag-data schema before accepting
        const validation = validateDragData(normalizedDragData);
        if (!validation.valid) {
          console.error('[OUR_WORK] GALLERY_DRAG_START_REJECTED', {
            reason: validation.reason,
            timestamp: Date.now(),
          });
          return;
        }

        console.log('[OUR_WORK] GALLERY_DRAG_START_RECEIVED', {
          assetType: normalizedDragData?.source,
          hasAssetId: !!normalizedDragData?.assetId,
          hasFileId: !!normalizedDragData?.fileId,
          timestamp: Date.now(),
        });
        dragBridge.setDragData(normalizedDragData);
        setIsDragging(true);
      }

      // P1 FIX: Handle GALLERY_ADD_QUEUED/NACK responses from parent
      // QUEUED means added to local pending buffer, not yet committed
      if (e.data.type === 'GALLERY_ADD_QUEUED') {
        console.log('[OUR_WORK] GALLERY_ADD_QUEUED_RECEIVED', {
          status: e.data.status,
          projectId: e.data.projectId,
          assetId: e.data.assetId,
          timestamp: Date.now(),
        });
        setGalleryAddStatus('accepted');
        setTimeout(() => setGalleryAddStatus('idle'), 3000);
      } else if (e.data.type === 'GALLERY_ADD_NACK') {
        console.error('[OUR_WORK] GALLERY_ADD_NACK_RECEIVED', {
          status: e.data.status,
          projectId: e.data.projectId,
          reason: e.data.reason,
          timestamp: Date.now(),
        });
        setGalleryAddStatus('rejected');
        setTimeout(() => setGalleryAddStatus('idle'), 3000);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation(); // P0 FIX: Prevent event bubbling to parent containers
      e.dataTransfer!.dropEffect = 'copy';
    };

    // CEO FIX: Per-project drop handler with explicit project identity
    // Each project section has data-project-id, so we read it directly from currentTarget
    const handleProjectDrop = (e: DragEvent, projectId: string) => {
      e.preventDefault();
      e.stopPropagation(); // P0 FIX: Prevent event bubbling to parent containers
      setIsDragging(false);

      console.log('[OUR_WORK] PROJECT_DROP_RECEIVED', {
        projectId,
        hasBridgedData: !!dragBridge.getDragData(),
        targetTag: (e.target as HTMLElement)?.tagName,
        currentTargetTag: (e.currentTarget as HTMLElement)?.tagName,
        timestamp: Date.now(),
      });

      // P0 FIX: Reject GALLERY_REORDER protocol at project-section boundary
      // Gallery reorder must terminate at VisualSlot and become SLOT_REORDER
      const galleryReorderData = e.dataTransfer?.getData('application/x-workbench-gallery-reorder');
      if (galleryReorderData) {
        console.log('[OUR_WORK] PROJECT_DROP_REJECTED_GALLERY_REORDER', {
          reason: 'GALLERY_REORDER must be handled by VisualSlot, not project-section',
          projectId,
        });
        return;
      }

      const dragData = dragBridge.getDragData();
      if (!dragData) {
        console.log('[OUR_WORK] GALLERY_DROP_NO_BRIDGED_DATA');
        return;
      }

      // CEO FIX: Project identity comes from explicit section boundary, not DOM inference
      const targetProject = allProjects.find(p => p.id === projectId) || null;

      console.log('[OUR_WORK] GALLERY_DROP_PROJECT_SECTION_BOUNDARY', {
        explicitProjectId: projectId,
        resolvedProjectId: targetProject?.id,
        targetProjectTitle: targetProject?.title,
        resolutionSource: 'PROJECT_SECTION_BOUNDARY',
        dropTargetTag: (e.target as HTMLElement)?.tagName,
        currentTargetTag: (e.currentTarget as HTMLElement)?.tagName,
      });

      // Reject if project not found in authoritative project list
      if (!targetProject) {
        console.error('[OUR_WORK] GALLERY_DROP_INVALID_PROJECT_ID', {
          projectId,
          allProjectsCount: allProjects.length,
          availableProjectIds: allProjects.map(p => p.id),
        });
        return;
      }

      console.log('[OUR_WORK] GALLERY_DROP_SENDING_ADD', {
        projectId: targetProject.id,
        assetId: dragData.assetId || dragData.fileId,
        source: dragData.source,
        timestamp: Date.now(),
      });

      // Send GALLERY_ADD message to parent Workbench
      if (window.parent !== window) {
        setGalleryAddStatus('pending');
        window.parent.postMessage({
          type: 'GALLERY_ADD',
          slotId: `gallery:${targetProject.id}`,
          projectId: targetProject.id,
          assetId: dragData.assetId || dragData.fileId,
          applicationData: dragData,
        }, window.location.origin);
      }

      dragBridge.clearDragData();
    };

    // CEO FIX: Attach drop listeners to each project section explicitly
    // Each project section becomes its own drop boundary with explicit project identity
    const projectSections = container.querySelectorAll('.project-gallery-section');
    const sectionHandlers: Array<{section: Element, handleDrop: (e: DragEvent) => void}> = [];

    projectSections.forEach((section) => {
      const projectId = section.getAttribute('data-project-id');
      if (!projectId) return;

      const handleDrop = (e: DragEvent) => handleProjectDrop(e, projectId);
      (section as HTMLElement).addEventListener('dragover', handleDragOver);
      (section as HTMLElement).addEventListener('drop', handleDrop);
      sectionHandlers.push({ section, handleDrop });
    });

    // Outer container drag-over for safety (allows drops anywhere in gallery)
    (container as HTMLElement).addEventListener('dragover', handleDragOver);

    // P1 FIX: Attach all listeners first, then send BRIDGE_READY
    // This ensures the iframe is actually ready to receive messages before advertising readiness
    window.addEventListener('message', handleDragStart);

    // P0 FIX: Don't send BRIDGE_READY immediately - wait for BRIDGE_INIT from parent
    // The parent will send BRIDGE_INIT with generation, then we re-send BRIDGE_READY with that generation
    if (window.parent !== window) {
      console.log('[OUR_WORK] WAITING_FOR_BRIDGE_INIT', {
        timestamp: Date.now(),
      });
    }

    return () => {
      window.removeEventListener('message', handleDragStart);
      container.removeEventListener('dragover', handleDragOver);
      sectionHandlers.forEach(({ section, handleDrop }) => {
        (section as HTMLElement).removeEventListener('dragover', handleDragOver);
        (section as HTMLElement).removeEventListener('drop', handleDrop);
      });
    };
  }, [allProjects]);

  const openLightbox = (images: Array<{src: string; alt: string; blurDataURL?: string}>, index: number) => {
    // P0 FIX: Prevent lightbox from opening during/after drag operation
    if (isDragging) {
      console.log('[OUR_WORK] LIGHTBOX_PREVENTED_BY_DRAG', { isDragging });
      return;
    }
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
          {/* P1 FIX: Visual indicator for gallery add status */}
          {galleryAddStatus !== 'idle' && (
            <div className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium ${
              galleryAddStatus === 'pending' ? 'bg-primary/20 text-primary' :
              galleryAddStatus === 'accepted' ? 'bg-green-500/20 text-green-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {galleryAddStatus === 'pending' && 'Adding to gallery...'}
              {galleryAddStatus === 'accepted' && 'Asset queued for gallery changes (Save to persist)'}
              {galleryAddStatus === 'rejected' && 'Failed to add asset to gallery'}
            </div>
          )}
          <div
            className={`gallery-grid mt-10 columns-2 gap-4 space-y-4 md:columns-3 lg:columns-4 ${isDragging ? 'ring-2 ring-dashed ring-primary/50 ring-offset-2' : ''}`}
            ref={galleryGridRef}
          >
            {allProjects.map((project, projectIndex) => {
              // P0 FIX: Use pre-validated galleryMedia from server-side resolution (passed public media gate)
              // This prevents client-side getMediaById() bypass
              const galleryPhotos = project.media.galleryMedia || [];

              // P0 FIX: Per-project drop zone container
              // Each project gets its own drop surface with explicit project ID
              return (
                <div
                  key={`project-drop-zone-${project.id}`}
                  data-project-id={project.id}
                  className="project-gallery-section break-inside-avoid mb-8"
                >
                  {galleryPhotos.map((photo, photoIndex) => {
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
                  <div
                    key={`${project.id}-${mediaId}`}
                    data-project-id={project.id}
                    data-media-id={mediaId}
                    data-photo-index={photoIndex}
                    role="button"
                    tabIndex={0}
                    className="group relative block aspect-[4/3] overflow-hidden break-inside-avoid mb-4 cursor-pointer"
                    onClick={() => {
                      console.log('[OUR_WORK] GALLERY_BUTTON_CLICK', {
                        projectId: project.id,
                        mediaId,
                        slotId: `our-work-gallery::${project.id}::${mediaId}`,
                        isDragging,
                        timestamp: Date.now(),
                      });

                      // P0 FIX: Prevent lightbox from opening during/after drag operation
                      if (isDragging) {
                        console.log('[OUR_WORK] LIGHTBOX_PREVENTED_BY_DRAG', { isDragging });
                        return;
                      }

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
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        console.log('[OUR_WORK] GALLERY_KEYBOARD_ACTION', {
                          projectId: project.id,
                          mediaId,
                          slotId: `our-work-gallery::${project.id}::${mediaId}`,
                          key: e.key,
                          isDragging,
                          timestamp: Date.now(),
                        });

                        // P0 FIX: Prevent lightbox from opening during/after drag operation
                        if (isDragging) {
                          console.log('[OUR_WORK] LIGHTBOX_PREVENTED_BY_DRAG', { isDragging });
                          return;
                        }

                        const allGalleryImages = allProjects.flatMap(p => {
                          const pGalleryMedia = p.media.galleryMedia || [];
                          return pGalleryMedia.map(m => {
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
                      }
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
                        isWorkbenchMode={isWorkbenchMode}
                        isGallerySlot={true}
                        projectId={project.id}
                      >
                        <img
                          src={src}
                          alt={photo!.alt || `${project.title} photo ${photoIndex + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          draggable={false}
                          onLoad={() => {
                            console.log('[OUR_WORK] GALLERY_IMAGE_LOADED', {
                              projectId: project.id,
                              mediaId,
                              slotId: `our-work-gallery::${project.id}::${mediaId}`,
                              src: src.substring(0, 100),
                              isWorkbenchMode,
                              isGallerySlot: true,
                              expectedDraggable: isWorkbenchMode && true,
                              timestamp: Date.now(),
                            });
                          }}
                        />
                      </VisualSlot>
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none" />
                      <span className="absolute bottom-2 left-2 text-xs font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 pointer-events-none">
                        {project.title}
                      </span>
                    </CraftCard>
                  </div>
                );
              })}
                </div>
              );
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
