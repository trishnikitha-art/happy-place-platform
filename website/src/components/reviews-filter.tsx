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
            ? "bg-primary text-white"
            : "bg-surface text-text-muted hover:bg-surface-hover"
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
              ? "bg-primary text-white"
              : "bg-surface text-text-muted hover:bg-surface-hover"
          }`}
        >
          {SERVICE_LABELS[service]}
        </button>
      ))}
    </div>
  );
}
