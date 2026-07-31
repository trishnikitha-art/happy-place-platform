/**
 * Mission Projection - Aggregated view of mission data from multiple sources
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Projections aggregate data from multiple sources (Google Sheets, PostHog, Neo4j, Qdrant, Ollama)
 * and provide a unified view for UI components to consume.
 * 
 * Architecture:
 * - Google Sheets: Mission details, status, worker assignments
 * - PostHog: Mission execution metrics
 * - Neo4j: Mission relationships (to projects, customers, workers)
 * - Qdrant: Mission semantic similarity
 * - Ollama: Mission recommendations, priority optimization
 */

// Core mission data (minimal contract)
export interface MissionData {
  id: string;
  type: 'observation' | 'classification' | 'recommendation' | 'projection';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  input?: any;
  output?: any;
}

export interface MissionProjection {
  // Core mission data (minimal contract)
  mission: MissionData;
  
  // Execution status (from mission runtime)
  execution?: ExecutionProjection;
  
  // Worker health (from worker runtime)
  workers?: WorkerProjection;
  
  // Relationships (from Neo4j)
  relationships?: RelationshipProjection;
  
  // Priority assessment (from Ollama)
  priority?: PriorityProjection;
  
  // Recommendations (from Ollama)
  recommendations?: RecommendationProjection;
}

export interface ExecutionProjection {
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  duration?: number;
  steps: ExecutionStep[];
  error?: string;
}

export interface ExecutionStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  output?: any;
}

export interface WorkerProjection {
  workerId: string;
  status: 'idle' | 'busy' | 'error';
  lastActivity: string;
  queueLength: number;
  healthScore: number;
}

export interface RelationshipProjection {
  projectId?: string;
  customerId?: string;
  workerId?: string;
  relatedMissions?: string[];
}

export interface PriorityProjection {
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  factors: PriorityFactor[];
}

export interface PriorityFactor {
  factor: string;
  impact: 'positive' | 'negative';
  weight: number;
}

export interface RecommendationProjection {
  action: 'escalate' | 'retry' | 'cancel' | 'monitor';
  confidence: number;
  reason: string;
  evidence?: string[];
}
