/**
 * Agent Health Projection - Composed projection for agent health
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 */

export interface AgentHealthProjection {
  status: 'healthy' | 'degraded' | 'unhealthy';
  score: number;
  lastCheck: string;
  issues: HealthIssue[];
}

export interface HealthIssue {
  issue: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  details?: string;
}

export interface HealthFactor {
  factor: string;
  value: number;
  weight: number;
  status: 'positive' | 'neutral' | 'negative';
}
