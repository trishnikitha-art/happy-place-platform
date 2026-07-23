import Image from "next/image";
import { getProjectById } from "@/lib/projects";
import { getMediaById } from "@/lib/media";

/**
 * ProjectPhotos - Reusable component for displaying project photos
 * 
 * This component uses the project's gallery array from projects.v1.json
 * to ensure hero isolation - only images explicitly listed in the gallery
 * array are rendered, not all project media.
 * 
 * Vertical slice validation:
 * projects.v1.json → gallery array → getMediaById() → ProjectPhotos → Next/Image
 */

type ProjectPhotosProps = {
  projectId: string;
  limit?: number;
};

export function ProjectPhotos({ projectId, limit }: ProjectPhotosProps) {
  // Get project by ID to access its gallery array
  const project = getProjectById(projectId);
  const galleryMediaIds = project?.media?.gallery || [];
  
  // Resolve media IDs to media objects
  const photos = galleryMediaIds
    .map(id => getMediaById(id))
    .filter(m => m !== null && (m.variants?.web || m.variants?.original));
  
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
        const src = photo!.variants.web || photo!.variants.original || photo!.variants.thumbnail;
        if (!src) return null;

        return (
          <div key={photo!.id} className="relative aspect-[4/3] overflow-hidden rounded-lg bg-surface">
            <Image
              src={src}
              alt={photo!.alt}
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
