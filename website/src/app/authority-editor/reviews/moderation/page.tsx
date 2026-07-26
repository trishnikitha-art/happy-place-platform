'use client';

import { useState, useEffect } from "react";
import type { Review } from "@/types/reviews";
import { CheckCircle, XCircle, AlertTriangle, Star, Clock, Tag, MapPin, FileText, Shield, Eye, Edit2, Trash2, Search, Filter, ChevronDown, ChevronUp } from "lucide-react";

export default function ReviewModerationDashboard() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activeTab, setActiveTab] = useState<'positive' | 'needs-review'>('positive');
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceFilter, setServiceFilter] = useState('');
  const [countyFilter, setCountyFilter] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [expandedReview, setExpandedReview] = useState<string | null>(null);
  const [selectedReviews, setSelectedReviews] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Fetch reviews
    fetch('/api/reviews')
      .then(res => res.json())
      .then(data => {
        // In production, this would fetch from the Review Authority
        // For now, we'll use mock data
        setReviews([]);
      });
  }, []);

  // Filter pending reviews
  const pendingReviews = reviews.filter(r => r.status === 'pending');

  // Split into queues
  const positiveQueue = pendingReviews.filter(r => r.bucket === 'positive');
  const needsReviewQueue = pendingReviews.filter(r => r.bucket === 'review');

  // Apply filters
  const filteredReviews = (activeTab === 'positive' ? positiveQueue : needsReviewQueue).filter(review => {
    const matchesSearch = searchQuery === '' || 
      review.reviewer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      review.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesService = serviceFilter === '' || review.service === serviceFilter;
    const matchesCounty = countyFilter === '' || review.location?.county === countyFilter;
    const matchesRating = ratingFilter === '' || review.rating === parseInt(ratingFilter);

    return matchesSearch && matchesService && matchesCounty && matchesRating;
  });

  // Calculate statistics
  const stats = {
    pending: pendingReviews.length,
    approved: reviews.filter(r => r.status === 'published').length,
    rejected: reviews.filter(r => r.status === 'rejected').length,
    positiveQueue: positiveQueue.length,
    needsReview: needsReviewQueue.length,
    avgQuality: pendingReviews.length > 0 
      ? Math.round(pendingReviews.reduce((sum, r) => sum + (r.qualityScore || 0), 0) / pendingReviews.length)
      : 0,
    avgConfidence: pendingReviews.length > 0
      ? Math.round((pendingReviews.reduce((sum, r) => sum + (r.confidence || 0), 0) / pendingReviews.length) * 100)
      : 0,
    duplicates: pendingReviews.filter(r => r.isDuplicate).length,
  };

  const toggleReviewSelection = (reviewId: string) => {
    const newSelected = new Set(selectedReviews);
    if (newSelected.has(reviewId)) {
      newSelected.delete(reviewId);
    } else {
      newSelected.add(reviewId);
    }
    setSelectedReviews(newSelected);
  };

  const toggleExpand = (reviewId: string) => {
    setExpandedReview(expandedReview === reviewId ? null : reviewId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Review Moderation</h1>
          <p className="text-text-muted">Human-in-the-loop review moderation dashboard</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text hover:bg-surface-hover transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" />
            <span className="text-sm text-text-muted">Pending</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.pending}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm text-text-muted">Approved</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.approved}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-600" />
            <span className="text-sm text-text-muted">Rejected</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.rejected}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm text-text-muted">Duplicates</span>
          </div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.duplicates}</div>
        </div>
      </div>

      {/* Queue Quality Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-sm text-text-muted">Positive Queue</div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.positiveQueue}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-sm text-text-muted">Needs Review</div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.needsReview}</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-sm text-text-muted">Avg Quality</div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.avgQuality}/100</div>
        </div>
        <div className="rounded-lg border border-border bg-surface p-4">
          <div className="text-sm text-text-muted">Avg Confidence</div>
          <div className="mt-2 text-2xl font-bold text-text">{stats.avgConfidence}%</div>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('positive')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'positive' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Positive Queue ({positiveQueue.length})
          </button>
          <button 
            onClick={() => setActiveTab('needs-review')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              activeTab === 'needs-review' 
                ? 'border-accent text-accent' 
                : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            Needs Review ({needsReviewQueue.length})
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search reviews..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-surface text-text placeholder:text-text-muted"
          />
        </div>
        <select 
          value={serviceFilter}
          onChange={(e) => setServiceFilter(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-surface text-text"
        >
          <option value="">All Services</option>
          <option value="pergolas">Pergolas</option>
          <option value="decks">Decks</option>
          <option value="painting">Painting</option>
          <option value="bathrooms">Bathrooms</option>
        </select>
        <select 
          value={countyFilter}
          onChange={(e) => setCountyFilter(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-surface text-text"
        >
          <option value="">All Counties</option>
          <option value="Benton">Benton</option>
          <option value="Linn">Linn</option>
          <option value="Marion">Marion</option>
          <option value="Lane">Lane</option>
        </select>
        <select 
          value={ratingFilter}
          onChange={(e) => setRatingFilter(e.target.value)}
          className="px-4 py-2 border border-border rounded-lg bg-surface text-text"
        >
          <option value="">All Ratings</option>
          <option value="5">5 Stars</option>
          <option value="4">4 Stars</option>
          <option value="3">3 Stars</option>
          <option value="2">2 Stars</option>
          <option value="1">1 Star</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedReviews.size > 0 && (
        <div className="flex items-center gap-2 p-4 bg-surface border border-border rounded-lg">
          <span className="text-sm text-text-muted">{selectedReviews.size} selected</span>
          <div className="flex-1" />
          <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
            Approve Selected
          </button>
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
            Reject Selected
          </button>
        </div>
      )}

      {/* Review Queue */}
      <div className="space-y-4">
        {filteredReviews.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text mb-2">
              {activeTab === 'positive' ? 'Positive Queue Empty' : 'Needs Review Queue Empty'}
            </h3>
            <p className="text-text-muted">
              {activeTab === 'positive' ? 'No reviews in the positive queue' : 'No reviews in the needs review queue'}
            </p>
          </div>
        ) : (
          filteredReviews.map((review) => (
            <ReviewCard 
              key={review.id} 
              review={review}
              isExpanded={expandedReview === review.id}
              isSelected={selectedReviews.has(review.id)}
              onToggleExpand={() => toggleExpand(review.id)}
              onToggleSelect={() => toggleReviewSelection(review.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function ReviewCard({ 
  review, 
  isExpanded, 
  isSelected, 
  onToggleExpand, 
  onToggleSelect 
}: { 
  review: Review; 
  isExpanded: boolean; 
  isSelected: boolean; 
  onToggleExpand: () => void; 
  onToggleSelect: () => void; 
}) {
  const hasDuplicate = review.isDuplicate;
  const hasProfanity = review.classifiers?.profanity?.value;
  const hasQuestion = review.classifiers?.question?.value;
  const hasSpam = review.classifiers?.spam?.value;

  return (
    <div className={`rounded-lg border bg-surface p-6 space-y-4 transition-all ${isSelected ? 'border-accent' : 'border-border'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            className="mt-1 w-4 h-4 rounded border-border text-accent focus:ring-accent"
          />
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              {/* Rating */}
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              {/* Badges */}
              {hasDuplicate && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Duplicate
                </span>
              )}
              {hasProfanity && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium">
                  <Shield className="w-3 h-3" />
                  Profanity
                </span>
              )}
              {hasQuestion && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                  <FileText className="w-3 h-3" />
                  Question
                </span>
              )}
              {hasSpam && (
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Spam
                </span>
              )}
            </div>
            {/* Reviewer */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-text">{review.reviewer.name}</span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted">{review.location?.city || 'Unknown'}, {review.location?.county || 'Unknown'}</span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted">{review.service}</span>
              <span className="text-text-muted">•</span>
              <span className="text-text-muted">{new Date(review.date).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        {/* Confidence */}
        <div className="text-right">
          <div className="text-sm text-text-muted">Confidence</div>
          <div className="text-lg font-bold text-text">{Math.round((review.confidence || 0) * 100)}%</div>
        </div>
      </div>

      {/* Review Body */}
      <div className="p-4 bg-surface-hover rounded-lg">
        <p className="text-text">{review.body}</p>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-text-muted">Quality Score</div>
          <div className="font-medium text-text">{review.qualityScore || 0}/100</div>
        </div>
        <div>
          <div className="text-text-muted">Sentiment</div>
          <div className="font-medium text-text capitalize">{review.sentiment}</div>
        </div>
        <div>
          <div className="text-text-muted">Bucket</div>
          <div className="font-medium text-text capitalize">{review.bucket}</div>
        </div>
        <div>
          <div className="text-text-muted">Suggested Tags</div>
          <div className="font-medium text-text">
            {review.suggestedTags?.slice(0, 3).join(', ') || '—'}
          </div>
        </div>
      </div>

      {/* Suggestions */}
      <div className="flex items-center gap-4 text-sm">
        {review.suggestedService && (
          <div className="flex items-center gap-1 text-text-muted">
            <Tag className="w-4 h-4" />
            <span>Service: {review.suggestedService}</span>
          </div>
        )}
        {review.suggestedProject && (
          <div className="flex items-center gap-1 text-text-muted">
            <MapPin className="w-4 h-4" />
            <span>Project: {review.suggestedProject}</span>
          </div>
        )}
        {review.suggestedCounty && (
          <div className="flex items-center gap-1 text-text-muted">
            <MapPin className="w-4 h-4" />
            <span>County: {review.suggestedCounty}</span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="pt-4 border-t border-border space-y-4">
          {/* Normalized Text */}
          {review.normalizedBody && (
            <div>
              <div className="text-sm font-medium text-text mb-2">Normalized Text</div>
              <div className="p-3 bg-surface-hover rounded-lg text-sm text-text-muted">
                {review.normalizedBody}
              </div>
            </div>
          )}

          {/* Quality Factors */}
          {review.qualityFactors && (
            <div>
              <div className="text-sm font-medium text-text mb-2">Quality Breakdown</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div className="p-2 bg-surface-hover rounded">
                  <div className="text-text-muted">Length</div>
                  <div className="font-medium text-text">{review.qualityFactors.length}/100</div>
                </div>
                <div className="p-2 bg-surface-hover rounded">
                  <div className="text-text-muted">Specificity</div>
                  <div className="font-medium text-text">{review.qualityFactors.specificity}/100</div>
                </div>
                <div className="p-2 bg-surface-hover rounded">
                  <div className="text-text-muted">Project Mention</div>
                  <div className="font-medium text-text">{review.qualityFactors.mentions_project}/100</div>
                </div>
                <div className="p-2 bg-surface-hover rounded">
                  <div className="text-text-muted">Communication</div>
                  <div className="font-medium text-text">{review.qualityFactors.mentions_communication}/100</div>
                </div>
              </div>
            </div>
          )}

          {/* Duplicate Info */}
          {review.isDuplicate && (
            <div>
              <div className="text-sm font-medium text-text mb-2">Duplicate Information</div>
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                <div className="font-medium">Type: {review.duplicateType}</div>
                {review.duplicateMatchId && (
                  <div className="mt-1">Matches review: {review.duplicateMatchId}</div>
                )}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          {review.auditTrail && review.auditTrail.length > 0 && (
            <div>
              <div className="text-sm font-medium text-text mb-2">Audit Trail</div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {review.auditTrail.map((event) => (
                  <div key={event.id} className="p-2 bg-surface-hover rounded text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">{new Date(event.timestamp).toLocaleString()}</span>
                      <span className="font-medium text-text">{event.eventType}</span>
                      <span className="text-text-muted">by {event.actor}</span>
                    </div>
                    {event.notes && (
                      <div className="mt-1 text-text-muted">{event.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-4 border-t border-border">
        <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
          <CheckCircle className="w-4 h-4" />
          Approve
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
          <XCircle className="w-4 h-4" />
          Reject
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-surface-hover transition-colors">
          <Edit2 className="w-4 h-4" />
          Edit
        </button>
        <button 
          onClick={onToggleExpand}
          className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text rounded-lg hover:bg-surface-hover transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Collapse
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              Expand
            </>
          )}
        </button>
        <div className="flex-1" />
        <button className="p-2 text-text-muted hover:text-text transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
