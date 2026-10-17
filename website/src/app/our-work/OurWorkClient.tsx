"use client";
import { archiveKey, isArchiveOrder } from '@/lib/archive-order';
import { TextCopy } from '@/components/text-copy';
import { ContentCopy } from '@/components/content-copy';


import Link from "next/link";
import Image from "next/image";
import { Section } from "@/components/section";
import { BeforeAfterSlider } from "@/components/before-after-slider";
import { getServiceBySlug } from "@/lib/registries";
import { ProjectLightbox } from "@/components/project-lightbox";
import { ArrowDown, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { VisualSlot } from "@/components/visual-slot";
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useGalleryPointerSort } from "@/components/use-gallery-pointer-sort";
import type { Project } from "@/types/projects";
import { dragBridge } from "@/lib/workbench-drag-bridge";
import { isGalleryOrder, orderResolvedGallery } from "@/lib/workbench-gallery-order";
import { allPortfolioFilters, filterPortfolio, readPortfolioFilters, type PortfolioFilters } from './portfolio-filters';

interface OurWorkClientProps {
  company: {
    proof: {
      projectsCompleted: string;
    };
    ccbNumber: string;
  };
  archiveOrder: string[];
  allProjects: Project[];
  featuredProjects: Project[];
}

export default function OurWorkClient({ company, allProjects, featuredProjects, archiveOrder }: OurWorkClientProps) {
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
  const [filters, setFilters] = useState<PortfolioFilters>(allPortfolioFilters);

  useEffect(() => {
    const syncFilters = () => {
      const editor = new URLSearchParams(window.location.search).get('workbench') === 'true';
      setIsWorkbenchMode(editor);
      setFilters(editor ? allPortfolioFilters : readPortfolioFilters(window.location.search, allProjects));
    };
    syncFilters();
    window.addEventListener('popstate', syncFilters);
    return () => window.removeEventListener('popstate', syncFilters);
  }, [allProjects]);

  const updateFilters = (next: PortfolioFilters) => {
    if (isWorkbenchMode) return;
    setFilters(next);
    const url = new URL(window.location.href);
    for (const key of ['service', 'city'] as const) {
      if (next[key] === 'all') url.searchParams.delete(key);
      else url.searchParams.set(key, next[key]);
    }
    window.history.pushState(window.history.state, '', url);
  };

  const [archiveDraft,setArchiveDraft] = useState<string[] | null>(null);
  const archivePending = useRef(false);
  const pointerSort = useGalleryPointerSort(({ projectId, sourceId, targetId, visibleOrder }) => {
    if(window.parent===window || archivePending.current) return;
    window.parent.postMessage({type:'ARCHIVE_REORDER',sourceSlotId:sourceId,targetSlotId:targetId,
      iframeGeneration:dragBridge.getIframeGeneration()},window.location.origin);
    archivePending.current=true;
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
      } else if ((data.type==='ARCHIVE_ORDER_PREVIEW' || data.type==='ARCHIVE_REORDER_NACK') && data.iframeGeneration===dragBridge.getIframeGeneration()) {
        archivePending.current=false;
        if(isArchiveOrder(data.order)) setArchiveDraft(data.order);
        setGalleryNotice(data.reason || 'Archive order updated in preview. Keep rearranging, then save all gallery changes once.');
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
        setArchiveDraft(null);archivePending.current=false;
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

  const movePhoto = (sourceSlotId: string, targetSlotId: string) => {
    if(window.parent===window || archivePending.current) return;
    archivePending.current=true;
    window.parent.postMessage({type:'ARCHIVE_REORDER',sourceSlotId,targetSlotId,
      iframeGeneration:dragBridge.getIframeGeneration()},window.location.origin);
  };
  const entries=allProjects.flatMap(project=>orderResolvedGallery(project.media.galleryMedia || [],galleryDraftOrders[project.id])
    .filter(photo=>!(galleryHiddenIds[project.id] || []).includes(photo.id)).map(photo=>({project,photo,id:archiveKey(project.id,photo.id)})));
  const galleryPhotos=orderResolvedGallery(entries,archiveDraft ?? archiveOrder);
  const visibleProjects = filterPortfolio(allProjects, isWorkbenchMode ? allPortfolioFilters : filters);
  const visibleProjectIds = new Set(visibleProjects.map(project => project.id));
  const visibleGalleryPhotos = galleryPhotos.filter(entry => visibleProjectIds.has(entry.project.id));
  const serviceOptions = [...new Set(allProjects.map(project => project.service))];
  const cities = [...new Set(allProjects.map(project => project.location.city).filter(Boolean))];
  const hasFilters = filters.service !== 'all' || filters.city !== 'all';
  const comparisonProjects = featuredProjects.filter(project => {
    const before = project.media.beforeMedia;
    const after = project.media.afterMedia;
    return visibleProjectIds.has(project.id) && before && after && before.id !== after.id
      && before.contentHash !== after.contentHash;
  });

  const openLightbox = (images: Array<{src: string; alt: string; blurDataURL?: string}>, index: number) => {
    if (isDragging || pointerSort.drag) return;
    setLightboxImages(images);
    setLightboxIndex(index);
    setLightboxOpen(true);
  };

  const viewGalleryPhoto = (projectId: string, mediaId: string) => {
    if (pointerSort.suppressClick(archiveKey(projectId,mediaId))) return;
    const photos = visibleGalleryPhotos.map(({project,photo})=>({projectId:project.id,photo}));
    const images = photos.map(({ photo }) => ({
      src: photo.variants.responsive?.at(-1)?.webp || photo.variants.web || photo.variants.original || photo.variants.thumbnail!,
      alt: photo.alt, blurDataURL: photo.variants.blur,
    }));
    const index = photos.findIndex(item => item.projectId === projectId && item.photo.id === mediaId);
    if (index >= 0) openLightbox(images, index);
  };

  return (
    <>
      <header className="bg-[#EDEAE0] text-[#1F3F3C]">
        <div className="craft-shell pb-8 pt-8 sm:pb-10 sm:pt-12">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#1F3F3C]/20 pb-5">
            <p className="craft-eyebrow">Happy Place Carpentry / Willamette Valley</p>
            <p className="hidden text-xs tracking-wide sm:block">{company.ccbNumber}</p>
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:gap-20">
            <h1 className="craft-display"><TextCopy textKey="work.copy.1" /></h1>
            <div className="max-w-xl">
              <p className="text-base leading-relaxed text-[#1F3F3C]/80 sm:text-xl"><TextCopy textKey="work.copy.2" /></p>
              <div className="hidden lg:block"><a href="#project-stories" className="craft-link mt-3 inline-flex min-h-11 items-center gap-3">Explore the projects <ArrowDown size={17} aria-hidden="true" /></a></div>
            </div>
          </div>
        </div>
      </header>

      <section id="project-stories" aria-labelledby="project-stories-title" className="scroll-mt-28 bg-[#EDEAE0] pb-16 text-[#1F3F3C] sm:pb-24">
        <div className="craft-shell">
          <div className="mb-6 grid items-end gap-3 lg:grid-cols-[1.1fr_1fr] lg:gap-20"><div><p className="craft-eyebrow"><TextCopy textKey="work.copy.4" /></p><h2 id="project-stories-title" className="mt-3 font-display text-2xl leading-tight sm:text-3xl"><TextCopy textKey="work.stories.title" /></h2></div><p className="max-w-xl text-sm leading-relaxed text-[#1F3F3C]/75"><TextCopy textKey="work.stories.description" /></p></div>
          <div className="border-y border-[#1F3F3C]/20 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.15em]"><SlidersHorizontal size={15} aria-hidden="true" /> Explore the work</p>
              <p role="status" aria-live="polite" aria-atomic="true" className="text-sm">{visibleProjects.length} {visibleProjects.length === 1 ? 'project' : 'projects'}{hasFilters && !isWorkbenchMode ? ' match your selection' : ' in the collection'}</p>
            </div>
            <div role="group" aria-label="Filter projects by service" className="mt-3 flex flex-wrap gap-2">
              <button type="button" disabled={isWorkbenchMode} onClick={() => updateFilters({ ...filters, service: 'all' })} aria-pressed={filters.service === 'all'} className={`min-h-11 rounded-full border px-5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F3F3C] disabled:cursor-not-allowed ${filters.service === 'all' ? 'border-[#1F3F3C] bg-[#1F3F3C] text-[#EDEAE0]' : 'border-[#1F3F3C]/25 hover:bg-[#1F3F3C]/5'}`}>All work</button>
              {serviceOptions.map(service => <button key={service} type="button" disabled={isWorkbenchMode} onClick={() => updateFilters({ ...filters, service })} aria-pressed={filters.service === service} className={`min-h-11 rounded-full border px-5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F3F3C] disabled:cursor-not-allowed ${filters.service === service ? 'border-[#1F3F3C] bg-[#1F3F3C] text-[#EDEAE0]' : 'border-[#1F3F3C]/25 hover:bg-[#1F3F3C]/5'}`}>{getServiceBySlug(service)?.name || service.replaceAll('-', ' ')}</button>)}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4">
              {cities.length > 1 && <label className="flex min-h-11 items-center gap-3 text-sm">Location<select aria-label="Filter projects by location" disabled={isWorkbenchMode} value={filters.city} onChange={event => updateFilters({ ...filters, city: event.target.value })} className="min-h-11 rounded border border-[#1F3F3C]/25 bg-transparent px-3"><option value="all">All locations</option>{cities.map(city => <option key={city} value={city}>{city}</option>)}</select></label>}
              {hasFilters && !isWorkbenchMode && <button type="button" onClick={() => updateFilters(allPortfolioFilters)} className="min-h-11 text-sm underline underline-offset-4">Clear filters</button>}
              {isWorkbenchMode && <p className="text-xs text-[#1F3F3C]/70">All projects stay visible while editing their photos and order.</p>}
            </div>
          </div>

          <div className="divide-y divide-[#1F3F3C]/20">
            {visibleProjects.map((project, index) => {
              const hero = project.media.heroMedia;
              const source = hero?.variants.responsive?.at(-1)?.webp || hero?.variants.web || hero?.variants.original;
              const route = `/projects/${project.slug || project.id}`;
              return <article key={project.id} className="grid items-center gap-7 py-7 sm:gap-10 sm:py-12 lg:grid-cols-[1.35fr_1fr] lg:gap-16">
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  {source && <Link href={route} className="group relative block overflow-hidden bg-[#1F3F3C]/5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1F3F3C]" aria-label={`Read the story: ${project.title}`}>
                    <div className="relative aspect-[4/3] sm:aspect-[16/11]">
                      <VisualSlot id={`our-work-project-card-${project.id}`} route="/our-work" page="OurWork" section="Recent Projects" slotName={`${project.title} Project Card`} currentMediaId={hero?.id || null} component="ProjectCard">
                        <Image src={source} alt={hero?.alt || project.title} fill sizes="(min-width: 1440px) 740px, (min-width: 1024px) 56vw, 100vw" priority={index === 0} placeholder={hero?.variants.blur ? 'blur' : 'empty'} blurDataURL={hero?.variants.blur} className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none" />
                      </VisualSlot>
                    </div>
                    <span className="absolute bottom-4 right-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#EDEAE0] text-[#1F3F3C] transition-colors group-hover:bg-[#D99A4E]" aria-hidden="true"><ArrowUpRight size={22} /></span>
                  </Link>}
                </div>
                <div className={source ? 'max-w-xl' : 'max-w-xl lg:col-span-2'}>
                  <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold uppercase tracking-[0.15em]"><span className="text-[#1F3F3C]/50">{String(allProjects.indexOf(project) + 1).padStart(2, '0')}</span><span>{getServiceBySlug(project.service)?.name || project.service.replaceAll('-', ' ')}</span>{project.location.city && <><span aria-hidden="true">/</span><span>{project.location.city}</span></>}</p>
                  <h3 className="mt-5 font-display text-3xl leading-[1.13] tracking-tight sm:text-4xl lg:text-[2.65rem]"><Link href={route} className="decoration-[#D99A4E] underline-offset-8 hover:underline"><ContentCopy collection="projects" id={project.id} field="title" value={project.title} route={route} /></Link></h3>
                  {(project.story?.outcome || project.story?.solution) && <p className="mt-5 text-base leading-relaxed text-[#1F3F3C]/80 sm:text-lg"><ContentCopy collection="projects" id={project.id} field={project.story.outcome ? 'story.outcome' : 'story.solution'} value={project.story.outcome || project.story.solution} route={route} /></p>}
                  <Link href={route} className="craft-link mt-6 inline-flex min-h-11 items-center gap-3">Read the project story <ArrowUpRight size={17} aria-hidden="true" /></Link>
                </div>
              </article>;
            })}
          </div>
          {visibleProjects.length === 0 && <div className="py-16 text-center"><p className="font-display text-3xl">No projects in this selection.</p><p className="mt-3 text-sm">Choose another service or location to explore the collection.</p><button type="button" onClick={() => updateFilters(allPortfolioFilters)} className="craft-button mt-6">Show all work</button></div>}
        </div>
      </section>

      {comparisonProjects.length > 0 && <Section className="bg-[#E9DBC9] text-[#1F3F3C]"><div className="craft-shell"><p className="craft-eyebrow"><TextCopy textKey="work.copy.3" /></p><h2 className="craft-title mt-4"><TextCopy textKey="work.transformations.title" /></h2><div className="mt-10 grid gap-8 md:grid-cols-2">{comparisonProjects.map(project => <BeforeAfterSlider key={project.id} project={project} route="/our-work" />)}</div></div></Section>}
      {/* BROWSE ALL WORK — continuous gallery grid */}
      <section className="craft-section bg-[#162B29] text-[#EDEAE0]">
        <div className="craft-shell">
          <p className="craft-eyebrow text-[#D99A4E]"><TextCopy textKey="work.copy.5" /></p>
          <h2 className="craft-title mt-4"><TextCopy textKey="work.archive.title" /></h2>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-[#EDEAE0]/75"><TextCopy textKey="work.archive.description" /></p>
          {isWorkbenchMode && (
            <p role="status" aria-live="polite" className="mt-4 text-sm text-text-on-dark/90">
              {galleryNotice || 'Drag any photo anywhere in this gallery, or choose its position. Photos keep their project association. Save all moves together.'}
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
            data-archive-grid className={`gallery-grid mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${isDragging ? 'ring-2 ring-dashed ring-primary/50 ring-offset-2' : ''}`}
            ref={galleryGridRef}
          >
            {visibleGalleryPhotos.map(({project,photo,id:slotId}, photoIndex) => {
                // Request the rendition matching this masonry column and DPR.
                // The lightbox separately retains its full-size source.
                const responsiveVariants = [...(photo.variants.responsive || [])]
                  .filter(variant => Number.isFinite(variant.width) && variant.width > 0 && variant.webp)
                  .sort((a,b) => a.width - b.width);
                const src = responsiveVariants.find(variant => variant.width === 768)?.webp
                  || photo.variants.thumbnail || responsiveVariants[0]?.webp
                  || photo.variants.web || photo.variants.original;
                const webpSrcSet = responsiveVariants.map(variant => variant.webp + ' ' + variant.width + 'w').join(', ');
                const avifSrcSet = responsiveVariants.filter(variant => variant.avif)
                  .map(variant => variant.avif + ' ' + variant.width + 'w').join(', ');
                const gallerySizes = '(min-width: 1440px) 430px, (min-width: 1024px) calc((100vw - 128px) / 3), (min-width: 640px) calc((100vw - 80px) / 2), calc(100vw - 48px)';
                if (!src) return null;
                const mediaId = photo.id;
                
                return (
                  <div
                    key={`${project.id}-${mediaId}`}
                    data-project-id={project.id}
                    data-media-id={mediaId}
                    data-archive-key={slotId}
                    data-photo-index={photoIndex}
                    role="button"
                    tabIndex={0}
                    className="group relative block aspect-[4/3] overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-honey"
                    style={pointerSort.cardStyle('archive', slotId)}
                    onDragOver={isWorkbenchMode ? handleProjectDragOver : undefined}
                    onDrop={isWorkbenchMode ? event=>handleProjectDrop(event,project.id) : undefined}
                    onClick={() => viewGalleryPhoto(project.id, mediaId)}
                    onKeyDown={event => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); viewGalleryPhoto(project.id, mediaId); }
                    }}
                    aria-label={`View ${photo.alt || project.title} in full screen`}
                  >
                    <div className="relative aspect-[4/3] overflow-hidden">
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
                        galleryDragging={pointerSort.drag?.sourceId === slotId}
                        onGalleryClick={() => viewGalleryPhoto(project.id, mediaId)}
                        galleryPointerHandlers={{
                          onPointerDown: event => {
                            if (!archivePending.current) pointerSort.onPointerDown(event, 'archive', slotId);
                          },
                          onPointerMove: pointerSort.onPointerMove,
                          onPointerUp: pointerSort.onPointerUp,
                          onPointerCancel: pointerSort.onPointerCancel,
                          onLostPointerCapture: pointerSort.onPointerCancel,
                        }}
                      >
                        {webpSrcSet ? <picture className="block h-full w-full">
                          {avifSrcSet && <source type="image/avif" srcSet={avifSrcSet} sizes={gallerySizes} />}
                        <img
                          src={src}
                          srcSet={webpSrcSet || undefined}
                          sizes={webpSrcSet ? gallerySizes : undefined}
                          alt={photo!.alt || `${project.title} photo ${photoIndex + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none"
                          loading="lazy"
                          decoding="async"
                          draggable={false}

                        />
                        </picture> : <Image src={photo.variants.web || photo.variants.original || src} alt={photo.alt || `${project.title} photo ${photoIndex + 1}`} width={photo.dimensions.width} height={photo.dimensions.height} sizes={gallerySizes} className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.025] motion-reduce:transition-none" loading="lazy" decoding="async" draggable={false} />}
                      </VisualSlot>
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <span className="pointer-events-none absolute bottom-4 left-4 right-4 text-sm font-medium text-white">
                        {project.title}
                      </span>
                    </div>
                    {isWorkbenchMode && (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-deep/90 px-2 text-text-on-dark">
                        <span className="truncate text-xs">{photoIndex + 1} of {galleryPhotos.length} · {project.title}</span>
                        <div className="flex shrink-0">
                          <select aria-label={`Move ${photo.alt || project.title} to position`} value={photoIndex}
                            className="min-h-11 max-w-20 rounded bg-deep px-2 text-text-on-dark"
                            onPointerDown={event=>event.stopPropagation()} onClick={event=>event.stopPropagation()}
                            onChange={event=>{event.stopPropagation();const target=Number(event.target.value);if(target!==photoIndex) movePhoto(slotId,galleryPhotos[target].id);}}>
                            {galleryPhotos.map((candidate,index)=><option key={candidate.id} value={index}>{index+1}</option>)}
                          </select>
                          <button type="button" className="min-h-11 min-w-11 rounded hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-honey disabled:opacity-30"
                            aria-label={`Move ${photo.alt || project.title} earlier`}
                            disabled={photoIndex === 0}
                            onClick={event => { event.stopPropagation(); movePhoto(slotId, galleryPhotos[photoIndex - 1].id); }}>↑</button>
                          <button type="button" className="min-h-11 min-w-11 rounded hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-honey disabled:opacity-30"
                            aria-label={`Move ${photo.alt || project.title} later`}
                            disabled={photoIndex === galleryPhotos.length - 1}
                            onClick={event => { event.stopPropagation(); movePhoto(slotId, galleryPhotos[photoIndex + 1].id); }}>↓</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
            })}
          </div>
        </div>
      </section>

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

      <section className="craft-section bg-[#E9DBC9] text-[#1F3F3C]">
        <div className="craft-shell grid gap-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
          <div><p className="craft-eyebrow">Your home, next</p><h2 className="craft-title mt-4 max-w-3xl">Have something in mind?</h2><p className="mt-5 max-w-xl text-lg leading-relaxed text-[#1F3F3C]/80">Tell us about the work you have in mind.</p><Link href="/estimate" className="craft-button craft-button--gold mt-7 inline-flex items-center gap-3">Start your project <ArrowUpRight size={18} aria-hidden="true" /></Link></div>
          <div className="border-t border-[#1F3F3C]/25 pt-6 lg:border-l lg:border-t-0 lg:pl-10"><p className="font-display text-2xl">A little more from the workshop.</p><Link href="/newsletter" className="craft-link mt-3 inline-flex min-h-11 items-center gap-3">Explore the newsletter <ArrowUpRight size={16} aria-hidden="true" /></Link></div>
        </div>
      </section>
    </>
  );
}
