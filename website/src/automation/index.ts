/** Automation Layer Index

Constitutional automation layer for Happy Place Platform.

Architecture:
Generated Runtime
  ↓
Automation Authority
  ↓
Workflow Engine
  ↓
Task Provider Registry
  ↓
Task Providers (Google Tasks, etc.)
  ↓
External Task Systems

This layer consumes the generated runtime from Happy Place Platform
and provides operational automation capabilities without modifying
the compiler or constitutional structures.
*/

export { TaskProviderId } from './task-provider-id';
export type { 
  TaskProvider, 
  Task, 
  TaskProviderDescriptor, 
  TaskProviderMetrics 
} from './task-provider';
export { 
  TaskProviderMetrics as RuntimeMetrics,
  TaskProviderRuntimeState,
  TaskProviderRuntimeView 
} from './task-provider-runtime';
export { TaskProviderRegistry } from './task-provider-registry';
export { AutomationAuthority } from './automation-authority';
export { AutomationCapabilityId } from './capability-id';
export type { 
  WorkflowEngine,
  WorkflowTemplate,
  WorkflowStep,
  WorkflowContext,
  WorkflowExecution,
  WorkflowStepExecution 
} from './workflow-engine';
export { GoogleTasksProvider } from './providers/google/GoogleTasksProvider';
export type { 
  AutomationMetricEvent, 
  AutomationMetricEventType 
} from './metric-events';
export { 
  AutomationMetricsReducer 
} from './metric-events';
export type { 
  EventConsumer, 
  DomainEvent 
} from './event-consumer';
export { 
  initAutomation, 
  createDefaultAutomationLayer 
} from './init';
export type { 
  AutomationConfig, 
  AutomationLayer 
} from './init';
