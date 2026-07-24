/** Automation Metric Events

Replayable metric events for constitutional automation metrics.

Architecture:
AutomationMetricEvent
  ↓
AutomationMetricsReducer
  ↓
TaskProviderMetrics

This makes automation metrics replayable exactly like artifacts.
*/

export enum AutomationMetricEventType {
  SUCCESS = 'success',
  FAILURE = 'failure',
  REQUEST = 'request',
  WORKFLOW_STARTED = 'workflow_started',
  WORKFLOW_COMPLETED = 'workflow_completed',
  WORKFLOW_FAILED = 'workflow_failed',
  TASK_CREATED = 'task_created',
  TASK_UPDATED = 'task_updated',
  TASK_COMPLETED = 'task_completed',
  SYNC_STARTED = 'sync_started',
  SYNC_COMPLETED = 'sync_completed',
  SYNC_FAILED = 'sync_failed',
}

export interface AutomationMetricEvent {
  eventType: AutomationMetricEventType;
  timestamp: Date;
  latencyMs?: number;
  metadata?: Record<string, unknown>;
}

export class AutomationMetricsReducer {
  private totalRequests: number = 0;
  private successfulRequests: number = 0;
  private failedRequests: number = 0;
  private lastRequestAt?: Date;
  private lastSuccessAt?: Date;
  private lastFailureAt?: Date;
  private totalLatency: number = 0.0;
  private workflowsStarted: number = 0;
  private workflowsCompleted: number = 0;
  private workflowsFailed: number = 0;
  private tasksCreated: number = 0;
  private tasksCompleted: number = 0;

  reduce(event: AutomationMetricEvent): void {
    switch (event.eventType) {
      case AutomationMetricEventType.REQUEST:
        this.totalRequests += 1;
        this.lastRequestAt = event.timestamp;
        break;
      case AutomationMetricEventType.SUCCESS:
        this.totalRequests += 1;
        this.successfulRequests += 1;
        this.lastRequestAt = event.timestamp;
        this.lastSuccessAt = event.timestamp;
        if (event.latencyMs !== undefined) {
          this.totalLatency += event.latencyMs;
        }
        break;
      case AutomationMetricEventType.FAILURE:
        this.totalRequests += 1;
        this.failedRequests += 1;
        this.lastRequestAt = event.timestamp;
        this.lastFailureAt = event.timestamp;
        break;
      case AutomationMetricEventType.WORKFLOW_STARTED:
        this.workflowsStarted += 1;
        break;
      case AutomationMetricEventType.WORKFLOW_COMPLETED:
        this.workflowsCompleted += 1;
        break;
      case AutomationMetricEventType.WORKFLOW_FAILED:
        this.workflowsFailed += 1;
        break;
      case AutomationMetricEventType.TASK_CREATED:
        this.tasksCreated += 1;
        break;
      case AutomationMetricEventType.TASK_COMPLETED:
        this.tasksCompleted += 1;
        break;
    }
  }

  getMetrics(): Record<string, unknown> {
    const averageLatency = this.successfulRequests > 0
      ? this.totalLatency / this.successfulRequests
      : 0.0;

    return {
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      lastRequestAt: this.lastRequestAt?.toISOString(),
      lastSuccessAt: this.lastSuccessAt?.toISOString(),
      lastFailureAt: this.lastFailureAt?.toISOString(),
      averageLatencyMs: averageLatency,
      workflowsStarted: this.workflowsStarted,
      workflowsCompleted: this.workflowsCompleted,
      workflowsFailed: this.workflowsFailed,
      tasksCreated: this.tasksCreated,
      tasksCompleted: this.tasksCompleted,
    };
  }

  getSuccessRate(): number {
    if (this.totalRequests === 0) return 1.0;
    return this.successfulRequests / this.totalRequests;
  }

  getWorkflowCompletionRate(): number {
    if (this.workflowsStarted === 0) return 1.0;
    return this.workflowsCompleted / this.workflowsStarted;
  }

  reset(): void {
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.lastRequestAt = undefined;
    this.lastSuccessAt = undefined;
    this.lastFailureAt = undefined;
    this.totalLatency = 0.0;
    this.workflowsStarted = 0;
    this.workflowsCompleted = 0;
    this.workflowsFailed = 0;
    this.tasksCreated = 0;
    this.tasksCompleted = 0;
  }

  static replayEvents(events: AutomationMetricEvent[]): Record<string, unknown> {
    const reducer = new AutomationMetricsReducer();
    for (const event of events) {
      reducer.reduce(event);
    }
    return reducer.getMetrics();
  }
}
