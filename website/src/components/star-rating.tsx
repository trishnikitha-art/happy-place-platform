import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ rating, decorative = false, className }: { rating: number; decorative?: boolean; className?: string }) {
  return (
    <span className={cn("inline-flex items-center text-accent-on-paper", className)}>
      <span className="inline-flex gap-0.5" aria-hidden="true">
        {[1, 2, 3, 4, 5].map(star => (
          <Star key={star} className={cn("h-4 w-4", star <= rating ? "fill-current" : "fill-border text-text-subtle")} />
        ))}
      </span>
      {!decorative && <span className="sr-only">Rated {rating} out of 5</span>}
    </span>
  );
}
