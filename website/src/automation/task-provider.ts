/** Task Provider Interface

Constitutional task provider contract.

Architecture:
TaskProviderId
  ↓
TaskProviderDescriptor
  ↓
TaskProvider (implementation)
  ↓
TaskProviderRuntime

This interface defines the contract for all task providers (Google Tasks, Asana, Trello, etc.).
*/

import { TaskProviderId } from './task-provider-id';

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'completed';
  projectId?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskProviderDescriptor {
  name: string;
  capabilities: string[];
  priority: 'primary' | 'secondary' | 'tertiary';
  availability: 'available' | 'unavailable' | 'degraded' | 'maintenance';
  region?: string;
  failoverProvider?: string;
  costPerRequest?: number;
  rateLimitPerMinute?: number;
  metadata?: Record<string, unknown>;
}

export interface TaskProviderMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastRequestAt?: Date;
  lastSuccessAt?: Date;
  lastFailureAt?: Date;
  averageLatencyMs: number;
}

export interface TaskProvider {
  /**
   * Get provider ID
   */
  getProviderId(): TaskProviderId;

  /**
   * Get provider descriptor
   */
  getDescriptor(): TaskProviderDescriptor;

  /**
   * Create a task
   */
  createTask(task: Omit<Task, 'id'>): Promise<Task>;

  /**
   * Update a task
   */
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task>;

  /**
   * Complete a task
   */
  completeTask(taskId: string): Promise<Task>;

  /**
   * Delete a task
   */
  deleteTask(taskId: string): Promise<void>;

  /**
   * Get task by ID
   */
  getTask(taskId: string): Promise<Task | null>;

  /**
   * List tasks for a project
   */
  listTasks(projectId?: string): Promise<Task[]>;

  /**
   * Sync tasks (bidirectional)
   */
  syncTasks(projectId?: string): Promise<Task[]>;

  /**
   * Handle webhook from provider
   */
  handleWebhook(webhookData: Record<string, unknown>): Promise<Task>;
}
