/**
 * Estimate Projection - Aggregated view of estimate data from multiple sources
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Projections aggregate data from multiple sources (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
 * and provide a unified view for UI components to consume.
 * 
 * Architecture:
 * - Google Sheets: Estimate details, status, pricing
 * - PostHog: Estimate engagement metrics
 * - Neo4j: Estimate relationships (to customers, projects, services)
 * - Qdrant: Estimate semantic similarity
 * - Ollama: Estimate recommendations, conversion probability
 */

// Core estimate data (minimal contract)
export interface EstimateData {
  id: string;
  customerId?: string;
  serviceSlug?: string;
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  amount: number;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  acceptedAt?: string;
}

export interface EstimateProjection {
  // Core estimate data (minimal contract)
  estimate: EstimateData;
  
  // Conversion metrics (from PostHog)
  conversion?: ConversionProjection;
  
  // Relationships (from Neo4j)
  relationships?: RelationshipProjection;
  
  // Conversion probability (from Ollama)
  probability?: ProbabilityProjection;
  
  // Recommendations (from Ollama)
  recommendations?: RecommendationProjection;
}

export interface ConversionProjection {
  status: 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired';
  timeToView?: number;
  timeToAccept?: number;
  viewRate: number;
  acceptRate: number;
}

export interface RelationshipProjection {
  customerId?: string;
  projectId?: string;
  serviceSlug?: string;
  relatedEstimates?: string[];
}

export interface ProbabilityProjection {
  probability: number;
  confidence: number;
  factors: ProbabilityFactor[];
}

export interface ProbabilityFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
}

export interface RecommendationProjection {
  action: 'follow-up' | 'send-reminder' | 'adjust-pricing' | 'escalate';
  confidence: number;
  reason: string;
  evidence?: string[];
}
