/**
 * Agent Execution Projection - Composed projection for agent execution state
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 */

export interface AgentExecutionProjection {
  status: 'idle' | 'running' | 'paused' | 'error' | 'terminated';
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
  progress: number;
}

export interface ExecutionStep {
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  duration?: number;
  error?: string;
}

export interface ExecutionTimeline {
  steps: ExecutionStep[];
  currentStep?: number;
  totalSteps: number;
}
