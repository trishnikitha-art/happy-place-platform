import Image from "next/image";
import { getProjectMedia } from "@/lib/media";

/**
 * ProjectPhotos - Reusable component for displaying project photos
 * 
 * This component demonstrates the intent-based media architecture:
 * - UI asks for intent (projectId) not media IDs
 * - Media adapter handles the lookup
 * - Component is reusable across all pages
 * 
 * Vertical slice validation:
 * media.v1.json → getProjectMedia() → ProjectPhotos → Next/Image
 */

type ProjectPhotosProps = {
  projectId: string;
  limit?: number;
};

export function ProjectPhotos({ projectId, limit }: ProjectPhotosProps) {
  const photos = getProjectMedia(projectId);
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
          <div key={photo.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface">
            <Image
              src={src}
              alt={photo.alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="h-full w-full object-cover"
            />
          </div>
        );
      })}
    </div>
  );
}
