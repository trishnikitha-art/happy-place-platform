/**
 * Agent Reasoning Projection - Composed projection for agent reasoning
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 */

export interface AgentReasoningProjection {
  summary: string;
  steps: ReasoningStep[];
  confidence: number;
  model: string;
  timestamp: string;
}

export interface ReasoningStep {
  step: number;
  description: string;
  input: any;
  output: any;
  confidence: number;
  duration?: number;
}

export interface ReasoningChain {
  steps: ReasoningStep[];
  currentStep: number;
  totalSteps: number;
  completed: boolean;
}
