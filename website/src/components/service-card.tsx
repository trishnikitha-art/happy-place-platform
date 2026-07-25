import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/types/registries";
import { Icon } from "@/components/icon";
import { CraftCard } from "@/components/ui/card";
import { PhotoMount } from "@/components/photo-mount";
import { getFeaturedServiceMedia } from "@/lib/media";

/**
 * ServiceCard — photo-led and dense (CEO review): one iconic image, title,
 * a one-line micro-proof stat, and a clear next step. No large empty areas.
 * 
 * Updated to use new Service type from registries (data-driven configuration).
 * 
 * Service cards use intent-based media lookups from Media Authority.
 * Displays the hero image of the highest-ranked project for that service.
 * Falls back to intentional empty state when no images exist for that service.
 * 
 * Surface-aware: accepts tone prop to adapt colors for light/dark backgrounds.
 */
export function ServiceCard({ service, tone = "light" }: { service: Service; tone?: "light" | "dark" }) {
  const featuredMedia = getFeaturedServiceMedia(service.slug);
  const hasImage = featuredMedia !== null;
  const imageSrc = hasImage ? (featuredMedia.variants?.web || featuredMedia.variants?.original) : null;

  // Surface-aware text colors
  const headingColor = tone === "dark" ? "text-text-on-dark" : "text-primary";
  const bodyColor = tone === "dark" ? "text-text-on-dark/90" : "text-text";
  const linkColor = tone === "dark" ? "text-text-on-dark font-semibold hover:text-white" : "text-primary hover:underline";

  return (
    <CraftCard className="group flex flex-col overflow-hidden" tone={tone}>
      <PhotoMount className="relative aspect-[4/3] overflow-hidden bg-surface-muted">
        {hasImage && imageSrc ? (
          <>
            <Image
              src={imageSrc}
              alt={featuredMedia.alt || service.name}
              fill
              sizes="(max-width: 768px) 50vw, 33vw"
              className="object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 pointer-events-none rounded-t-xl bg-gradient-to-tr from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-deep/80 text-honey">
              <Icon name={service.icon} className="h-5 w-5" />
            </span>
          </div>
        )}
        {hasImage && (
          <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-deep/80 text-honey">
            <Icon name={service.icon} className="h-5 w-5" />
          </span>
        )}
        {!hasImage && (
          <div className="absolute bottom-3 right-3 rounded-md bg-deep/80 px-3 py-1.5 text-xs font-medium text-text-on-dark">
            Project photos coming soon
          </div>
        )}
      </PhotoMount>
      <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
        <h3 className={`font-display text-lg font-bold sm:text-xl lg:text-2xl ${headingColor}`}>{service.name}</h3>
        <p className={`clamp-2 mt-2 flex-1 text-sm sm:text-base ${bodyColor}`}>{service.description}</p>
        <Link
          href={`/estimate?service=${service.slug}`}
          className={`mt-4 inline-flex items-center gap-1 min-h-[44px] text-sm sm:text-base ${linkColor}`}
        >
          Start a quote →
        </Link>
      </div>
    </CraftCard>
  );
}
