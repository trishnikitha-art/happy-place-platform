"use client";

import type { ReviewService } from "@/lib/reviews";

const SERVICE_LABELS: Record<ReviewService, string> = {
  "decks": "Decks",
  "fences": "Fences",
  "kitchens": "Kitchens",
  "bathrooms": "Bathrooms",
  "painting": "Painting",
  "finish-carpentry": "Finish Carpentry",
  "restoration": "Restoration",
  "outdoor-living": "Outdoor Living",
  "repairs": "Repairs",
  "built-ins": "Built-ins",
  "pergolas": "Pergolas",
  "other": "Other",
};

interface ReviewsFilterProps {
  selectedService: ReviewService | "all";
  onServiceChange: (service: ReviewService | "all") => void;
}

export function ReviewsFilter({ selectedService, onServiceChange }: ReviewsFilterProps) {
  const services = Object.keys(SERVICE_LABELS) as ReviewService[];

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter reviews by service">
      <button
        type="button"
        aria-pressed={selectedService === "all"}
        onClick={() => onServiceChange("all")}
        className={`review-filter-control motion-control min-h-11 min-w-11 rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey ${
          selectedService === "all"
            ? "border-honey bg-honey text-honey-foreground"
            : "border-border bg-surface text-text hover:bg-surface-muted"
        }`}
      >
        All
      </button>
      {services.map((service) => (
        <button
          key={service}
          type="button"
          aria-pressed={selectedService === service}
          onClick={() => onServiceChange(service)}
          className={`review-filter-control motion-control min-h-11 min-w-11 rounded-full border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-honey ${
            selectedService === service
              ? "border-honey bg-honey text-honey-foreground"
              : "border-border bg-surface text-text hover:bg-surface-muted"
          }`}
        >
          {SERVICE_LABELS[service]}
        </button>
      ))}
    </div>
  );
}
