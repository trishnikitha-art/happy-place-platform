import type { Media } from "@/types/media";

/**
 * ProjectPhotos - Reusable component for displaying project photos
 * 
 * This component receives pre-loaded photo data to ensure server-side rendering.
 * The parent component is responsible for loading the data from the authority.
 * 
 * Vertical slice validation:
 * projects.v1.json → gallery array → getMediaById() → ProjectPhotos → img
 */

type ProjectPhotosProps = {
  photos: Media[];
  limit?: number;
};

export function ProjectPhotos({ photos, limit }: ProjectPhotosProps) {
  const displayPhotos = limit ? photos.slice(0, limit) : photos;

  if (displayPhotos.length === 0) {
    return (
      <div className="rounded-lg bg-surface-muted p-8 text-center">
        <p className="text-text-muted">Project photos coming soon</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {displayPhotos.map((photo) => {
        const src = photo.variants.web || photo.variants.original || photo.variants.thumbnail;
        if (!src) return null;

        return (
          <div key={photo.id} className="relative w-full" style={{ aspectRatio: '4/3' }}>
            <img
              src={src}
              alt={photo.alt}
              className="h-full w-full object-cover rounded-lg"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}
