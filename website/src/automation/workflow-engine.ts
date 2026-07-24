/** Workflow Engine

Capability-based workflow engine for automation.

Architecture:
WorkflowTemplate
  ↓
WorkflowEngine
  ↓
TaskProvider (via AutomationAuthority)
  ↓
External Task System

Workflows are defined as templates and executed through the automation authority.
*/

import { AutomationAuthority } from './automation-authority';
import { AutomationCapabilityId } from './capability-id';
import { Task } from './task-provider';

export interface WorkflowStep {
  id: string;
  name: string;
  capability: string;
  taskTemplate: Omit<Task, 'id'>;
  dependencies?: string[];
  condition?: (context: WorkflowContext) => boolean;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  serviceType: string;
  steps: WorkflowStep[];
}

export interface WorkflowContext {
  projectId: string;
  projectData: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WorkflowExecution {
  workflowId: string;
  executionId: string;
  context: WorkflowContext;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  steps: Map<string, WorkflowStepExecution>;
  error?: string;
}

export interface WorkflowStepExecution {
  stepId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
  taskId?: string;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export class WorkflowEngine {
  private automationAuthority: AutomationAuthority;
  private workflowTemplates: Map<string, WorkflowTemplate> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  constructor(automationAuthority: AutomationAuthority) {
    this.automationAuthority = automationAuthority;
  }

  registerTemplate(template: WorkflowTemplate): void {
    this.workflowTemplates.set(template.id, template);
  }

  getTemplate(templateId: string): WorkflowTemplate | undefined {
    return this.workflowTemplates.get(templateId);
  }

  listTemplates(): WorkflowTemplate[] {
    return Array.from(this.workflowTemplates.values());
  }

  async executeWorkflow(
    templateId: string,
    context: WorkflowContext,
  ): Promise<WorkflowExecution> {
    const template = this.workflowTemplates.get(templateId);
    if (!template) {
      throw new Error(`Workflow template not found: ${templateId}`);
    }

    const executionId = this.generateExecutionId();
    const execution: WorkflowExecution = {
      workflowId: templateId,
      executionId,
      context,
      status: 'pending',
      steps: new Map(),
    };

    this.executions.set(executionId, execution);

    try {
      execution.status = 'in_progress';
      execution.startedAt = new Date();

      for (const step of template.steps) {
        await this.executeStep(step, execution, context);
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();
    }

    return execution;
  }

  private async executeStep(
    step: WorkflowStep,
    execution: WorkflowExecution,
    context: WorkflowContext,
  ): Promise<void> {
    const stepExecution: WorkflowStepExecution = {
      stepId: step.id,
      status: 'pending',
    };
    execution.steps.set(step.id, stepExecution);

    // Check dependencies
    if (step.dependencies) {
      for (const depId of step.dependencies) {
        const depExecution = execution.steps.get(depId);
        if (!depExecution || depExecution.status !== 'completed') {
          stepExecution.status = 'skipped';
          stepExecution.completedAt = new Date();
          return;
        }
      }
    }

    // Check condition
    if (step.condition && !step.condition(context)) {
      stepExecution.status = 'skipped';
      stepExecution.completedAt = new Date();
      return;
    }

    try {
      stepExecution.status = 'in_progress';
      stepExecution.startedAt = new Date();

      const capabilityId = new AutomationCapabilityId(step.capability);
      const task = await this.automationAuthority.createTask(
        capabilityId,
        {
          ...step.taskTemplate,
          projectId: context.projectId,
          metadata: {
            ...step.taskTemplate.metadata,
            workflowExecutionId: execution.executionId,
            stepId: step.id,
          },
        },
      );

      stepExecution.taskId = task.id;
      stepExecution.status = 'completed';
      stepExecution.completedAt = new Date();
    } catch (error) {
      stepExecution.status = 'failed';
      stepExecution.error = error instanceof Error ? error.message : String(error);
      stepExecution.completedAt = new Date();
      throw error;
    }
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  listExecutions(): WorkflowExecution[] {
    return Array.from(this.executions.values());
  }

  private generateExecutionId(): string {
    return `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
