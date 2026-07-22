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
    <figure className="group relative overflow-hidden rounded-card border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md photo-mounted">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={t.image.src}
          alt={t.image.alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep/90 to-transparent p-4 pt-12">
          <p className="font-display text-lg font-bold text-text-on-dark">{t.title}</p>
          {t.county && <p className="text-xs text-text-on-dark/70">{t.county}</p>}
        </div>
        <span className="absolute left-3 top-3 rounded-full bg-deep/80 px-3 py-1 text-xs font-semibold text-text-on-dark backdrop-blur-sm">
          Before → After
        </span>
      </div>
      <figcaption className="px-4 py-4">
        <p className="text-sm text-text-muted">{t.summary}</p>
        
        {/* Story details */}
        {(t.problem || t.solution || t.result) && (
          <div className="mt-4 space-y-3 border-t border-border pt-3">
            {t.problem && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Problem</p>
                <p className="mt-1 text-sm text-text">{t.problem}</p>
              </div>
            )}
            {t.solution && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Solution</p>
                <p className="mt-1 text-sm text-text">{t.solution}</p>
              </div>
            )}
            {t.result && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-text-subtle">Result</p>
                <p className="mt-1 text-sm text-text">{t.result}</p>
              </div>
            )}
          </div>
        )}

        {/* Metadata */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-subtle">
          {t.timeline && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Timeline:</span> {t.timeline}
            </span>
          )}
          {t.scope && (
            <span className="flex items-center gap-1">
              <span className="font-medium">Scope:</span> {t.scope}
            </span>
          )}
          {t.service && (
            <span className="rounded-full bg-surface-muted px-2 py-1">{t.service}</span>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
