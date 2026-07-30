/**
 * Review Projection - Aggregated view of review data from multiple sources
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Projections aggregate data from multiple sources (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
 * and provide a unified view for UI components to consume.
 * 
 * Architecture:
 * - Google Sheets: Review content, moderation status
 * - PostHog: Review engagement metrics
 * - Neo4j: Review relationships (to projects, customers)
 * - Qdrant: Review semantic similarity
 * - Ollama: Review recommendations, sentiment analysis
 */

// Core review data (minimal contract - full Review type in HPP types/reviews.ts)
export interface ReviewData {
  id: string;
  name: string;
  city: string;
  county: string;
  service: string;
  rating: number;
  body: string;
  status: string;
  provider: string;
  projectId?: string;
  createdAt: string;
}

export interface ReviewProjection {
  // Core review data (minimal contract)
  review: ReviewData;
  
  // Sentiment analysis (from Ollama or sentiment pipeline)
  sentiment?: SentimentProjection;
  
  // Quality assessment (from quality scorer)
  quality?: QualityProjection;
  
  // Moderation state (from moderation pipeline)
  moderation?: ModerationProjection;
  
  // Engagement metrics (from PostHog)
  engagement?: EngagementProjection;
  
  // Relationships (from Neo4j)
  relationships?: RelationshipProjection;
  
  // Recommendations (from Ollama)
  recommendations?: RecommendationProjection;
}

export interface SentimentProjection {
  sentiment: 'positive' | 'neutral' | 'negative';
  confidence: number;
  keywords?: string[];
}

export interface QualityProjection {
  score: number;
  factors: {
    length: number;
    detail: number;
    helpfulness: number;
  };
}

export interface ModerationProjection {
  status: 'pending' | 'approved' | 'rejected' | 'published';
  reviewedBy?: string;
  reviewedAt?: string;
  notes?: string;
}

export interface EngagementProjection {
  views: number;
  clicks: number;
  shares: number;
  timeOnPage: number;
}

export interface RelationshipProjection {
  projectId?: string;
  customerId?: string;
  relatedReviews?: string[];
}

export interface RecommendationProjection {
  action: 'feature' | 'respond' | 'investigate' | 'ignore';
  confidence: number;
  reason: string;
  evidence?: string[];
}
