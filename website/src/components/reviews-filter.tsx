"use client";

import { useState } from "react";
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
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => onServiceChange("all")}
        className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
          selectedService === "all"
            ? "bg-honey/20 text-honey border border-honey/30"
            : "bg-surface/50 text-text-on-dark/70 hover:bg-surface/70"
        }`}
      >
        All
      </button>
      {services.map((service) => (
        <button
          key={service}
          onClick={() => onServiceChange(service)}
          className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            selectedService === service
              ? "bg-honey/20 text-honey border border-honey/30"
              : "bg-surface/50 text-text-on-dark/70 hover:bg-surface/70"
          }`}
        >
          {SERVICE_LABELS[service]}
        </button>
      ))}
    </div>
  );
}
