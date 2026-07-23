import Image from "next/image";
import { CedarCorner } from "@/components/cedar-corner";
import type { BeforeAfterPair } from "@/types/before-after";

/**
 * BeforeAfterCard — honest transformation story. The real before→after shots
 * are single split-screen composites, not separate frame pairs, so a fake
 * draggable slider would be dishonest. We show the composite as one photo with
 * clear "Before / After" labeling and the project context.
 */
export function BeforeAfterCard({ pair, beforeMedia, afterMedia }: { pair: BeforeAfterPair; beforeMedia?: any; afterMedia?: any }) {
  return (
    <figure className="group relative overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md photo-mounted">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={afterMedia?.variants?.original || "/placeholder.jpg"}
          alt={pair.title || "After photo"}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep/90 to-transparent p-4 pt-12">
          <p className="font-display text-lg font-bold text-text-on-dark">{pair.title || "Before & After"}</p>
          <p className="text-xs text-text-on-dark/70">{pair.service}</p>
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-semibold text-text-on-dark backdrop-blur-sm">
          Before → After
        </span>
      </div>
      <figcaption className="px-4 py-4">
        <p className="text-sm text-text-muted">{pair.description || "Transformation completed"}</p>
      </figcaption>
    </figure>
  );
}
