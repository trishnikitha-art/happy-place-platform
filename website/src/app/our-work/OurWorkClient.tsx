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
import { isGalleryOrder, orderResolvedGallery } from "@/lib/workbench-gallery-order";

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
  const [galleryDraftOrders, setGalleryDraftOrders] = useState<Record<string, string[]>>({});
  const [galleryNotice, setGalleryNotice] = useState<string | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isWorkbenchMode, setIsWorkbenchMode] = useState(false);

  useEffect(() => {
    setIsWorkbenchMode(new URLSearchParams(window.location.search).get('workbench') === 'true');
  }, []);

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

  useEffect(() => {
    if (!isWorkbenchMode) return;
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent
        || !event.data || typeof event.data !== 'object') return;
      const data = event.data;
      if (data.type === 'BRIDGE_INIT' && Number.isSafeInteger(data.generation) && data.generation >= 0) {
        dragBridge.initialize(data.generation);
        dragBridge.registerSlot('our-work-gallery-grid');
        window.parent.postMessage({ type: 'BRIDGE_READY', slotId: 'our-work-gallery-grid',
          iframeGeneration: dragBridge.getIframeGeneration() }, window.location.origin);
      } else if (data.type === 'DRAG_START') {
        const payload = { ...data.dragData };
        if (!payload.fileName && payload.name) payload.fileName = payload.name;
        if (!validateDragData(payload).valid) return;
        dragBridge.setDragData(payload);
        setIsDragging(true);
      } else if (data.type === 'DRAG_END') {
        dragBridge.clearDragData();
        setIsDragging(false);
      } else if (data.type === 'GALLERY_ORDER_PREVIEW'
        && data.iframeGeneration === dragBridge.getIframeGeneration()
        && typeof data.projectId === 'string' && isGalleryOrder(data.gallery)
        && allProjects.some(project => project.id === data.projectId)) {
        setGalleryDraftOrders(previous => ({ ...previous, [data.projectId]: [...data.gallery] }));
        setGalleryNotice('Order updated in preview. Save Gallery Changes to keep it.');
      } else if (data.type === 'GALLERY_ORDER_RESET'
        && data.iframeGeneration === dragBridge.getIframeGeneration()) {
        setGalleryDraftOrders({});
        setGalleryNotice(null);
      } else if (data.type === 'GALLERY_REORDER_NACK') {
        setGalleryNotice(typeof data.reason === 'string' ? data.reason : 'Could not rearrange this image.');
      } else if (data.type === 'GALLERY_ADD_QUEUED' || data.type === 'GALLERY_ADD_NACK') {
        setGalleryAddStatus(data.type === 'GALLERY_ADD_QUEUED' ? 'accepted' : 'rejected');
        if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setGalleryAddStatus('idle'), 3000);
      }
    };
    window.addEventListener('message', handleMessage);
    // Hydration can finish after iframe load. Advertise only after the listener
    // exists so the parent can resend its current generation if necessary.
    window.parent.postMessage({ type: 'BRIDGE_READY', slotId: 'our-work-gallery-grid',
      iframeGeneration: dragBridge.getIframeGeneration() }, window.location.origin);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current);
    };
  }, [isWorkbenchMode, allProjects]);

  // React owns both nested drop boundaries. A VisualSlot stops the synthetic
  // event first; the project fallback handles only drops on its empty space.
  const handleProjectDragOver = (event: React.DragEvent) => {
    if (event.dataTransfer.types.includes('application/x-workbench-gallery-reorder')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  const handleProjectDrop = (event: React.DragEvent, projectId: string) => {
    if (event.dataTransfer.types.includes('application/x-workbench-gallery-reorder')) return;
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
    let payload = dragBridge.getDragData();
    if (!payload) {
      try { payload = JSON.parse(event.dataTransfer.getData('application/x-workbench-asset')); }
      catch { return; }
    }
    if (!validateDragData(payload).valid || !allProjects.some(project => project.id === projectId)) return;
    if (window.parent !== window) {
      setGalleryAddStatus('pending');
      window.parent.postMessage({ type: 'GALLERY_ADD', slotId: `gallery:${projectId}`,
        projectId, assetId: payload!.assetId || payload!.fileId, applicationData: payload }, window.location.origin);
    }
    dragBridge.clearDragData();
  };

  const movePhoto = (projectId: string, sourceMediaId: string, targetMediaId: string) => {
    window.parent.postMessage({ type: 'SLOT_REORDER', projectId, sourceMediaId, targetMediaId,
      sourceSlotId: `our-work-gallery::${projectId}::${sourceMediaId}`,
      targetSlotId: `our-work-gallery::${projectId}::${targetMediaId}`,
      iframeGeneration: dragBridge.getIframeGeneration() }, window.location.origin);
  };

  const openLightbox = (images: Array<{src: string; alt: string; blurDataURL?: string}>, index: number) => {
    // Workbench clicks select/rearrange images instead of opening the public lightbox.
    if (isDragging || isWorkbenchMode) {
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
          {isWorkbenchMode && (
            <p role="status" aria-live="polite" className="mt-4 text-sm text-text-on-dark/90">
              {galleryNotice || 'Drag a photo onto another photo in the same project to rearrange it. Save your changes before editing another project.'}
            </p>
          )}
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
              const galleryPhotos = orderResolvedGallery(project.media.galleryMedia || [], galleryDraftOrders[project.id]);

              // P0 FIX: Per-project drop zone container
              // Each project gets its own drop surface with explicit project ID
              return (
                <div
                  key={`project-drop-zone-${project.id}`}
                  data-project-id={project.id}
                  className="project-gallery-section break-inside-avoid mb-8"
                  onDragOver={isWorkbenchMode ? handleProjectDragOver : undefined}
                  onDrop={isWorkbenchMode ? event => handleProjectDrop(event, project.id) : undefined}
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
                    role={isWorkbenchMode ? 'group' : 'button'}
                    tabIndex={isWorkbenchMode ? undefined : 0}
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
                    aria-label={isWorkbenchMode ? `Rearrange ${photo!.alt || project.title}` : `View ${photo!.alt} in full screen`}
                  >
                    <CraftCard className="aspect-[4/3] overflow-hidden">
                      <VisualSlot
                        id={`our-work-gallery::${project.id}::${mediaId}`}
                        route="/our-work"
                        page="OurWork"
                        section="Gallery"
                        slotName={`${project.title} Gallery Photo ${photoIndex + 1}`}
                        currentMediaId={mediaId || null}
                        component="GalleryPhoto"
                        className="h-full w-full"
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
                    {isWorkbenchMode && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-deep/90 px-2 text-text-on-dark">
                        <span className="truncate text-xs">{photoIndex + 1} of {galleryPhotos.length} · {project.title}</span>
                        <div className="flex shrink-0">
                          <button type="button" className="min-h-11 min-w-11 rounded hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-honey disabled:opacity-30"
                            aria-label={`Move ${photo.alt || project.title} earlier`}
                            disabled={photoIndex === 0}
                            onClick={event => { event.stopPropagation(); movePhoto(project.id, mediaId, galleryPhotos[photoIndex - 1].id); }}>↑</button>
                          <button type="button" className="min-h-11 min-w-11 rounded hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-honey disabled:opacity-30"
                            aria-label={`Move ${photo.alt || project.title} later`}
                            disabled={photoIndex === galleryPhotos.length - 1}
                            onClick={event => { event.stopPropagation(); movePhoto(project.id, mediaId, galleryPhotos[photoIndex + 1].id); }}>↓</button>
                        </div>
                      </div>
                    )}
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
