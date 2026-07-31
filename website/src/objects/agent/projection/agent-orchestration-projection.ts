/**
 * Agent Orchestration Projection - Composed projection for agent orchestration
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 */

export interface AgentOrchestrationProjection {
  missionQueue: MissionQueueItem[];
  workerQueue: WorkerQueueItem[];
  executionTimeline: ExecutionTimelineItem[];
}

export interface MissionQueueItem {
  missionId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed';
  queuedAt: string;
  estimatedDuration?: number;
}

export interface WorkerQueueItem {
  workerId: string;
  missionId: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  queuedAt: string;
  progress: number;
}

export interface ExecutionTimelineItem {
  timestamp: string;
  event: string;
  details: any;
  duration?: number;
}
