import Image from "next/image";
import { CedarCorner } from "@/components/cedar-corner";
import type { Transformation } from "@/config/transformations";

/**
 * BeforeAfterCard — honest transformation story. The real before→after shots
 * are single split-screen composites, not separate frame pairs, so a fake
 * draggable slider would be dishonest. We show the composite as one photo with
 * clear "Before / After" labeling and the project context.
 */
export function BeforeAfterCard({ t }: { t: Transformation }) {
  return (
    <figure className="group relative overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={t.image.src}
          alt={t.image.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep/80 to-transparent p-4 pt-10">
          <p className="font-display text-lg font-bold text-text-on-dark">{t.title}</p>
          {t.county && <p className="text-xs text-text-on-dark/70">{t.county}</p>}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-semibold text-text-on-dark">
          Before → After
        </span>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
        <span className="font-medium text-text-muted">{t.summary}</span>
        {t.service && <span className="text-text-subtle">{t.service}</span>}
      </figcaption>
    </figure>
  );
}
