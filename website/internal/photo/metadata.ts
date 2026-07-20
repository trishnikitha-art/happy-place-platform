/**
 * Photo metadata v2 (P7) — richer per-image metadata so the image system
 * becomes intelligent as more projects are added. The public site today uses
 * a hand-curated HOMEPAGE_CURATION; this schema lets future selection be
 * score-driven (heroScore / homepageScore / galleryScore) instead of hardcoded.
 */
export interface PhotoV2Meta {
  id: string;
  project?: string;
  service?: string;
  before?: boolean;
  after?: boolean;
  materials?: string[];
  techniques?: string[];
  exterior?: boolean;
  interior?: boolean;
  style?: string;
  mood?: string;
  primaryFeature?: string;
  secondaryFeature?: string;
  orientation?: "portrait" | "landscape" | "square";
  heroScore?: number;       // 0–100 — fit as the opening emotional image
  homepageScore?: number;   // 0–100 — fit for homepage curation
  galleryScore?: number;    // 0–100 — fit for the archive
  season?: string;
  tags?: string[];
  focalPoint?: { x: number; y: number };
}

/**
 * Score-based selector — replaces hardcoded curation when enough metadata
 * exists. Falls back to the existing PHOTO_ROLES curation until scores are
 * populated, so the site never regresses.
 */
export function selectByScore(
  photos: PhotoV2Meta[],
  scoreKey: "heroScore" | "homepageScore" | "galleryScore",
  limit = 6,
): PhotoV2Meta[] {
  return [...photos]
    .filter((p) => typeof p[scoreKey] === "number")
    .sort((a, b) => (b[scoreKey] ?? 0) - (a[scoreKey] ?? 0))
    .slice(0, limit);
}
