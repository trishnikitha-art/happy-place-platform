/**
 * Mission Planner - Takes recommendations, produces mission plans
 * 
 * Decouples workflow from mission execution.
 * Workflow produces Intent → Recommendation Engine produces Recommendations → Mission Planner produces Mission Plans.
 * 
 * This keeps business reasoning separate from execution.
 */

import type { RecommendationOption } from '../recommendation/RecommendationEngine';
import type { MissionPayload } from '../missions/MissionPayloads';

export interface MissionPlan {
  id: string;
  recommendationId: string;
  missions: PlannedMission[];
  generatedAt: string;
}

export interface PlannedMission {
  id: string;
  missionType: string;
  payload: MissionPayload;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration?: number;
  dependencies?: string[];
}

export interface MissionPlanningStrategy {
  name: string;
  canPlan(recommendation: RecommendationOption): boolean;
  plan(recommendation: RecommendationOption): PlannedMission[];
}

export class MissionPlanner {
  private strategies: Map<string, MissionPlanningStrategy> = new Map();

  constructor() {
    this.registerDefaultStrategies();
  }

  // Register planning strategy
  registerStrategy(strategy: MissionPlanningStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  // Generate mission plan from recommendation
  async generateMissionPlan(recommendation: RecommendationOption): Promise<MissionPlan> {
    // Find matching strategy
    const strategy = Array.from(this.strategies.values()).find(s => 
      s.canPlan(recommendation)
    );

    if (!strategy) {
      // Default strategy - create single mission
      return this.createDefaultPlan(recommendation);
    }

    // Generate missions using strategy
    const missions = strategy.plan(recommendation);

    return {
      id: `plan-${recommendation.id}`,
      recommendationId: recommendation.id,
      missions,
      generatedAt: new Date().toISOString()
    };
  }

  // Create default mission plan
  private createDefaultPlan(recommendation: RecommendationOption): MissionPlan {
    const mission: PlannedMission = {
      id: `mission-${recommendation.id}`,
      missionType: recommendation.action,
      payload: {
        missionId: `mission-${recommendation.id}`,
        missionType: recommendation.action as any,
        timestamp: new Date().toISOString()
      } as MissionPayload,
      priority: this.mapConfidenceToPriority(recommendation.confidence)
    };

    return {
      id: `plan-${recommendation.id}`,
      recommendationId: recommendation.id,
      missions: [mission],
      generatedAt: new Date().toISOString()
    };
  }

  // Map confidence to priority
  private mapConfidenceToPriority(confidence: number): 'low' | 'medium' | 'high' | 'critical' {
    if (confidence >= 0.9) return 'critical';
    if (confidence >= 0.7) return 'high';
    if (confidence >= 0.5) return 'medium';
    return 'low';
  }

  // Register default strategies
  private registerDefaultStrategies(): void {
    this.registerStrategy(new ReviewResponseStrategy());
    this.registerStrategy(new LeadQualificationStrategy());
    this.registerStrategy(new ProjectManagementStrategy());
    this.registerStrategy(new InvoiceManagementStrategy());
  }
}

// Strategy: Review Response
class ReviewResponseStrategy implements MissionPlanningStrategy {
  name = 'review-response';

  canPlan(recommendation: RecommendationOption): boolean {
    return recommendation.action.includes('review') || recommendation.action.includes('testimonial');
  }

  plan(recommendation: RecommendationOption): PlannedMission[] {
    const missions: PlannedMission[] = [];

    if (recommendation.action === 'thank-customer') {
      missions.push({
        id: `mission-thank-${Date.now()}`,
        missionType: 'respond-review',
        payload: {
          missionId: `mission-thank-${Date.now()}`,
          missionType: 'respond-review',
          timestamp: new Date().toISOString(),
          reviewId: recommendation.evidenceId,
          customerName: 'Customer', // Would come from evidence
          rating: 5,
          body: 'Thank you for your review!'
        } as MissionPayload,
        priority: 'high'
      });
    }

    if (recommendation.action === 'request-testimonial') {
      missions.push({
        id: `mission-testimonial-${Date.now()}`,
        missionType: 'request-testimonial',
        payload: {
          missionId: `mission-testimonial-${Date.now()}`,
          missionType: 'request-testimonial',
          timestamp: new Date().toISOString(),
          reviewId: recommendation.evidenceId,
          customerId: 'customer-id', // Would come from evidence
          customerName: 'Customer',
          rating: 5
        } as MissionPayload,
        priority: 'medium'
      });
    }

    if (recommendation.action === 'investigate-issue') {
      missions.push({
        id: `mission-investigate-${Date.now()}`,
        missionType: 'investigate-issue',
        payload: {
          missionId: `mission-investigate-${Date.now()}`,
          missionType: 'investigate-issue',
          timestamp: new Date().toISOString(),
          reviewId: recommendation.evidenceId,
          customerId: 'customer-id',
          rating: 1,
          body: 'Issue to investigate',
          severity: 'high'
        } as MissionPayload,
        priority: 'critical'
      });
    }

    return missions;
  }
}

// Strategy: Lead Qualification
class LeadQualificationStrategy implements MissionPlanningStrategy {
  name = 'lead-qualification';

  canPlan(recommendation: RecommendationOption): boolean {
    return recommendation.action.includes('lead');
  }

  plan(recommendation: RecommendationOption): PlannedMission[] {
    const missions: PlannedMission[] = [];

    if (recommendation.action === 'qualify-lead') {
      missions.push({
        id: `mission-qualify-${Date.now()}`,
        missionType: 'qualify-lead',
        payload: {
          missionId: `mission-qualify-${Date.now()}`,
          missionType: 'qualify-lead',
          timestamp: new Date().toISOString(),
          leadId: recommendation.evidenceId,
          name: 'Lead Name',
          email: 'lead@example.com',
          source: 'web'
        } as MissionPayload,
        priority: 'high'
      });
    }

    if (recommendation.action === 'notify-sales') {
      missions.push({
        id: `mission-notify-sales-${Date.now()}`,
        missionType: 'notify-sales',
        payload: {
          missionId: `mission-notify-sales-${Date.now()}`,
          missionType: 'notify-sales',
          timestamp: new Date().toISOString(),
          leadId: recommendation.evidenceId,
          name: 'Lead Name',
          source: 'web',
          priority: 'high'
        } as MissionPayload,
        priority: 'high'
      });
    }

    return missions;
  }
}

// Strategy: Project Management
class ProjectManagementStrategy implements MissionPlanningStrategy {
  name = 'project-management';

  canPlan(recommendation: RecommendationOption): boolean {
    return recommendation.action.includes('project') || recommendation.action.includes('schedule') || recommendation.action.includes('assign');
  }

  plan(recommendation: RecommendationOption): PlannedMission[] {
    const missions: PlannedMission[] = [];

    if (recommendation.action === 'schedule-work') {
      missions.push({
        id: `mission-schedule-${Date.now()}`,
        missionType: 'schedule-work',
        payload: {
          missionId: `mission-schedule-${Date.now()}`,
          missionType: 'schedule-work',
          timestamp: new Date().toISOString(),
          projectId: recommendation.evidenceId,
          customerId: 'customer-id',
          startDate: new Date().toISOString()
        } as MissionPayload,
        priority: 'high'
      });
    }

    if (recommendation.action === 'assign-crew') {
      missions.push({
        id: `mission-assign-${Date.now()}`,
        missionType: 'assign-crew',
        payload: {
          missionId: `mission-assign-${Date.now()}`,
          missionType: 'assign-crew',
          timestamp: new Date().toISOString(),
          projectId: recommendation.evidenceId,
          crewId: 'crew-id',
          crewSize: 3,
          skills: ['carpentry', 'painting'],
          startDate: new Date().toISOString()
        } as MissionPayload,
        priority: 'high'
      });
    }

    return missions;
  }
}

// Strategy: Invoice Management
class InvoiceManagementStrategy implements MissionPlanningStrategy {
  name = 'invoice-management';

  canPlan(recommendation: RecommendationOption): boolean {
    return recommendation.action.includes('invoice') || recommendation.action.includes('payment');
  }

  plan(recommendation: RecommendationOption): PlannedMission[] {
    const missions: PlannedMission[] = [];

    if (recommendation.action === 'send-invoice') {
      missions.push({
        id: `mission-send-invoice-${Date.now()}`,
        missionType: 'send-invoice',
        payload: {
          missionId: `mission-send-invoice-${Date.now()}`,
          missionType: 'send-invoice',
          timestamp: new Date().toISOString(),
          invoiceId: recommendation.evidenceId,
          customerId: 'customer-id',
          method: 'email'
        } as MissionPayload,
        priority: 'high'
      });
    }

    if (recommendation.action === 'send-reminder') {
      missions.push({
        id: `mission-reminder-${Date.now()}`,
        missionType: 'send-reminder',
        payload: {
          missionId: `mission-reminder-${Date.now()}`,
          missionType: 'send-reminder',
          timestamp: new Date().toISOString(),
          invoiceId: recommendation.evidenceId,
          customerId: 'customer-id',
          daysOverdue: 30,
          reminderLevel: 1
        } as MissionPayload,
        priority: 'medium'
      });
    }

    return missions;
  }
}

// Initialize mission planner
export function initializeMissionPlanner(): MissionPlanner {
  return new MissionPlanner();
}
