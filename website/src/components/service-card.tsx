import Link from "next/link";
import Image from "next/image";
import type { Service } from "@/types/registries";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui/card";
import { PhotoPlaceholder } from "@/components/photo-placeholder";
import { getFeaturedServiceMedia } from "@/lib/media";

/**
 * ServiceCard — photo-led and dense (CEO review): one iconic image, title,
 * a one-line micro-proof stat, and a clear next step. No large empty areas.
 * 
 * Updated to use new Service type from registries (data-driven configuration).
 * 
 * Service cards use intent-based media lookups from Media Authority.
 * Displays the hero image of the highest-ranked project for that service.
 * Falls back to placeholder only when no images exist for that service.
 */
export function ServiceCard({ service }: { service: Service }) {
  const featuredMedia = getFeaturedServiceMedia(service.slug);
  const hasImage = featuredMedia !== null;
  const imageSrc = hasImage ? (featuredMedia.variants?.web || featuredMedia.variants?.original) : null;

  return (
    <Card className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E4DFD4] photo-mounted">
        {hasImage && imageSrc ? (
          <Image
            src={imageSrc}
            alt={featuredMedia.alt || service.name}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <PhotoPlaceholder />
        )}
        <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-deep/80 text-honey">
          <Icon name={service.icon} className="h-5 w-5" />
        </span>
        {!hasImage && (
          <div className="absolute bottom-3 right-3 rounded-md bg-deep/80 px-3 py-1.5 text-xs font-medium text-text-on-dark">
            Project photos coming soon
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold text-text">{service.name}</h3>
        <p className="clamp-2 mt-2 flex-1 text-sm text-text-muted">{service.description}</p>
        <Link
          href={`/estimate?service=${service.slug}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Start a quote →
        </Link>
      </div>
    </Card>
  );
}
