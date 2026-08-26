"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";
import { StarRating } from "@/components/star-rating";
import { CraftCard } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Review } from "@/types/reviews";
import { getProjectById } from "@/lib/projects";

interface ReviewCardProps {
  review: Review;
  projectWithMedia?: Project; // P0 FIX: Pass pre-validated project to avoid getMediaById bypass
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
 * COLOR PAIRING RULE: Cards ALWAYS use light register (bg-surface).
 * Card text always uses light register tokens regardless of page background.
 */
export function ReviewCard({ review, projectWithMedia }: ReviewCardProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Review Authority: Reviews should only reference projectId, never image IDs
  // The UI automatically displays hero image, gallery, location, project page, before/after
  // from Project Authority via Media Authority
  // P0 FIX: Use pre-validated projectWithMedia if provided, otherwise fall back to current data limitation
  const project = projectWithMedia || (review.projectId ? getProjectById(review.projectId) : null);
  const hasProjectPhoto = project && project.media.heroMedia;
  const projectHeroMedia = hasProjectPhoto ? project.media.heroMedia : null;
  const projectHeroSrc = projectHeroMedia?.variants?.original || projectHeroMedia?.variants?.webp || projectHeroMedia?.variants?.avif;

  // Moderation state badges
  const isPending = review.status === "pending";
  const isRejected = review.status === "rejected";
  const isVerified = review.verified || review.externalSource === "google" || review.externalSource === "yelp";

  // Card text colors - always light register (cards are always light surfaces)
  const headingColor = "text-text";
  const bodyColor = "text-text-muted";
  const mutedColor = "text-text-muted";
  const avatarBg = "bg-primary/15";
  const avatarText = "text-text";
  const badgeBg = "bg-primary/10";
  const badgeText = "text-text";
  const borderColor = "border-border/40";
  const responseBg = "bg-surface-muted";
  const responseBorder = "border-primary";
  const responseLabel = "text-text";
  const linkColor = "text-text hover:text-honey";

  return (
    <CraftCard className="flex flex-col p-5 @[300px]:p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-xl" style={{ containerType: 'inline-size' }}>
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
            <span className={cn(
              "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 transition-all duration-300 ease-out",
              isMounted ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}>
              Pending
            </span>
          )}
          {isVerified && !isPending && (
            <span className={cn(
              `rounded-full ${badgeBg} px-2 py-0.5 text-xs font-semibold ${badgeText} transition-all duration-300 ease-out`,
              isMounted ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}>
              ✓ Verified
            </span>
          )}
          {review.externalSource && !isPending && (
            <span className={cn(
              `text-xs ${mutedColor} capitalize transition-all duration-300 ease-out`,
              isMounted ? "opacity-100 scale-100" : "opacity-0 scale-75"
            )}>
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

      {/* Owner response slot - using :has() pattern for expansion */}
      {review.ownerResponse && (
        <div 
          className={`mt-4 rounded-lg ${responseBg} p-4 border-l-4 ${responseBorder} transition-all duration-300 ease-out overflow-hidden`}
        >
          <label className="block cursor-pointer">
            <input type="checkbox" className="peer hidden" />
            <p className={`text-xs font-semibold ${responseLabel} uppercase tracking-wide mb-1 flex items-center justify-between`}>
              {review.ownerResponse.author} replied
              <span className="transition-transform duration-300 peer-checked:rotate-180">
                ▼
              </span>
            </p>
            <div className="max-h-0 opacity-0 transition-all duration-300 ease-out peer-checked:max-h-96 peer-checked:opacity-100 peer-checked:mt-2">
              <p className={`${bodyColor} leading-relaxed text-sm`}>
                {review.ownerResponse.body}
              </p>
            </div>
          </label>
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
            className={`inline-flex items-center gap-2 text-sm font-semibold min-h-[44px] ${linkColor}`}
          >
            View Project →
          </Link>
        </div>
      )}

      {/* Photos slot (future) */}
      {review.photosMedia && review.photosMedia.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {review.photosMedia.slice(0, 4).map((photo, i) => {
            const photoSrc = photo.variants?.web || photo.variants?.original;
            if (!photoSrc) return null;
            return (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
                <Image
                  src={photoSrc}
                  alt={photo.alt || `Review photo ${i + 1}`}
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
