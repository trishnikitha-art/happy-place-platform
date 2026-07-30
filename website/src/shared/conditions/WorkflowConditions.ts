/**
 * Workflow Conditions - Interface-based conditions instead of JavaScript strings
 * 
 * Never execute arbitrary strings. Use interface-based conditions that can be:
 * - Statically validated
 * - Autocompleted
 * - Refactored
 * - Analyzed
 * - Type-safe
 */

export interface WorkflowCondition {
  evaluate(context: ConditionContext): boolean;
}

export interface ConditionContext {
  event: any;
  state: Record<string, any>;
  metadata?: Record<string, any>;
}

// Type-based conditions
export class EventTypeCondition implements WorkflowCondition {
  constructor(private eventType: string) {}

  evaluate(context: ConditionContext): boolean {
    return context.event.type === this.eventType;
  }
}

export class PropertyEqualsCondition implements WorkflowCondition {
  constructor(
    private property: string,
    private value: any
  ) {}

  evaluate(context: ConditionContext): boolean {
    const propertyValue = this.getNestedProperty(context.event, this.property);
    return propertyValue === this.value;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export class PropertyExistsCondition implements WorkflowCondition {
  constructor(private property: string) {}

  evaluate(context: ConditionContext): boolean {
    const propertyValue = this.getNestedProperty(context.event, this.property);
    return propertyValue !== undefined && propertyValue !== null;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export class PropertyGreaterThanCondition implements WorkflowCondition {
  constructor(
    private property: string,
    private value: number
  ) {}

  evaluate(context: ConditionContext): boolean {
    const propertyValue = this.getNestedProperty(context.event, this.property);
    return typeof propertyValue === 'number' && propertyValue > this.value;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

export class PropertyLessThanCondition implements WorkflowCondition {
  constructor(
    private property: string,
    private value: number
  ) {}

  evaluate(context: ConditionContext): boolean {
    const propertyValue = this.getNestedProperty(context.event, this.property);
    return typeof propertyValue === 'number' && propertyValue < this.value;
  }

  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// Composite conditions
export class AndCondition implements WorkflowCondition {
  constructor(private conditions: WorkflowCondition[]) {}

  evaluate(context: ConditionContext): boolean {
    return this.conditions.every(condition => condition.evaluate(context));
  }
}

export class OrCondition implements WorkflowCondition {
  constructor(private conditions: WorkflowCondition[]) {}

  evaluate(context: ConditionContext): boolean {
    return this.conditions.some(condition => condition.evaluate(context));
  }
}

export class NotCondition implements WorkflowCondition {
  constructor(private condition: WorkflowCondition) {}

  evaluate(context: ConditionContext): boolean {
    return !this.condition.evaluate(context);
  }
}

// State-based conditions
export class StateEqualsCondition implements WorkflowCondition {
  constructor(
    private stateKey: string,
    private value: any
  ) {}

  evaluate(context: ConditionContext): boolean {
    return context.state[this.stateKey] === this.value;
  }
}

export class StateExistsCondition implements WorkflowCondition {
  constructor(private stateKey: string) {}

  evaluate(context: ConditionContext): boolean {
    return context.state[this.stateKey] !== undefined && context.state[this.stateKey] !== null;
  }
}

// Helper functions for creating common conditions
export function eventType(eventType: string): WorkflowCondition {
  return new EventTypeCondition(eventType);
}

export function propertyEquals(property: string, value: any): WorkflowCondition {
  return new PropertyEqualsCondition(property, value);
}

export function propertyExists(property: string): WorkflowCondition {
  return new PropertyExistsCondition(property);
}

export function propertyGreaterThan(property: string, value: number): WorkflowCondition {
  return new PropertyGreaterThanCondition(property, value);
}

export function propertyLessThan(property: string, value: number): WorkflowCondition {
  return new PropertyLessThanCondition(property, value);
}

export function and(...conditions: WorkflowCondition[]): WorkflowCondition {
  return new AndCondition(conditions);
}

export function or(...conditions: WorkflowCondition[]): WorkflowCondition {
  return new OrCondition(conditions);
}

export function not(condition: WorkflowCondition): WorkflowCondition {
  return new NotCondition(condition);
}

export function stateEquals(stateKey: string, value: any): WorkflowCondition {
  return new StateEqualsCondition(stateKey, value);
}

export function stateExists(stateKey: string): WorkflowCondition {
  return new StateExistsCondition(stateKey);
}

// Predefined condition builders for common business events
export const Conditions = {
  // Review conditions
  reviewReceived: () => eventType('review.received'),
  reviewRatingAtLeast: (rating: number) => propertyGreaterThan('data.rating', rating),
  reviewRatingAtMost: (rating: number) => propertyLessThan('data.rating', rating),
  reviewPositive: () => propertyGreaterThan('data.rating', 3),
  reviewNegative: () => propertyLessThan('data.rating', 3),

  // Lead conditions
  leadReceived: () => eventType('lead.received'),
  leadQualified: () => propertyEquals('data.qualified', true),
  leadSource: (source: string) => propertyEquals('data.source', source),

  // Estimate conditions
  estimateCreated: () => eventType('estimate.created'),
  estimateSent: () => eventType('estimate.sent'),
  estimateAccepted: () => eventType('estimate.accepted'),
  estimateRejected: () => eventType('estimate.rejected'),
  estimateExpired: () => eventType('estimate.expired'),

  // Project conditions
  projectCreated: () => eventType('project.created'),
  projectCompleted: () => eventType('project.completed'),
  projectInProgress: () => eventType('project.in-progress'),

  // Invoice conditions
  invoiceSent: () => eventType('invoice.sent'),
  invoicePaid: () => eventType('invoice.paid'),
  invoiceOverdue: () => eventType('invoice.overdue'),

  // Customer conditions
  customerActive: () => propertyEquals('data.status', 'active'),
  customerAtRisk: () => propertyEquals('data.status', 'at-risk'),
  customerInactive: () => propertyEquals('data.status', 'inactive'),
};
