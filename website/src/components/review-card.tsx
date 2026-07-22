import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/star-rating";
import type { Review } from "@/types/reviews";
import { getProjectById } from "@/lib/projects";
import { getMediaById } from "@/lib/media";

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  // Review Authority: Reviews should only reference projectId, never image IDs
  // The UI automatically displays hero image, gallery, location, project page, before/after
  // from Project Authority via Media Authority
  const project = review.projectId ? getProjectById(review.projectId) : null;
  const hasProjectPhoto = project && project.media.hero;
  const projectHeroMedia = hasProjectPhoto ? getMediaById(project.media.hero) : null;
  const projectHeroSrc = projectHeroMedia?.variants?.original || projectHeroMedia?.variants?.webp || projectHeroMedia?.variants?.avif;

  return (
    <figure className="float-card flex flex-col bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
      <div className="flex items-center justify-between">
        <StarRating rating={review.rating} />
        {review.verified && (
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
            ✓ Verified
          </span>
        )}
      </div>
      
      {review.title && <h3 className="mt-4 font-display text-xl font-bold text-text">{review.title}</h3>}
      
      <blockquote className="mt-3 flex-1 text-text-muted leading-relaxed">
        &ldquo;{review.body}&rdquo;
      </blockquote>
      
      <figcaption className="mt-5 border-t border-border-soft pt-4 text-sm">
        <span className="font-semibold text-text">{review.reviewer.name}</span>
        {review.location && <span className="text-text-subtle"> · {review.location.city}, {review.location.county}</span>}
        {review.service && <span className="mt-1 block text-xs text-text-subtle capitalize">{review.service.replace('-', ' ')}</span>}
      </figcaption>

      {review.ownerResponse && (
        <div className="mt-4 rounded-lg bg-[#F5F1E8] p-4 border-l-4 border-[#8B7355]">
          <p className="text-xs font-semibold text-[#8B7355] uppercase tracking-wide mb-1">
            {review.ownerResponse.author} replied
          </p>
          <p className="text-text-muted leading-relaxed text-sm">
            {review.ownerResponse.body}
          </p>
        </div>
      )}

      {review.projectId && project && (
        <div className="mt-4">
          {hasProjectPhoto && projectHeroSrc && (
            <div className="relative h-32 w-full overflow-hidden rounded-lg mb-3">
              <Image
                src={projectHeroSrc}
                alt={projectHeroMedia?.alt || project.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            </div>
          )}
          <Link
            href={`/projects/${project.seo?.slug || project.id}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-hover transition-colors"
          >
            View Project →
          </Link>
        </div>
      )}
    </figure>
  );
}
