/**
 * Artifact Projection - Aggregated view of artifact data from multiple sources
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Projections aggregate data from multiple sources (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
 * and provide a unified view for UI components to consume.
 * 
 * Architecture:
 * - Google Sheets: Artifact metadata, status
 * - PostHog: Artifact engagement metrics
 * - Neo4j: Artifact relationships (to projects, customers, reviews)
 * - Qdrant: Artifact semantic similarity
 * - Ollama: Artifact recommendations, quality assessment
 */

// Core artifact data (minimal contract)
export interface ArtifactData {
  id: string;
  type: 'photo' | 'document' | 'video' | 'audio' | 'other';
  status: 'active' | 'archived' | 'deleted';
  mimeType?: string;
  size?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface ArtifactProjection {
  // Core artifact data (minimal contract)
  artifact: ArtifactData;
  
  // Usage metrics (from PostHog)
  usage?: UsageProjection;
  
  // Relationships (from Neo4j)
  relationships?: RelationshipProjection;
  
  // Quality assessment (from Ollama)
  quality?: QualityProjection;
  
  // Recommendations (from Ollama)
  recommendations?: RecommendationProjection;
}

export interface UsageProjection {
  views: number;
  downloads: number;
  shares: number;
  lastUsed?: string;
  usageTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface RelationshipProjection {
  projectId?: string;
  customerId?: string;
  reviewId?: string;
  relatedArtifacts?: string[];
}

export interface QualityProjection {
  score: number;
  factors: QualityFactor[];
  status: 'excellent' | 'good' | 'fair' | 'poor';
}

export interface QualityFactor {
  factor: string;
  value: number;
  weight: number;
}

export interface RecommendationProjection {
  action: 'feature' | 'archive' | 'optimize' | 'delete';
  confidence: number;
  reason: string;
  evidence?: string[];
}
