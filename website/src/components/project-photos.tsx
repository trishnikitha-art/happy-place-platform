"use client";

import type { Media } from "@/types/media";
import { useState } from "react";
import { ProjectLightbox } from "@/components/project-lightbox";
import { ScrollReveal } from "@/components/scroll-reveal";
import Image from "next/image";

/**
 * ProjectPhotos - Reusable component for displaying project photos with lightbox
 * 
 * This component receives pre-loaded photo data to ensure server-side rendering.
 * The parent component is responsible for loading the data from the authority.
 * 
 * Vertical slice validation:
 * projects.v1.json ΓåÆ gallery array ΓåÆ getMediaById() ΓåÆ ProjectPhotos ΓåÆ img
 * 
 * Now includes premium lightbox for full-screen image viewing.
 */

type ProjectPhotosProps = {
  photos: Media[];
  limit?: number;
};

export function ProjectPhotos({ photos, limit }: ProjectPhotosProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const displayPhotos = limit ? photos.slice(0, limit) : photos;

  // Filter photos with valid src and prepare lightbox images
  const validPhotos = displayPhotos.filter(photo => 
    photo.variants.web || photo.variants.original || photo.variants.thumbnail
  );
  
  const lightboxImages = validPhotos.map(m => ({
    src: m.variants.web || m.variants.original || m.variants.thumbnail!,
    alt: m.alt,
    blurDataURL: m.variants?.blur
  }));

  if (validPhotos.length === 0) {
    return (
      <div className="rounded-lg bg-surface-muted p-8 text-center">
        <p className="text-text">Project photos coming soon</p>
      </div>
    );
  }

  return (
    <>
      <ScrollReveal variant="sequence" className="grid grid-cols-2 gap-4">
        {validPhotos.map((photo, index) => {
          const src = photo.variants.web || photo.variants.original || photo.variants.thumbnail;
          if (!src) return null;

          return (
            <button
              key={photo.id}
              type="button"
              className="project-motion-card craft-card-link group relative w-full cursor-pointer rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-honey"
              style={{ aspectRatio: '4/3' }}
              onClick={() => {
                setLightboxIndex(index);
                setLightboxOpen(true);
              }}
              aria-label={`View ${photo.alt} in full screen`}
            >
              <div className="relative h-full w-full overflow-hidden rounded-lg">
                <Image
                  src={src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1280px) 600px, (min-width: 640px) calc((100vw - 64px) / 2), calc((100vw - 48px) / 2)"
                  className="craft-photo object-cover"
                  loading="lazy"
                  placeholder={photo.variants?.blur ? "blur" : "empty"}
                  blurDataURL={photo.variants?.blur}
                />
              </div>
            </button>
          );
        })}
      </ScrollReveal>

      {/* Lightbox */}
      <ProjectLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
}
