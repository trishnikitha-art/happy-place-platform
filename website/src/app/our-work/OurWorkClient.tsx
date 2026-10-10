"use client";
import { TextCopy } from '@/components/text-copy';
import { ContentCopy } from '@/components/content-copy';


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
import { createPortal } from "react-dom";
import { useGalleryPointerSort } from "@/components/use-gallery-pointer-sort";
import { mergeVisibleGalleryOrder } from "@/lib/gallery-pointer-sort";
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
  const [galleryHiddenIds, setGalleryHiddenIds] = useState<Record<string, string[]>>({});
  const pendingPointerProjects = useRef(new Set<string>());
  const [galleryNotice, setGalleryNotice] = useState<string | null>(null);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isWorkbenchMode, setIsWorkbenchMode] = useState(false);

  useEffect(() => {
    setIsWorkbenchMode(new URLSearchParams(window.location.search).get('workbench') === 'true');
  }, []);

  const pointerSort = useGalleryPointerSort(({ projectId, sourceId, targetId, visibleOrder }) => {
    const project = allProjects.find(project => project.id === projectId);
    if (!project || window.parent === window) return;
    const acceptedOrder = galleryDraftOrders[projectId];
    const nextOrder = mergeVisibleGalleryOrder(acceptedOrder || project.media.gallery || visibleOrder, visibleOrder);
    pendingPointerProjects.current.add(projectId);
    setGalleryDraftOrders(previous => ({ ...previous, [projectId]: nextOrder }));
    window.parent.postMessage({ type: 'SLOT_REORDER', projectId, sourceMediaId: sourceId, targetMediaId: targetId,
      sourceSlotId: `our-work-gallery::${projectId}::${sourceId}`,
      targetSlotId: `our-work-gallery::${projectId}::${targetId}`,
      // The first gesture uses source/target until the parent supplies its full
      // order, including IDs the public media gate does not render.
      ...(acceptedOrder ? { orderedMediaIds: nextOrder, baseOrderedMediaIds: acceptedOrder } : {}),
      iframeGeneration: dragBridge.getIframeGeneration() }, window.location.origin);
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
        pendingPointerProjects.current.delete(data.projectId);
        setGalleryDraftOrders(previous => ({ ...previous, [data.projectId]: [...data.gallery] }));
        if (isGalleryOrder(data.hiddenGallery)) setGalleryHiddenIds(previous => ({ ...previous, [data.projectId]: [...data.hiddenGallery] }));
        setGalleryNotice('Order updated in preview. Save Gallery Changes to keep it.');
      } else if (data.type === 'GALLERY_ORDER_RESET'
        && data.iframeGeneration === dragBridge.getIframeGeneration()) {
        pointerSort.cancel();
        pendingPointerProjects.current.clear();
        setGalleryDraftOrders({});
        setGalleryHiddenIds({});
        setGalleryNotice(null);
      } else if (data.type === 'GALLERY_REORDER_NACK' && data.iframeGeneration === dragBridge.getIframeGeneration()) {
        if (typeof data.projectId === 'string') {
          pendingPointerProjects.current.delete(data.projectId);
          setGalleryDraftOrders(previous => {
            const next = { ...previous };
            if (isGalleryOrder(data.gallery)) next[data.projectId] = [...data.gallery];
            else delete next[data.projectId];
            return next;
          });
        }
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
        projectId, assetId: payload!.assetId || payload!.fileId, applicationData: payload, iframeGeneration: dragBridge.getIframeGeneration() }, window.location.origin);
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
    if (isDragging || pointerSort.drag) return;
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const viewGalleryPhoto = (projectId: string, mediaId: string) => {
    if (pointerSort.suppressClick(mediaId)) return;
    const photos = allProjects.flatMap(project => orderResolvedGallery(project.media.galleryMedia || [], galleryDraftOrders[project.id])
      .filter(photo => !(galleryHiddenIds[project.id] || []).includes(photo.id))
      .map(photo => ({ projectId: project.id, photo })));
    const images = photos.map(({ photo }) => ({
      src: photo.variants.responsive?.at(-1)?.webp || photo.variants.web || photo.variants.original || photo.variants.thumbnail!,
      alt: photo.alt, blurDataURL: photo.variants.blur,
    }));
    const index = photos.findIndex(item => item.projectId === projectId && item.photo.id === mediaId);
    if (index >= 0) openLightbox(images, index);
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
          <h1 className="mt-3 max-w-3xl text-4xl font-bold leading-tight text-text-on-dark sm:text-6xl"><TextCopy textKey="work.copy.1" /></h1>
          <p className="mt-5 max-w-xl text-lg text-text-on-dark"><TextCopy textKey="work.copy.2" /></p>
        </Container>
      </section>

      {/* FEATURED TRANSFORMATIONS — the emotional open */}
      <Section className="relative bg-deep">
        <BlueprintGrid gridSize={24} lineColor="rgba(217, 154, 78, 0.06)" />
        <Container>
          <SectionHeading
            eyebrow={<span className="text-honey"><TextCopy textKey="work.copy.3" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="work.transformations.title" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="work.transformations.description" /></span>}
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
            eyebrow={<span className="text-honey"><TextCopy textKey="work.copy.4" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="work.stories.title" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="work.stories.description" /></span>}
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
                            <h2 className="text-xl font-bold text-text"><ContentCopy collection="projects" id={project.id} field="title" value={project.title} route={`/projects/${project.slug}`} /></h2>
                            <p className="mt-2 line-clamp-2 text-sm text-text-muted"><ContentCopy collection="projects" id={project.id} field={project.story?.outcome?'story.outcome':project.story?.solution?'story.solution':'title'} value={project.story?.outcome || project.story?.solution || project.title} route={`/projects/${project.slug}`} /></p>
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
            eyebrow={<span className="text-honey"><TextCopy textKey="work.copy.5" /></span>}
            title={<span className="text-text-on-dark"><TextCopy textKey="work.archive.title" /></span>}
            description={<span className="text-text-on-dark/90"><TextCopy textKey="work.archive.description" /></span>}
          />
          {isWorkbenchMode && (
            <p role="status" aria-live="polite" className="mt-4 text-sm text-text-on-dark/90">
              {galleryNotice || 'Drag photos to rearrange each project. Make as many changes as you like, then save them together.'}
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
              const galleryPhotos = orderResolvedGallery(project.media.galleryMedia || [], galleryDraftOrders[project.id])
                .filter(photo => !(galleryHiddenIds[project.id] || []).includes(photo.id));

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
                    role="button"
                    tabIndex={0}
                    className="group relative block aspect-[4/3] overflow-hidden rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 mb-4"
                    style={pointerSort.cardStyle(project.id, mediaId)}
                    onClick={() => viewGalleryPhoto(project.id, mediaId)}
                    onKeyDown={event => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); viewGalleryPhoto(project.id, mediaId); }
                    }}
                    aria-label={`View ${photo.alt || project.title} in full screen`}
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
                        galleryDragging={pointerSort.drag?.sourceId === mediaId && pointerSort.drag.projectId === project.id}
                        onGalleryClick={() => viewGalleryPhoto(project.id, mediaId)}
                        galleryPointerHandlers={{
                          onPointerDown: event => {
                            if (!pendingPointerProjects.current.has(project.id)) pointerSort.onPointerDown(event, project.id, mediaId);
                          },
                          onPointerMove: pointerSort.onPointerMove,
                          onPointerUp: pointerSort.onPointerUp,
                          onPointerCancel: pointerSort.onPointerCancel,
                          onLostPointerCapture: pointerSort.onPointerCancel,
                        }}
                      >
                        <img
                          src={src}
                          alt={photo!.alt || `${project.title} photo ${photoIndex + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                          loading="lazy"
                          draggable={false}

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
                          <select aria-label={`Move ${photo.alt || project.title} to position`} value={photoIndex}
                            className="min-h-11 max-w-20 rounded bg-deep px-2 text-text-on-dark"
                            onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}
                            onChange={event=>{event.stopPropagation();const target=Number(event.target.value);if(target!==photoIndex) movePhoto(project.id,mediaId,galleryPhotos[target].id);}}>
                            {galleryPhotos.map((candidate,index)=><option key={candidate.id} value={index}>{index+1}</option>)}
                          </select>
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

      {pointerSort.drag && createPortal(
        <div ref={pointerSort.ghostRef} aria-hidden="true" data-gallery-drag-ghost
          className="pointer-events-none fixed z-[100] overflow-hidden rounded-lg shadow-2xl ring-2 ring-honey"
          style={{ left: pointerSort.drag.rects[pointerSort.drag.sourceIndex].left,
            top: pointerSort.drag.rects[pointerSort.drag.sourceIndex].top,
            width: pointerSort.drag.rects[pointerSort.drag.sourceIndex].width,
            height: pointerSort.drag.rects[pointerSort.drag.sourceIndex].height,
            transform: `translate3d(${pointerSort.drag.x - pointerSort.drag.startX}px, ${pointerSort.drag.y - pointerSort.drag.startY}px, 0)` }}>
          <img src={pointerSort.drag.src} alt="" className="h-full w-full object-cover" draggable={false} />
        </div>, document.body
      )}

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
