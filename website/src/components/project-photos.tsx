"use client";

import type { Media } from '@/types/media';
import { useState } from 'react';
import { Expand } from 'lucide-react';
import Image from 'next/image';
import { ProjectLightbox } from '@/components/project-lightbox';
import { VisualSlot } from '@/components/visual-slot';

type ProjectPhotosProps = {
  photos: Media[];
  limit?: number;
  project?: { id: string; title: string; slug?: string };
};

/** The server supplies gated media in canonical gallery order. No client lookup or fallback. */
export function ProjectPhotos({ photos, limit, project }: ProjectPhotosProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const validPhotos = (limit ? photos.slice(0, limit) : photos)
    .map((photo, sourceIndex) => ({ photo, sourceIndex }))
    .filter(({ photo }) => photo.variants.web || photo.variants.original || photo.variants.thumbnail);
  const lightboxImages = validPhotos.map(({ photo }) => ({
    src: photo.variants.responsive?.at(-1)?.webp || photo.variants.web || photo.variants.original || photo.variants.thumbnail!,
    alt: photo.alt,
    blurDataURL: photo.variants.blur,
  }));

  if (!validPhotos.length) return null;

  return <>
    <div className="grid items-start gap-x-6 gap-y-8 md:grid-cols-2 lg:gap-x-9 lg:gap-y-12">
      {validPhotos.map(({ photo, sourceIndex }, index) => {
        const src = photo.variants.web || photo.variants.original || photo.variants.thumbnail!;
        const wideOpening = index === 0 && photo.dimensions.width > photo.dimensions.height;
        const image = <Image
          src={src} alt={photo.alt} width={photo.dimensions.width} height={photo.dimensions.height}
          sizes={wideOpening ? '(min-width: 1440px) 1320px, 100vw' : '(min-width: 1440px) 645px, (min-width: 768px) 50vw, 100vw'}
          className="h-auto w-full transition-opacity duration-200 group-hover:opacity-95 motion-reduce:transition-none"
          loading="lazy" placeholder={photo.variants.blur ? 'blur' : 'empty'} blurDataURL={photo.variants.blur} />;
        return <figure key={photo.id} className={wideOpening ? 'md:col-span-2' : ''} data-project-id={project?.id} data-media-id={photo.id}>
          <div className="group relative">
            {project ? <VisualSlot
              id={`project-gallery::${project.id}::${sourceIndex}`}
              route={`/projects/${project.slug || project.id}`} page="ProjectDetail" section="Gallery"
              slotName={`${project.title} Gallery ${sourceIndex + 1}`} currentMediaId={photo.id} component="ProjectSpotlight"
            >{image}</VisualSlot> : image}
            <button type="button"
              onClick={() => { setLightboxIndex(index); setLightboxOpen(true); }}
              className="absolute bottom-3 right-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#EDEAE0] text-[#1F3F3C] transition-colors group-hover:bg-[#D99A4E] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#D99A4E]"
              aria-label={`View photo ${index + 1}: ${photo.alt}`}>
              <Expand size={17} aria-hidden="true" />
            </button>
          </div>
          <figcaption className="mt-3 flex items-baseline gap-4 text-sm text-current/75"><span className="shrink-0 text-xs tabular-nums opacity-60">{String(index + 1).padStart(2, '0')}</span><span>{photo.alt}</span></figcaption>
        </figure>;
      })}
    </div>
    <ProjectLightbox images={lightboxImages} initialIndex={lightboxIndex} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
  </>;
}
