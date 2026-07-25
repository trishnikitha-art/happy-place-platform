import Image from "next/image";
import Link from "next/link";
import { StarRating } from "@/components/star-rating";
import { CraftCard } from "@/components/ui/card";
import type { Review } from "@/types/reviews";
import { getProjectById } from "@/lib/projects";
import { getMediaById } from "@/lib/media";

interface ReviewCardProps {
  review: Review;
  tone?: "light" | "dark";
}

/**
 * ReviewCard — displays customer reviews with future-ready slots.
 * 
 * Designed for moderation workflow states:
 * - Pending moderation (badge)
 * - Approved (visible)
 * - Rejected (hidden)
 * - Published (visible)
 * 
 * Future slots (ready for data):
 * - Avatar (reviewer photo)
 * - Rating (star display)
 * - Title (review headline)
 * - Body (review content)
 * - Owner response (reply)
 * - Verification badge (verified source)
 * - Pending badge (awaiting moderation)
 * - Project association (link to project)
 * - Photos (review images)
 * 
 * Surface-aware: accepts tone prop to adapt colors for light/dark backgrounds.
 */
export function ReviewCard({ review, tone = "light" }: ReviewCardProps) {
  // Review Authority: Reviews should only reference projectId, never image IDs
  // The UI automatically displays hero image, gallery, location, project page, before/after
  // from Project Authority via Media Authority
  const project = review.projectId ? getProjectById(review.projectId) : null;
  const hasProjectPhoto = project && project.media.hero;
  const projectHeroMedia = hasProjectPhoto ? getMediaById(project.media.hero) : null;
  const projectHeroSrc = projectHeroMedia?.variants?.original || projectHeroMedia?.variants?.webp || projectHeroMedia?.variants?.avif;

  // Moderation state badges
  const isPending = review.status === "pending";
  const isRejected = review.status === "rejected";
  const isVerified = review.verified || review.externalSource === "google" || review.externalSource === "yelp";

  // Surface-aware text colors
  const headingColor = tone === "dark" ? "text-text-on-dark" : "text-primary";
  const bodyColor = tone === "dark" ? "text-text-on-dark/90" : "text-text";
  const mutedColor = tone === "dark" ? "text-text-on-dark/70" : "text-text-muted";
  const avatarBg = tone === "dark" ? "bg-text-on-dark/20" : "bg-primary/15";
  const avatarText = tone === "dark" ? "text-text-on-dark" : "text-primary";
  const badgeBg = tone === "dark" ? "bg-text-on-dark/20" : "bg-primary/10";
  const badgeText = tone === "dark" ? "text-text-on-dark" : "text-primary";
  const borderColor = tone === "dark" ? "border-text-on-dark/30" : "border-border/40";
  const responseBg = tone === "dark" ? "bg-text-on-dark/10" : "bg-surface-muted";
  const responseBorder = tone === "dark" ? "border-text-on-dark/40" : "border-primary";
  const responseLabel = tone === "dark" ? "text-text-on-dark" : "text-primary";
  const linkColor = tone === "dark" ? "text-text-on-dark hover:text-white" : "text-primary hover:underline";

  return (
    <CraftCard className="flex flex-col p-5 sm:p-6" tone={tone}>
      {/* Header: Rating + Status Badges */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* Avatar slot (future) */}
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${avatarBg} ${avatarText} font-semibold text-sm`}>
            {review.reviewer.initials || review.reviewer.name.charAt(0)}
          </div>
          <StarRating rating={review.rating} />
        </div>
        
        {/* Status badges */}
        <div className="flex flex-col items-end gap-1">
          {isPending && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              Pending
            </span>
          )}
          {isVerified && !isPending && (
            <span className={`rounded-full ${badgeBg} px-2 py-0.5 text-xs font-semibold ${badgeText}`}>
              ✓ Verified
            </span>
          )}
          {review.externalSource && !isPending && (
            <span className={`text-xs ${mutedColor} capitalize`}>
              {review.externalSource}
            </span>
          )}
        </div>
      </div>
      
      {/* Title slot */}
      {review.title && <h3 className={`mt-4 font-display text-lg font-bold sm:text-xl ${headingColor}`}>{review.title}</h3>}
      
      {/* Body slot */}
      <blockquote className={`mt-3 flex-1 text-sm leading-relaxed sm:text-base ${bodyColor}`}>
        &ldquo;{review.body}&rdquo;
      </blockquote>
      
      {/* Footer: Reviewer info */}
      <figcaption className={`mt-5 border-t ${borderColor} pt-4 text-sm`}>
        <span className={`font-semibold ${bodyColor}`}>{review.reviewer.name}</span>
        {review.location && <span className={mutedColor}> · {review.location.city}, {review.location.county}</span>}
        {review.service && <span className={`mt-1 block text-xs ${mutedColor} capitalize`}>{review.service.replace('-', ' ')}</span>}
      </figcaption>

      {/* Owner response slot */}
      {review.ownerResponse && (
        <div className={`mt-4 rounded-lg ${responseBg} p-4 border-l-4 ${responseBorder}`}>
          <p className={`text-xs font-semibold ${responseLabel} uppercase tracking-wide mb-1`}>
            {review.ownerResponse.author} replied
          </p>
          <p className={`${bodyColor} leading-relaxed text-sm`}>
            {review.ownerResponse.body}
          </p>
        </div>
      )}

      {/* Project association slot */}
      {review.projectId && project && (
        <div className="mt-4">
          {hasProjectPhoto && projectHeroSrc && (
            <div className="relative h-24 w-full overflow-hidden rounded-lg mb-3">
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
            className={`inline-flex items-center gap-2 text-sm font-semibold ${linkColor}`}
          >
            View Project →
          </Link>
        </div>
      )}

      {/* Photos slot (future) */}
      {review.photos && review.photos.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {review.photos.slice(0, 4).map((photoId, i) => {
            const photoMedia = getMediaById(photoId);
            const photoSrc = photoMedia?.variants?.web || photoMedia?.variants?.original;
            if (!photoSrc) return null;
            return (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={photoSrc}
                  alt={photoMedia?.alt || `Review photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
              </div>
            );
          })}
        </div>
      )}
    </CraftCard>
  );
}
