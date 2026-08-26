import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/star-rating";
import type { Review } from "@/types/reviews";
import { getProjectById } from "@/lib/projects";

interface FeaturedReviewProps {
  review: Review;
  projectWithMedia?: Project; // P0 FIX: Pass pre-validated project to avoid getMediaById bypass
}

export function FeaturedReview({ review, projectWithMedia }: FeaturedReviewProps) {
  // Review Authority: Reviews should only reference projectId, never image IDs
  // The UI automatically displays hero image, gallery, location, project page, before/after
  // from Project Authority via Media Authority
  // P0 FIX: Use pre-validated projectWithMedia if provided, otherwise fall back to current data limitation
  const project = projectWithMedia || (review.projectId ? getProjectById(review.projectId) : null);
  const hasProjectPhoto = project && project.media.heroMedia;
  const projectHeroMedia = hasProjectPhoto ? project.media.heroMedia : null;
  const projectHeroSrc = projectHeroMedia?.variants?.original || projectHeroMedia?.variants?.webp || projectHeroMedia?.variants?.avif;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-surface shadow-float">
      {hasProjectPhoto && projectHeroSrc && (
        <div className="relative h-64 md:h-80 w-full overflow-hidden">
          <Image
            src={projectHeroSrc}
            alt={projectHeroMedia?.alt || project.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        </div>
      )}
      
      <div className="relative -mt-20 px-6 pb-8 md:px-10 md:pb-10">
        <div className="flex items-center gap-3">
          <StarRating rating={review.rating} />
          {review.verified && (
            <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              ✓ Verified Project
            </span>
          )}
        </div>
        
        {review.title && (
          <h2 className="mt-4 font-display text-2xl font-bold text-text md:text-3xl" style={{ lineHeight: 'var(--leading-display)', letterSpacing: 'var(--tracking-display)' }}>
            {review.title}
          </h2>
        )}

        <blockquote className="mt-4 text-lg text-text-muted md:text-xl" style={{ lineHeight: 'var(--leading-body)', letterSpacing: 'var(--tracking-body)' }}>
          &ldquo;{review.body}&rdquo;
        </blockquote>
        
        <div className="mt-6 flex items-center gap-4 text-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
            {review.reviewer.initials || review.reviewer.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <p className="font-semibold text-text">{review.reviewer.name}</p>
            {review.location && (
              <p className="text-text-subtle">{review.location.city}, {review.location.county}</p>
            )}
          </div>
        </div>

        {review.ownerResponse && (
          <div className="mt-6 rounded-lg bg-[#F5F1E8] p-5 border-l-4 border-[#8B7355]">
            <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-2">
              {review.ownerResponse.author} replied
            </p>
            <p className="text-text-muted leading-relaxed text-sm">
              {review.ownerResponse.body}
            </p>
          </div>
        )}

        {review.projectId && project && (
          <div className="mt-6">
            <Link
              href={`/projects/${project.seo?.slug || project.id}`}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
            >
              View Project →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
