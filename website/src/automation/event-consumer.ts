/** Domain Event Consumer

Consumes domain events from Happy Place Platform and triggers automation workflows.

Architecture:
Domain Events (EstimateSent, ProjectBooked, etc.)
  ↓
Event Consumer
  ↓
Workflow Engine
  ↓
Task Provider
  ↓
External Task System

NOTE: Event types are generated. Import from artifacts/events/*
*/

import { WorkflowEngine, WorkflowContext } from './workflow-engine';
import { AutomationMetricEvent, AutomationMetricEventType } from './metric-events';
import { AutomationMetricsReducer } from './metric-events';
import type { EventEnvelope } from '../artifacts/events/EventEnvelope';
import type { EventPayloadMap } from '../artifacts/events/EventRegistry';

export type DomainEvent = EventEnvelope<keyof EventPayloadMap, unknown>;

export class EventConsumer {
  private workflowEngine: WorkflowEngine;
  private metricsReducer: AutomationMetricsReducer;
  private eventHandlers: Map<string, (event: DomainEvent) => Promise<void>>;

  constructor(workflowEngine: WorkflowEngine) {
    this.workflowEngine = workflowEngine;
    this.metricsReducer = new AutomationMetricsReducer();
    this.eventHandlers = new Map();
    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    this.eventHandlers.set('EstimateSent', this.handleEstimateSent.bind(this));
    this.eventHandlers.set('ProjectBooked', this.handleProjectBooked.bind(this));
    this.eventHandlers.set('ProjectStarted', this.handleProjectStarted.bind(this));
    this.eventHandlers.set('CrewAssigned', this.handleCrewAssigned.bind(this));
    this.eventHandlers.set('MaterialsRequired', this.handleMaterialsRequired.bind(this));
    this.eventHandlers.set('ProjectCompleted', this.handleProjectCompleted.bind(this));
    this.eventHandlers.set('WarrantyCreated', this.handleWarrantyCreated.bind(this));
    this.eventHandlers.set('InspectionScheduled', this.handleInspectionScheduled.bind(this));
  }

  async consumeEvent(event: DomainEvent): Promise<void> {
    const handler = this.eventHandlers.get(event.type);
    if (handler) {
      await handler(event);
    }
  }

  private async handleEstimateSent(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    // TODO: Trigger follow-up workflow for estimate follow-up
    // Could create tasks for follow-up calls, document review, etc.
  }

  private async handleProjectBooked(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    const projectData = event.payload as Record<string, unknown>;
    const serviceType = projectData.serviceType as string;

    // Map service type to workflow template
    const workflowTemplateId = this.getWorkflowTemplateId(serviceType);

    if (workflowTemplateId) {
      const context: WorkflowContext = {
        projectId: projectData.projectId as string,
        projectData,
        metadata: {
          eventType: 'ProjectBooked',
        },
      };

      this.recordMetric(AutomationMetricEventType.WORKFLOW_STARTED, new Date(event.timestamp));

      try {
        await this.workflowEngine.executeWorkflow(workflowTemplateId, context);
        this.recordMetric(AutomationMetricEventType.WORKFLOW_COMPLETED, new Date(event.timestamp));
      } catch (error) {
        this.recordMetric(AutomationMetricEventType.WORKFLOW_FAILED, new Date(event.timestamp));
        console.error('Workflow execution failed:', error);
      }
    }
  }

  private async handleProjectStarted(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    // TODO: Update task statuses, notify crew, etc.
  }

  private async handleCrewAssigned(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    // TODO: Notify crew of assignment, update task assignments
  }

  private async handleMaterialsRequired(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    // TODO: Create tasks for material acquisition, ordering, delivery coordination
  }

  private async handleProjectCompleted(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    // TODO: Complete all project tasks, trigger final inspection workflow
  }

  private async handleWarrantyCreated(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    // TODO: Create warranty tracking tasks, schedule future inspections
  }

  private async handleInspectionScheduled(event: DomainEvent): Promise<void> {
    this.recordMetric(AutomationMetricEventType.REQUEST, new Date(event.timestamp));

    // TODO: Create inspection preparation tasks, notify stakeholders
  }

  private getWorkflowTemplateId(serviceType: string): string {
    const workflowMap: Record<string, string> = {
      painting: 'painting-workflow',
      fencing: 'fencing-workflow',
      repairs: 'repairs-workflow',
      bathrooms: 'bathrooms-workflow',
      flooring: 'flooring-workflow',
      kitchens: 'kitchens-workflow',
      restoration: 'restoration-workflow',
      decks: 'decks-workflow',
      'finish-carpentry': 'flooring-workflow', // Reuse flooring workflow
      pergolas: 'decks-workflow', // Reuse decks workflow
    };

    return workflowMap[serviceType] || '';
  }

  private recordMetric(eventType: AutomationMetricEventType, timestamp: Date, latencyMs?: number): void {
    const event: AutomationMetricEvent = {
      eventType,
      timestamp,
      latencyMs,
    };
    this.metricsReducer.reduce(event);
  }

  getMetrics(): Record<string, unknown> {
    return this.metricsReducer.getMetrics();
  }

  getSuccessRate(): number {
    return this.metricsReducer.getSuccessRate();
  }

  getWorkflowCompletionRate(): number {
    return this.metricsReducer.getWorkflowCompletionRate();
  }
}
