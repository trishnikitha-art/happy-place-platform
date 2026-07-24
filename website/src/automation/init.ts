/** Automation Initialization

Factory function to initialize the automation layer with all components.

Architecture:
initAutomation()
  ↓
TaskProviderRegistry
  ↓
AutomationAuthority
  ↓
WorkflowEngine
  ↓
EventConsumer
  ↓
Ready for domain events
*/

import { TaskProviderRegistry } from './task-provider-registry';
import { TaskProviderRuntimeView, TaskProviderRuntimeState } from './task-provider-runtime';
import { AutomationAuthority } from './automation-authority';
import { WorkflowEngine } from './workflow-engine';
import { EventConsumer } from './event-consumer';
import { GoogleTasksProvider } from './providers/google/GoogleTasksProvider';
import { AutomationCapabilityId } from './capability-id';

export interface AutomationConfig {
  googleTasksApiKey?: string;
  googleTasksAccessToken?: string;
}

export interface AutomationLayer {
  taskProviderRegistry: TaskProviderRegistry;
  automationAuthority: AutomationAuthority;
  workflowEngine: WorkflowEngine;
  eventConsumer: EventConsumer;
}

export function initAutomation(config: AutomationConfig = {}): AutomationLayer {
  // Create task provider registry
  const taskProviderRegistry = new TaskProviderRegistry();

  // Initialize Google Tasks provider
  const googleTasksProvider = new GoogleTasksProvider({
    apiKey: config.googleTasksApiKey,
    accessToken: config.googleTasksAccessToken,
  });

  // Create runtime view for Google Tasks
  const googleTasksRuntime = new TaskProviderRuntimeView(
    googleTasksProvider.getDescriptor(),
    googleTasksProvider,
    new TaskProviderRuntimeState(),
  );

  // Register Google Tasks provider
  taskProviderRegistry.registerRuntime(googleTasksRuntime);

  // Register capability mappings
  const createCapability = new AutomationCapabilityId('create');
  const updateCapability = new AutomationCapabilityId('update');
  const completeCapability = new AutomationCapabilityId('complete');
  const deleteCapability = new AutomationCapabilityId('delete');
  const listCapability = new AutomationCapabilityId('list');
  const syncCapability = new AutomationCapabilityId('sync');
  const webhookCapability = new AutomationCapabilityId('webhook');

  // Create automation authority
  const automationAuthority = new AutomationAuthority(taskProviderRegistry);

  // Create workflow engine
  const workflowEngine = new WorkflowEngine(automationAuthority);

  // Create event consumer
  const eventConsumer = new EventConsumer(workflowEngine);

  return {
    taskProviderRegistry,
    automationAuthority,
    workflowEngine,
    eventConsumer,
  };
}

export function createDefaultAutomationLayer(): AutomationLayer {
  return initAutomation({
    // Environment variables would be loaded here in production
    googleTasksApiKey: process.env.GOOGLE_TASKS_API_KEY,
    googleTasksAccessToken: process.env.GOOGLE_TASKS_ACCESS_TOKEN,
  });
}
