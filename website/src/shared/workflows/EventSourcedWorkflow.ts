/**
 * Event-Sourced Workflow - Immutable events, derived state, no mutation
 * 
 * Constitutional principles:
 * - Events are immutable facts
 * - Current state is derived from events
 * - No state mutation
 * - Workflow emits events, not missions
 * 
 * Pipeline:
 * External Event
 * ↓
 * IntentCreated
 * ↓
 * RecommendationRequested
 * ↓
 * RecommendationGenerated
 * ↓
 * MissionPlanned
 * ↓
 * MissionCreated
 * ↓
 * MissionStarted
 * ↓
 * MissionCompleted
 * ↓
 * Projection
 */

import type { DomainEvent } from '../types/SemanticTypes';
import { EventStore, createEvent, createChildEvent } from '../events/EventStore';
import type { WorkflowCondition } from '../conditions/WorkflowConditions';

export interface WorkflowState {
  events: DomainEvent[];
  currentProjection: any;
}

export interface WorkflowTransition {
  to: string;
  condition?: WorkflowCondition;
}

export interface WorkflowStep {
  id: string;
  name: string;
  eventType: string;
  transitions: WorkflowTransition[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  steps: WorkflowStep[];
  startStep: string;
}

export class EventSourcedWorkflow {
  private definition: WorkflowDefinition;
  private eventStore: EventStore;
  private state: WorkflowState;

  constructor(definition: WorkflowDefinition, eventStore: EventStore) {
    this.definition = definition;
    this.eventStore = eventStore;
    this.state = {
      events: [],
      currentProjection: {}
    };
  }

  // Process external event and emit workflow events
  async processExternalEvent(event: DomainEvent): Promise<DomainEvent[]> {
    const emittedEvents: DomainEvent[] = [];

    // Step 1: Emit IntentCreated event
    const intentCreated = createChildEvent(
      event,
      'intent.created',
      'workflow',
      {
        workflowId: this.definition.id,
        workflowName: this.definition.name,
        originalEvent: event
      }
    );
    await this.eventStore.append(intentCreated);
    emittedEvents.push(intentCreated);

    // Step 2: Find matching workflow step
    const step = this.definition.steps.find(s => s.eventType === event.type);
    if (!step) {
      return emittedEvents;
    }

    // Step 3: Emit RecommendationRequested event
    const recommendationRequested = createChildEvent(
      intentCreated,
      'recommendation.requested',
      'workflow',
      {
        stepId: step.id,
        stepName: step.name,
        eventId: event.id
      }
    );
    await this.eventStore.append(recommendationRequested);
    emittedEvents.push(recommendationRequested);

    // Step 4: Find matching transition
    const transition = step.transitions.find(t => 
      !t.condition || t.condition.evaluate({ event, state: this.state.currentProjection })
    );

    if (!transition) {
      return emittedEvents;
    }

    // Step 5: Emit RecommendationGenerated event
    const recommendationGenerated = createChildEvent(
      recommendationRequested,
      'recommendation.generated',
      'workflow',
      {
        toStep: transition.to,
        confidence: 0.8,
        reasoning: `Transition from ${step.id} to ${transition.to}`
      }
    );
    await this.eventStore.append(recommendationGenerated);
    emittedEvents.push(recommendationGenerated);

    // Step 6: Emit MissionPlanned event
    const missionPlanned = createChildEvent(
      recommendationGenerated,
      'mission.planned',
      'workflow',
      {
        missionType: transition.to,
        triggeredBy: recommendationGenerated.id
      }
    );
    await this.eventStore.append(missionPlanned);
    emittedEvents.push(missionPlanned);

    // Step 7: Emit MissionCreated event
    const missionCreated = createChildEvent(
      missionPlanned,
      'mission.created',
      'workflow',
      {
        missionId: `mission-${Date.now()}`,
        missionType: transition.to,
        status: 'pending'
      }
    );
    await this.eventStore.append(missionCreated);
    emittedEvents.push(missionCreated);

    // Step 8: Emit MissionStarted event
    const missionStarted = createChildEvent(
      missionCreated,
      'mission.started',
      'workflow',
      {
        missionId: missionCreated.data.missionId,
        timestamp: new Date().toISOString()
      }
    );
    await this.eventStore.append(missionStarted);
    emittedEvents.push(missionStarted);

    // Step 9: Emit MissionCompleted event (simulated)
    const missionCompleted = createChildEvent(
      missionStarted,
      'mission.completed',
      'workflow',
      {
        missionId: missionCreated.data.missionId,
        result: 'success',
        timestamp: new Date().toISOString()
      }
    );
    await this.eventStore.append(missionCompleted);
    emittedEvents.push(missionCompleted);

    // Step 10: Update state (derived from events, not mutated)
    this.state.events.push(...emittedEvents);
    this.state.currentProjection = this.deriveProjection(this.state.events);

    return emittedEvents;
  }

  // Derive current state from events (no mutation)
  private deriveProjection(events: DomainEvent[]): any {
    const projection: any = {
      intents: [],
      recommendations: [],
      missions: [],
      lastEvent: null
    };

    for (const event of events) {
      if (event.type === 'intent.created') {
        projection.intents.push(event);
      } else if (event.type === 'recommendation.generated') {
        projection.recommendations.push(event);
      } else if (event.type === 'mission.created') {
        projection.missions.push(event);
      }
      projection.lastEvent = event;
    }

    return projection;
  }

  // Get current state (derived, not stored)
  getCurrentState(): WorkflowState {
    return {
      events: [...this.state.events],
      currentProjection: this.deriveProjection(this.state.events)
    };
  }

  // Rebuild state from event store (for replay)
  async rebuildFromEventStore(): Promise<void> {
    const allEvents = this.eventStore.getAllEvents();
    this.state.events = allEvents;
    this.state.currentProjection = this.deriveProjection(allEvents);
  }

  // Get workflow definition
  getDefinition(): WorkflowDefinition {
    return this.definition;
  }
}

// Example workflow definition: Lead to Project
export const LEAD_TO_PROJECT_WORKFLOW: WorkflowDefinition = {
  id: 'lead-to-project',
  name: 'Lead to Project Workflow',
  steps: [
    {
      id: 'lead-received',
      name: 'Lead Received',
      eventType: 'lead.received',
      transitions: [
        {
          to: 'estimate-created'
        }
      ]
    },
    {
      id: 'estimate-created',
      name: 'Estimate Created',
      eventType: 'estimate.created',
      transitions: [
        {
          to: 'estimate-sent'
        }
      ]
    },
    {
      id: 'estimate-sent',
      name: 'Estimate Sent',
      eventType: 'estimate.sent',
      transitions: [
        {
          to: 'estimate-accepted'
        }
      ]
    },
    {
      id: 'estimate-accepted',
      name: 'Estimate Accepted',
      eventType: 'estimate.accepted',
      transitions: [
        {
          to: 'project-created'
        }
      ]
    },
    {
      id: 'project-created',
      name: 'Project Created',
      eventType: 'project.created',
      transitions: []
    }
  ],
  startStep: 'lead-received'
};

// Initialize event-sourced workflow
export function initializeEventSourcedWorkflow(definition: WorkflowDefinition, eventStore: EventStore): EventSourcedWorkflow {
  return new EventSourcedWorkflow(definition, eventStore);
}
