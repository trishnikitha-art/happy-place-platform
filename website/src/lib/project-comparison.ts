import type { Project } from "@/types/projects";

export function comparisonSource(media: Project["media"]["beforeMedia"]) {
  return media?.variants.original || media?.variants.web || media?.variants.webp || media?.variants.avif;
}

export function hasBeforeAfterPhotos(project: Project) {
  return Boolean(comparisonSource(project.media.beforeMedia) && comparisonSource(project.media.afterMedia));
}
