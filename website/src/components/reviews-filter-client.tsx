"use client";

import { useState } from "react";
import { getAllReviews, getReviewsByService, type ReviewService } from "@/lib/reviews";
import { ReviewsFilter } from "@/components/reviews-filter";
import { StarRating } from "@/components/star-rating";

export function ReviewsFilterClient() {
  const [selectedService, setSelectedService] = useState<ReviewService | "all">("all");
  const allReviews = getAllReviews();
  const filteredReviews = selectedService === "all" 
    ? allReviews 
    : getReviewsByService(selectedService);

  return (
    <>
      <ReviewsFilter 
        selectedService={selectedService} 
        onServiceChange={setSelectedService} 
      />
      
      {filteredReviews.length > 0 ? (
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredReviews.map((r, i) => (
            <figure
              key={r.id}
              className="float-card flex flex-col bg-surface p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <StarRating rating={r.rating} />
                {r.verified && (
                  <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    ✓ Verified
                  </span>
                )}
              </div>
              {r.title && <h3 className="mt-4 font-display text-xl font-bold text-text">{r.title}</h3>}
              <blockquote className="mt-3 flex-1 text-text-muted leading-relaxed">
                &ldquo;{r.body}&rdquo;
              </blockquote>
              <figcaption className="mt-5 border-t border-border-soft pt-4 text-sm">
                <span className="font-semibold text-text">{r.reviewer.name}</span>
                {r.location && <span className="text-text-subtle"> · {r.location.city}, {r.location.county}</span>}
                {r.source && <span className="mt-1 block text-xs text-text-subtle">via {r.source}</span>}
              </figcaption>
            </figure>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-lg bg-surface-muted p-8 text-center">
          <p className="text-text-muted">
            No reviews found for this service. Check back soon!
          </p>
        </div>
      )}
    </>
  );
}
