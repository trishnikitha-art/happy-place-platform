/**
 * Semantic Types - Strong vocabulary for replacing any types
 * 
 * Instead of leaking any throughout the framework, use progressively stronger vocabulary.
 * 
 * Types:
 * - DomainEvent: Raw events from external systems
 * - CanonicalEntity: Canonical representation of business entities
 * - ProjectionData: Data within projections
 * - EvidencePayload: Evidence package payload
 * - MissionPayload: Mission execution data
 * - ReplaySnapshot: Replay engine state snapshot
 */

// DomainEvent - Raw events from external systems
export interface DomainEvent {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  data: Record<string, unknown>;
  causality?: {
    causedBy?: string[];
    correlationId?: string;
    parentEvent?: string;
    rootEvent?: string;
  };
}

// CanonicalEntity - Canonical representation of business entities
export interface CanonicalEntity {
  id: string;
  type: string;
  version: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
  metadata?: EntityMetadata;
}

export interface EntityMetadata {
  source: string;
  confidence?: number;
  tags?: string[];
}

// ProjectionData - Data within projections
export interface ProjectionData<T = unknown> {
  id: string;
  type: string;
  data: T;
  timestamp: string;
}

// EvidencePayload - Evidence package payload
export interface EvidencePayload {
  observationId: string;
  sources: EvidenceSource[];
  confidence: number;
  metadata?: Record<string, unknown>;
}

export interface EvidenceSource {
  type: 'knowledge' | 'vector' | 'graph' | 'llm';
  id: string;
  content: string;
  relevance: number;
  metadata?: Record<string, unknown>;
}

// MissionPayload - Mission execution data
export interface MissionPayload {
  missionId: string;
  missionType: string;
  data: Record<string, unknown>;
  context?: MissionContext;
}

export interface MissionContext {
  triggeredBy: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  deadline?: string;
  assignee?: string;
}

// ReplaySnapshot - Replay engine state snapshot
export interface ReplaySnapshot {
  eventId: string;
  timestamp: string;
  state: ReplayState;
  position: number;
  totalEvents: number;
}

export interface ReplayState {
  events: ProcessedEvent[];
  projections: Record<string, unknown>;
  metadata: ReplayMetadata;
}

export interface ProcessedEvent {
  id: string;
  type: string;
  processedAt: string;
  result: EventResult;
}

export interface EventResult {
  status: 'success' | 'failed' | 'skipped';
  error?: string;
  output?: Record<string, unknown>;
}

export interface ReplayMetadata {
  startedAt: string;
  completedAt?: string;
  duration?: number;
  totalProcessed: number;
  failed: number;
}

// Additional semantic types for common patterns

// ObservationData - Data within observations
export interface ObservationData {
  eventId: string;
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// RecommendationData - Data within recommendations
export interface RecommendationData {
  action: string;
  confidence: number;
  reasoning: string;
  evidenceId: string;
  metadata?: Record<string, unknown>;
}

// ConnectorData - Data from connectors
export interface ConnectorData {
  connectorId: string;
  resource: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// WorkerData - Data from workers
export interface WorkerData {
  workerId: string;
  workerType: string;
  data: Record<string, unknown>;
  timestamp: string;
}

// Type guards for semantic types
export function isDomainEvent(obj: unknown): obj is DomainEvent {
  return typeof obj === 'object' && obj !== null &&
    'id' in obj && 'type' in obj && 'source' in obj && 'timestamp' in obj && 'data' in obj;
}

export function isCanonicalEntity(obj: unknown): obj is CanonicalEntity {
  return typeof obj === 'object' && obj !== null &&
    'id' in obj && 'type' in obj && 'version' in obj && 'createdAt' in obj && 'updatedAt' in obj && 'data' in obj;
}

export function isProjectionData(obj: unknown): obj is ProjectionData {
  return typeof obj === 'object' && obj !== null &&
    'id' in obj && 'type' in obj && 'data' in obj && 'timestamp' in obj;
}

export function isEvidencePayload(obj: unknown): obj is EvidencePayload {
  return typeof obj === 'object' && obj !== null &&
    'observationId' in obj && 'sources' in obj && 'confidence' in obj;
}

export function isMissionPayload(obj: unknown): obj is MissionPayload {
  return typeof obj === 'object' && obj !== null &&
    'missionId' in obj && 'missionType' in obj && 'data' in obj;
}

export function isReplaySnapshot(obj: unknown): obj is ReplaySnapshot {
  return typeof obj === 'object' && obj !== null &&
    'eventId' in obj && 'timestamp' in obj && 'state' in obj && 'position' in obj && 'totalEvents' in obj;
}
