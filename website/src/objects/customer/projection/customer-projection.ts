/**
 * Customer Projection - Aggregated view of customer data from multiple sources
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Projections aggregate data from multiple sources (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
 * and provide a unified view for UI components to consume.
 * 
 * Architecture:
 * - Google Sheets: Customer contact info, history
 * - PostHog: Customer engagement metrics
 * - Neo4j: Customer relationships (to projects, reviews, estimates)
 * - Qdrant: Customer semantic similarity
 * - Ollama: Customer recommendations, churn risk
 */

// Core customer data (minimal contract)
export interface CustomerData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  location?: {
    city: string;
    county: string;
  };
  createdAt: string;
  lastContact?: string;
}

export interface CustomerProjection {
  // Core customer data (minimal contract)
  customer: CustomerData;
  
  // Health score (aggregated from multiple signals)
  health?: HealthProjection;
  
  // Activity metrics (from PostHog)
  activity?: ActivityProjection;
  
  // Relationships (from Neo4j)
  relationships?: RelationshipProjection;
  
  // Churn risk (from Ollama)
  risk?: RiskProjection;
  
  // Recommendations (from Ollama)
  recommendations?: RecommendationProjection;
}

export interface HealthProjection {
  score: number;
  factors: HealthFactor[];
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface HealthFactor {
  factor: string;
  value: number;
  weight: number;
}

export interface ActivityProjection {
  lastVisit: string;
  visitCount: number;
  pageViews: number;
  timeOnSite: number;
  engagementScore: number;
}

export interface RelationshipProjection {
  projectIds?: string[];
  reviewIds?: string[];
  estimateIds?: string[];
  relatedCustomers?: string[];
}

export interface RiskProjection {
  level: 'low' | 'medium' | 'high';
  probability: number;
  factors: RiskFactor[];
  confidence: number;
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface RecommendationProjection {
  action: 'follow-up' | 'send-offer' | 'request-review' | 'escalate';
  confidence: number;
  reason: string;
  evidence?: string[];
}
