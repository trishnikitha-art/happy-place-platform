"use client";

import { useState, useEffect } from "react";
import { Section, Container } from "@/components/section";

interface Review {
  id: string;
  provider: string;
  status: "submitted" | "pending" | "approved" | "rejected" | "published" | "featured" | "archived";
  featured: boolean;
  verified: boolean;
  reviewer: {
    name: string;
    initials?: string;
  };
  rating: number;
  date: string;
  service: string;
  location?: {
    city: string;
    county: string;
  };
  title?: string;
  body: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  bucket?: 'positive' | 'review';
  confidence?: number;
  qualityScore?: number;
  isDuplicate?: boolean;
  suggestedTags?: string[];
  suggestedService?: string;
  suggestedProject?: string;
  suggestedCounty?: string;
  moderationNotes?: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "published">("all");
  const [selectedReview, setSelectedReview] = useState<Review | null>(null);
  const [notes, setNotes] = useState("");

  const loadReviews = async () => {
    try {
      const response = await fetch('/api/reviews');
      const data = await response.json();
      if (data.reviews) {
        setReviews(data.reviews);
      }
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const filteredReviews = reviews.filter(review => {
    if (filter === "all") return true;
    return review.status === filter;
  });

  const updateReviewStatus = async (reviewId: string, status: string, notes?: string) => {
    try {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      });
      
      if (response.ok) {
        await loadReviews();
        setSelectedReview(null);
        setNotes("");
      }
    } catch (error) {
      console.error('Failed to update review:', error);
    }
  };

  const bulkUpdate = async (reviewIds: string[], status: string) => {
    try {
      const response = await fetch('/api/reviews/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reviewIds, status }),
      });
      
      if (response.ok) {
        await loadReviews();
      }
    } catch (error) {
      console.error('Failed to bulk update reviews:', error);
    }
  };

  const getStarRating = (rating: number) => {
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "approved": return "bg-green-100 text-green-800";
      case "rejected": return "bg-red-100 text-red-800";
      case "published": return "bg-blue-100 text-blue-800";
      case "featured": return "bg-purple-100 text-purple-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <Section className="bg-background">
        <Container className="py-16">
          <div className="text-center">Loading reviews...</div>
        </Container>
      </Section>
    );
  }

  return (
    <Section className="bg-background">
      <Container className="py-16">
        <div className="mb-8">
          <h1 className="font-display text-4xl font-bold text-text mb-4">
            Review Moderation
          </h1>
          <p className="text-text-muted">
            Manage and moderate customer reviews
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="mb-6 flex gap-2 border-b border-border">
          {["all", "pending", "approved", "rejected", "published"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as "all" | "pending" | "approved" | "rejected" | "published")}
              className={`px-4 py-2 font-medium capitalize transition-colors ${
                filter === status
                  ? "border-b-2 border-primary text-primary"
                  : "text-text-muted hover:text-text"
              }`}
            >
              {status} ({status === "all" ? reviews.length : filteredReviews.filter(r => r.status === status).length})
            </button>
          ))}
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {filteredReviews.length === 0 ? (
            <div className="text-center py-12 text-text-muted">
              No reviews found
            </div>
          ) : (
            filteredReviews.map((review) => (
              <div
                key={review.id}
                className="border border-border rounded-lg p-6 hover:border-primary/50 transition-colors cursor-pointer"
                onClick={() => setSelectedReview(review)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-semibold text-text">{review.reviewer.name}</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(review.status)}`}>
                        {review.status}
                      </span>
                      {review.featured && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Featured
                        </span>
                      )}
                      {review.verified && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-text-muted">
                      {review.location?.city && `${review.location.city}, `}
                      {review.service}
                      {" • "}
                      {new Date(review.date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-2xl text-primary">
                    {getStarRating(review.rating)}
                  </div>
                </div>

                {review.title && (
                  <h3 className="font-semibold text-text mb-2">{review.title}</h3>
                )}
                <p className="text-text-muted line-clamp-2">{review.body}</p>

                {/* AI Moderation Info */}
                {(review.sentiment || review.qualityScore || review.isDuplicate) && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <div className="flex flex-wrap gap-4 text-xs text-text-muted">
                      {review.sentiment && (
                        <span>Sentiment: <span className="font-medium">{review.sentiment}</span></span>
                      )}
                      {review.qualityScore && (
                        <span>Quality: <span className="font-medium">{review.qualityScore}/100</span></span>
                      )}
                      {review.isDuplicate && (
                        <span className="text-red-600">⚠️ Potential duplicate</span>
                      )}
                      {review.confidence && (
                        <span>Confidence: <span className="font-medium">{(review.confidence * 100).toFixed(0)}%</span></span>
                      )}
                    </div>
                    {review.suggestedTags && review.suggestedTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {review.suggestedTags.map((tag) => (
                          <span key={tag} className="px-2 py-1 bg-surface rounded text-xs">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Review Detail Modal */}
        {selectedReview && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-text mb-2">
                    {selectedReview.reviewer.name}
                  </h2>
                  <div className="text-sm text-text-muted">
                    {selectedReview.location?.city && `${selectedReview.location.city}, `}
                    {selectedReview.service}
                    {" • "}
                    {new Date(selectedReview.date).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReview(null)}
                  className="text-text-muted hover:text-text"
                >
                  ✕
                </button>
              </div>

              <div className="text-3xl text-primary mb-4">
                {getStarRating(selectedReview.rating)}
              </div>

              {selectedReview.title && (
                <h3 className="font-semibold text-text mb-2">{selectedReview.title}</h3>
              )}
              <p className="text-text-muted mb-6">{selectedReview.body}</p>

              {/* AI Moderation Details */}
              <div className="bg-surface rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-text mb-3">AI Moderation Analysis</h3>
                <div className="space-y-2 text-sm">
                  {selectedReview.sentiment && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Sentiment:</span>
                      <span className="font-medium capitalize">{selectedReview.sentiment}</span>
                    </div>
                  )}
                  {selectedReview.bucket && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Bucket:</span>
                      <span className="font-medium capitalize">{selectedReview.bucket}</span>
                    </div>
                  )}
                  {selectedReview.qualityScore && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Quality Score:</span>
                      <span className="font-medium">{selectedReview.qualityScore}/100</span>
                    </div>
                  )}
                  {selectedReview.confidence && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Confidence:</span>
                      <span className="font-medium">{(selectedReview.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                  {selectedReview.isDuplicate && (
                    <div className="flex justify-between text-red-600">
                      <span className="text-text-muted">Duplicate Check:</span>
                      <span className="font-medium">Potential duplicate detected</span>
                    </div>
                  )}
                  {selectedReview.suggestedService && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Suggested Service:</span>
                      <span className="font-medium">{selectedReview.suggestedService}</span>
                    </div>
                  )}
                  {selectedReview.suggestedProject && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Suggested Project:</span>
                      <span className="font-medium">{selectedReview.suggestedProject}</span>
                    </div>
                  )}
                  {selectedReview.suggestedCounty && (
                    <div className="flex justify-between">
                      <span className="text-text-muted">Suggested County:</span>
                      <span className="font-medium">{selectedReview.suggestedCounty}</span>
                    </div>
                  )}
                </div>
                {selectedReview.suggestedTags && selectedReview.suggestedTags.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm text-text-muted mb-2">Suggested Tags:</div>
                    <div className="flex flex-wrap gap-1">
                      {selectedReview.suggestedTags.map((tag) => (
                        <span key={tag} className="px-2 py-1 bg-background rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Moderation Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-text mb-2">
                  Moderation Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full border border-border rounded-lg px-4 py-3 text-text focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={3}
                  placeholder="Add notes about this review..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => updateReviewStatus(selectedReview.id, "approved", notes)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={() => updateReviewStatus(selectedReview.id, "rejected", notes)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  onClick={() => updateReviewStatus(selectedReview.id, "featured", notes)}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Feature
                </button>
                <button
                  onClick={() => updateReviewStatus(selectedReview.id, "published", notes)}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                >
                  Publish
                </button>
              </div>

              {selectedReview.reviewedBy && (
                <div className="mt-4 text-xs text-text-muted">
                  Reviewed by {selectedReview.reviewedBy} on {selectedReview.reviewedAt && new Date(selectedReview.reviewedAt).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        )}
      </Container>
    </Section>
  );
}
