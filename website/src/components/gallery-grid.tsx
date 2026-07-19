import Image from "next/image";
import Link from "next/link";
import type { GalleryItem } from "@/types";
import { cn } from "@/lib/utils";

/** Grid of gallery images. Each item is a structured asset rendered from metadata. */
export function GalleryGrid({
  items,
  className,
}: {
  items: GalleryItem[];
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((item) => (
        <figure
          key={item.id}
          className="group relative overflow-hidden rounded-2xl border border-stone-200 bg-stone-100"
        >
          <Image
            src={item.src}
            alt={item.alt}
            width={item.width}
            height={item.height}
            className="h-64 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          {item.beforeAfter && (
            <span className="absolute left-3 top-3 rounded-full bg-stone-900/80 px-2 py-1 text-xs font-semibold uppercase text-white">
              {item.beforeAfter}
            </span>
          )}
          <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-stone-900/80 to-transparent p-4 text-sm font-medium text-white">
            {item.project}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function GalleryLink({ href = "/gallery" }: { href?: string }) {
  return (
    <Link href={href} className="mt-8 inline-flex items-center gap-1 font-semibold text-amber-700 hover:underline">
      View our work →
    </Link>
  );
}
