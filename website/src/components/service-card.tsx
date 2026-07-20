import Image from "next/image";
import Link from "next/link";
import type { Service } from "@/types";
import { Icon } from "@/components/icon";
import { Card } from "@/components/ui/card";
import { media } from "@/lib/media";

/**
 * ServiceCard — photo-led and dense (CEO review): one iconic image, title,
 * a one-line micro-proof stat, and a clear next step. No large empty areas.
 */
export function ServiceCard({ service }: { service: Service }) {
  const img = media(`service:${service.slug}`);
  return (
    <Card className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-float">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E4DFD4]">
        <Image
          src={img.src}
          alt={img.alt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <span className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-deep/80 text-honey">
          <Icon name={service.icon} className="h-5 w-5" />
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-xl font-bold text-text">{service.title}</h3>
        <p className="mt-2 flex-1 text-sm text-text-muted">{service.summary}</p>
        {service.stat && (
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-accent">{service.stat}</p>
        )}
        <Link
          href={`/services#${service.slug}`}
          className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          Start an estimate →
        </Link>
      </div>
    </Card>
  );
}
