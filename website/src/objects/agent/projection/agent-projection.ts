/**
 * Agent Projection - Aggregated view of agent runtime data
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 * 
 * Agent is a canonical business capability in PING, owning:
 * - Agent registry
 * - Execution state
 * - Orchestration
 * - Capabilities
 * - Permissions
 * - Health
 * - Telemetry
 * 
 * Architecture:
 * - Agent Runtime: Execution state, orchestration
 * - Neo4j: Agent relationships
 * - Ollama: Agent reasoning, confidence
 * - Worker Runtime: Worker chain execution
 * - Event Bus: Agent events
 * 
 * COMPOSED PROJECTIONS: This projection composes smaller, focused projections
 * to avoid becoming a god object. Each sub-projection is defined in its own file.
 */

// Import composed projections
import type { AgentExecutionProjection } from './agent-execution-projection';
import type { AgentTelemetryProjection } from './agent-telemetry-projection';
import type { AgentOrchestrationProjection } from './agent-orchestration-projection';
import type { AgentHealthProjection } from './agent-health-projection';
import type { AgentMemoryProjection } from './agent-memory-projection';
import type { AgentReasoningProjection } from './agent-reasoning-projection';

// Core agent data (minimal contract)
export interface AgentData {
  id: string;
  name: string;
  type: 'observation' | 'classification' | 'recommendation' | 'projection' | 'orchestration';
  status: 'idle' | 'running' | 'paused' | 'error' | 'terminated';
  createdAt: string;
  lastActivity?: string;
}

// Main Agent Projection - composed of sub-projections
export interface AgentProjection {
  // Core agent data (minimal contract)
  agent: AgentData;
  
  // Composed projections
  execution?: AgentExecutionProjection;
  orchestration?: AgentOrchestrationProjection;
  health?: AgentHealthProjection;
  telemetry?: AgentTelemetryProjection;
  memory?: AgentMemoryProjection;
  reasoning?: AgentReasoningProjection;
  
  // Remaining projections (to be split in future iterations)
  capabilities?: AgentCapabilitiesProjection;
  permissions?: AgentPermissionsProjection;
  currentMission?: CurrentMissionProjection;
  currentWorker?: CurrentWorkerProjection;
  context?: AgentContextProjection;
  confidence?: AgentConfidenceProjection;
  evidence?: AgentEvidenceProjection;
  recommendations?: AgentRecommendationsProjection;
}

// Remaining projections (to be split in future iterations)
export interface AgentCapabilitiesProjection {
  capabilities: string[];
  enabled: string[];
  disabled: string[];
  version: string;
}

export interface AgentPermissionsProjection {
  permissions: Permission[];
  roles: string[];
  accessLevel: 'read' | 'write' | 'admin' | 'owner';
}

export interface Permission {
  resource: string;
  action: string;
  granted: boolean;
}

export interface CurrentMissionProjection {
  missionId: string;
  type: string;
  status: string;
  progress: number;
  startedAt: string;
  estimatedCompletion?: string;
}

export interface CurrentWorkerProjection {
  workerId: string;
  type: string;
  status: string;
  progress: number;
  startedAt: string;
  estimatedCompletion?: string;
}

export interface AgentContextProjection {
  customerId?: string;
  projectId?: string;
  missionId?: string;
  sessionId: string;
  timestamp: string;
  variables: Record<string, any>;
}

export interface AgentConfidenceProjection {
  overall: number;
  byCapability: Record<string, number>;
  trend: 'increasing' | 'stable' | 'decreasing';
  lastUpdated: string;
}

export interface AgentEvidenceProjection {
  observations: Observation[];
  classifications: Classification[];
  recommendations: Recommendation[];
  sources: EvidenceSource[];
}

export interface Observation {
  id: string;
  type: string;
  data: any;
  timestamp: string;
  confidence: number;
}

export interface Classification {
  id: string;
  type: string;
  label: string;
  confidence: number;
  timestamp: string;
}

export interface Recommendation {
  id: string;
  action: string;
  confidence: number;
  reasoning: string;
  timestamp: string;
}

export interface EvidenceSource {
  source: string;
  weight: number;
  timestamp: string;
}

export interface AgentRecommendationsProjection {
  actions: ActionRecommendation[];
  prioritized: boolean;
  generatedAt: string;
}

export interface ActionRecommendation {
  action: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string;
  estimatedImpact: string;
  estimatedEffort: string;
}
