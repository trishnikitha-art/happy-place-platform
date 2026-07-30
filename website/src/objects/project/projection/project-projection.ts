/**
 * Project Projection - Aggregated view of project data from multiple sources
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Projections aggregate data from multiple sources (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
 * and provide a unified view for UI components to consume.
 * 
 * Architecture:
 * - Google Sheets: Project details, status, timeline
 * - PostHog: Project engagement metrics
 * - Neo4j: Project relationships (to customers, reviews, services)
 * - Qdrant: Project semantic similarity
 * - Ollama: Project recommendations, risk assessment
 */

// Core project data (minimal contract - full Project type in HPP types/projects.ts)
export interface ProjectData {
  id: string;
  title: string;
  slug: string;
  status: 'completed' | 'in-progress' | 'planned' | 'on-hold' | 'archived';
  services: string | string[];
  location?: {
    city: string;
    county: string;
  };
  customerId?: string;
  createdAt: string;
}

export interface ProjectProjection {
  // Core project data (minimal contract)
  project: ProjectData;
  
  // Status and timeline (from project management)
  status?: StatusProjection;
  
  // Engagement metrics (from PostHog)
  engagement?: EngagementProjection;
  
  // Relationships (from Neo4j)
  relationships?: RelationshipProjection;
  
  // Risk assessment (from Ollama)
  risk?: RiskProjection;
  
  // Recommendations (from Ollama)
  recommendations?: RecommendationProjection;
}

export interface StatusProjection {
  status: 'completed' | 'in-progress' | 'planned' | 'on-hold' | 'archived';
  progress: number;
  milestones: Milestone[];
  nextAction?: string;
}

export interface Milestone {
  name: string;
  completed: boolean;
  dueDate?: string;
}

export interface EngagementProjection {
  views: number;
  inquiries: number;
  shares: number;
  timeOnPage: number;
  conversionRate: number;
}

export interface RelationshipProjection {
  customerId?: string;
  reviewIds?: string[];
  serviceSlug?: string;
  relatedProjects?: string[];
}

export interface RiskProjection {
  level: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  confidence: number;
}

export interface RiskFactor {
  factor: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface RecommendationProjection {
  action: 'follow-up' | 'escalate' | 'monitor' | 'archive';
  confidence: number;
  reason: string;
  evidence?: string[];
}
