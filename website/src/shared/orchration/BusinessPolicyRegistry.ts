/**
 * Business Policy Registry - Single source of business policy
 * 
 * Eliminates duplication between Workflow and EventFanOut.
 * All business policy is defined here in one place.
 * 
 * Constitutional pipeline:
 * Event → Business Policy → Intent → Recommendation → Mission Plan
 */

import type { DomainEvent } from '../types/SemanticTypes';
import type { WorkflowCondition } from '../conditions/WorkflowConditions';

export interface BusinessPolicy {
  id: string;
  eventType: string;
  condition?: WorkflowCondition;
  intent: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class BusinessPolicyRegistry {
  private policies: Map<string, BusinessPolicy[]> = new Map();

  constructor() {
    this.registerDefaultPolicies();
  }

  // Register policy for event type
  registerPolicy(eventType: string, policy: BusinessPolicy): void {
    if (!this.policies.has(eventType)) {
      this.policies.set(eventType, []);
    }
    this.policies.get(eventType)!.push(policy);
  }

  // Get policies for event type
  getPolicies(eventType: string): BusinessPolicy[] {
    return this.policies.get(eventType) || [];
  }

  // Get matching policies for event
  getMatchingPolicies(event: DomainEvent): BusinessPolicy[] {
    const policies = this.getPolicies(event.type);
    return policies.filter(policy => 
      !policy.condition || policy.condition.evaluate({ event, state: {} })
    );
  }

  // Register default business policies
  private registerDefaultPolicies(): void {
    // Review policies
    this.registerPolicy('review.received', {
      id: 'review-respond',
      eventType: 'review.received',
      intent: 'respond-to-review',
      priority: 'high'
    });

    this.registerPolicy('review.received', {
      id: 'review-marketing',
      eventType: 'review.received',
      intent: 'notify-marketing',
      priority: 'medium'
    });

    this.registerPolicy('review.received', {
      id: 'review-customer-health',
      eventType: 'review.received',
      intent: 'update-customer-health',
      priority: 'medium'
    });

    // Lead policies
    this.registerPolicy('lead.received', {
      id: 'lead-qualify',
      eventType: 'lead.received',
      intent: 'qualify-lead',
      priority: 'high'
    });

    this.registerPolicy('lead.received', {
      id: 'lead-sales',
      eventType: 'lead.received',
      intent: 'notify-sales',
      priority: 'high'
    });

    this.registerPolicy('lead.received', {
      id: 'lead-estimate',
      eventType: 'lead.received',
      intent: 'create-estimate',
      priority: 'medium'
    });

    // Estimate policies
    this.registerPolicy('estimate.accepted', {
      id: 'estimate-project',
      eventType: 'estimate.accepted',
      intent: 'create-project',
      priority: 'high'
    });

    this.registerPolicy('estimate.accepted', {
      id: 'estimate-schedule',
      eventType: 'estimate.accepted',
      intent: 'schedule-work',
      priority: 'high'
    });

    this.registerPolicy('estimate.accepted', {
      id: 'estimate-operations',
      eventType: 'estimate.accepted',
      intent: 'notify-operations',
      priority: 'medium'
    });

    // Project policies
    this.registerPolicy('project.completed', {
      id: 'project-review',
      eventType: 'project.completed',
      intent: 'request-review',
      priority: 'high'
    });

    this.registerPolicy('project.completed', {
      id: 'project-revenue',
      eventType: 'project.completed',
      intent: 'update-revenue',
      priority: 'high'
    });

    this.registerPolicy('project.completed', {
      id: 'project-archive',
      eventType: 'project.completed',
      intent: 'archive-project',
      priority: 'low'
    });

    // Invoice policies
    this.registerPolicy('invoice.paid', {
      id: 'invoice-revenue',
      eventType: 'invoice.paid',
      intent: 'update-revenue',
      priority: 'high'
    });

    this.registerPolicy('invoice.paid', {
      id: 'invoice-health',
      eventType: 'invoice.paid',
      intent: 'update-customer-health',
      priority: 'medium'
    });

    this.registerPolicy('invoice.overdue', {
      id: 'invoice-reminder',
      eventType: 'invoice.overdue',
      intent: 'send-reminder',
      priority: 'high'
    });

    this.registerPolicy('invoice.overdue', {
      id: 'invoice-risk',
      eventType: 'invoice.overdue',
      intent: 'update-customer-risk',
      priority: 'medium'
    });
  }
}

// Initialize business policy registry
export function initializeBusinessPolicyRegistry(): BusinessPolicyRegistry {
  return new BusinessPolicyRegistry();
}
