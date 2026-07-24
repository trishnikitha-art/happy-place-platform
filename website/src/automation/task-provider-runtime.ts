/** Task Provider Runtime

Split into immutable descriptor and mutable runtime state.

Architecture:
TaskProviderDescriptor (immutable)
  ↓
TaskProviderRuntimeState (mutable)
  ↓
TaskProviderRuntimeView (combined view)

This separation ensures replay doesn't accidentally include runtime state.
*/

import { TaskProvider, TaskProviderDescriptor } from './task-provider';

export class TaskProviderMetrics {
  readonly totalRequests: number;
  readonly successfulRequests: number;
  readonly failedRequests: number;
  readonly lastRequestAt?: Date;
  readonly lastSuccessAt?: Date;
  readonly lastFailureAt?: Date;
  readonly averageLatencyMs: number;

  constructor(data: Partial<TaskProviderMetrics> = {}) {
    this.totalRequests = data.totalRequests ?? 0;
    this.successfulRequests = data.successfulRequests ?? 0;
    this.failedRequests = data.failedRequests ?? 0;
    this.lastRequestAt = data.lastRequestAt;
    this.lastSuccessAt = data.lastSuccessAt;
    this.lastFailureAt = data.lastFailureAt;
    this.averageLatencyMs = data.averageLatencyMs ?? 0.0;
    Object.freeze(this);
  }

  getSuccessRate(): number {
    if (this.totalRequests === 0) return 1.0;
    return this.successfulRequests / this.totalRequests;
  }

  recordSuccess(latencyMs: number): TaskProviderMetrics {
    const newTotal = this.totalRequests + 1;
    const newSuccessful = this.successfulRequests + 1;
    const now = new Date();

    const newAverage = newTotal > 0
      ? (this.averageLatencyMs * (newTotal - 1) + latencyMs) / newTotal
      : latencyMs;

    return new TaskProviderMetrics({
      totalRequests: newTotal,
      successfulRequests: newSuccessful,
      failedRequests: this.failedRequests,
      lastRequestAt: now,
      lastSuccessAt: now,
      lastFailureAt: this.lastFailureAt,
      averageLatencyMs: newAverage,
    });
  }

  recordFailure(): TaskProviderMetrics {
    const newTotal = this.totalRequests + 1;
    const newFailed = this.failedRequests + 1;
    const now = new Date();

    return new TaskProviderMetrics({
      totalRequests: newTotal,
      successfulRequests: this.successfulRequests,
      failedRequests: newFailed,
      lastRequestAt: now,
      lastSuccessAt: this.lastSuccessAt,
      lastFailureAt: now,
      averageLatencyMs: this.averageLatencyMs,
    });
  }
}

export class TaskProviderRuntimeState {
  private metrics: TaskProviderMetrics;
  private currentAvailability: TaskProviderDescriptor['availability'];

  constructor(initialMetrics?: TaskProviderMetrics) {
    this.metrics = initialMetrics ?? new TaskProviderMetrics();
    this.currentAvailability = 'available';
  }

  getMetrics(): TaskProviderMetrics {
    return this.metrics;
  }

  recordSuccess(latencyMs: number): TaskProviderMetrics {
    this.metrics = this.metrics.recordSuccess(latencyMs);
    return this.metrics;
  }

  recordFailure(): TaskProviderMetrics {
    this.metrics = this.metrics.recordFailure();
    return this.metrics;
  }

  getSuccessRate(): number {
    return this.metrics.getSuccessRate();
  }

  updateAvailability(availability: TaskProviderDescriptor['availability']): void {
    this.currentAvailability = availability;
  }

  getAvailability(): TaskProviderDescriptor['availability'] {
    return this.currentAvailability;
  }
}

export class TaskProviderRuntimeView {
  readonly descriptor: TaskProviderDescriptor;
  readonly adapter: TaskProvider;
  readonly state: TaskProviderRuntimeState;

  constructor(
    descriptor: TaskProviderDescriptor,
    adapter: TaskProvider,
    state?: TaskProviderRuntimeState,
  ) {
    this.descriptor = descriptor;
    this.adapter = adapter;
    this.state = state ?? new TaskProviderRuntimeState();
    Object.freeze(this.descriptor);
  }

  get name(): string {
    return this.descriptor.name;
  }

  get capabilities(): string[] {
    return this.descriptor.capabilities;
  }

  get availability(): TaskProviderDescriptor['availability'] {
    return this.state.getAvailability();
  }

  get priority(): TaskProviderDescriptor['priority'] {
    return this.descriptor.priority;
  }

  get metrics(): TaskProviderMetrics {
    return this.state.getMetrics();
  }

  isAvailable(): boolean {
    return this.state.getAvailability() === 'available';
  }

  supportsCapability(capability: string): boolean {
    return this.descriptor.capabilities.includes(capability);
  }

  recordSuccess(latencyMs: number): void {
    this.state.recordSuccess(latencyMs);
  }

  recordFailure(): void {
    this.state.recordFailure();
  }

  getSuccessRate(): number {
    return this.state.getSuccessRate();
  }

  updateAvailability(availability: TaskProviderDescriptor['availability']): void {
    this.state.updateAvailability(availability);
  }
}
