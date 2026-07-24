/** Automation Authority

Central authority for routing automation tasks to external task providers.

Evolved architecture:
AutomationAuthority → CapabilityResolver → AutomationCapabilityId → TaskProviderRuntimeView

AutomationAuthority no longer knows providers directly.
It only knows capabilities.
*/

import { TaskProvider } from './task-provider';
import { TaskProviderRegistry } from './task-provider-registry';
import { AutomationCapabilityId } from './capability-id';
import { Task } from './task-provider';

export class AutomationAuthority {
  private taskProviderRegistry: TaskProviderRegistry;

  constructor(taskProviderRegistry: TaskProviderRegistry) {
    this.taskProviderRegistry = taskProviderRegistry;
  }

  async createTask(
    capabilityId: AutomationCapabilityId,
    task: Omit<Task, 'id'>,
  ): Promise<Task> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.createTask(task);
  }

  async updateTask(
    capabilityId: AutomationCapabilityId,
    taskId: string,
    updates: Partial<Task>,
  ): Promise<Task> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.updateTask(taskId, updates);
  }

  async completeTask(
    capabilityId: AutomationCapabilityId,
    taskId: string,
  ): Promise<Task> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.completeTask(taskId);
  }

  async deleteTask(
    capabilityId: AutomationCapabilityId,
    taskId: string,
  ): Promise<void> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.deleteTask(taskId);
  }

  async getTask(
    capabilityId: AutomationCapabilityId,
    taskId: string,
  ): Promise<Task | null> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.getTask(taskId);
  }

  async listTasks(
    capabilityId: AutomationCapabilityId,
    projectId?: string,
  ): Promise<Task[]> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.listTasks(projectId);
  }

  async syncTasks(
    capabilityId: AutomationCapabilityId,
    projectId?: string,
  ): Promise<Task[]> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.syncTasks(projectId);
  }

  async handleWebhook(
    capabilityId: AutomationCapabilityId,
    webhookData: Record<string, unknown>,
  ): Promise<Task> {
    const provider = this.taskProviderRegistry.getProviderForCapability(capabilityId);
    return provider.handleWebhook(webhookData);
  }
}
