"use client";

import type { Media } from "@/types/media";
import { useState } from "react";
import { ProjectLightbox } from "@/components/project-lightbox";
import Image from "next/image";

/**
 * ProjectPhotos - Reusable component for displaying project photos with lightbox
 * 
 * This component receives pre-loaded photo data to ensure server-side rendering.
 * The parent component is responsible for loading the data from the authority.
 * 
 * Vertical slice validation:
 * projects.v1.json → gallery array → getMediaById() → ProjectPhotos → img
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
    photo.variants.webp || photo.variants.original || photo.variants.thumbnail
  );

  const lightboxImages = validPhotos.map(m => ({
    src: m.variants.webp || m.variants.original || m.variants.thumbnail!,
    alt: m.alt,
    blurDataURL: m.variants?.blur
  }));

  if (validPhotos.length === 0) {
    return (
      <div className="rounded-lg bg-surface-muted p-8 text-center">
        <p className="text-text-on-dark">Project photos coming soon</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        {validPhotos.map((photo, index) => {
          const src = photo.variants.webp || photo.variants.original || photo.variants.thumbnail;
          if (!src) return null;

          return (
            <button
              key={photo.id}
              className="relative w-full group cursor-pointer"
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
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL={photo.variants?.blur}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-200" />
              </div>
            </button>
          );
        })}
      </div>

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
