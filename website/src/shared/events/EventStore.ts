/**
 * EventStore - Immutable event store with idempotency and causality
 * 
 * Constitutional principles:
 * - Events are immutable facts
 * - Current state is derived from events
 * - No state mutation
 * - Idempotency through deduplication
 * - Causality tracking for replay
 */

import type { DomainEvent } from '../types/SemanticTypes';

export interface StoredEvent extends DomainEvent {
  processedAt: string;
  deduplicationKey: string;
}

export interface EventStoreConfig {
  maxEvents?: number;
  enableDeduplication?: boolean;
}

export class EventStore {
  private events: Map<string, StoredEvent> = new Map();
  private processedEventIds: Set<string> = new Set();
  private deduplicationKeys: Set<string> = new Set();
  private config: EventStoreConfig;

  constructor(config: EventStoreConfig = {}) {
    this.config = {
      maxEvents: 10000,
      enableDeduplication: true,
      ...config
    };
  }

  // Append event (immutable, no mutation)
  async append(event: DomainEvent): Promise<StoredEvent> {
    // Idempotency check
    if (this.config.enableDeduplication) {
      if (this.processedEventIds.has(event.id)) {
        return this.events.get(event.id)!;
      }

      const deduplicationKey = this.generateDeduplicationKey(event);
      if (this.deduplicationKeys.has(deduplicationKey)) {
        // Event already processed with different ID but same content
        return this.findEventByDeduplicationKey(deduplicationKey)!;
      }
    }

    // Store event
    const storedEvent: StoredEvent = {
      ...event,
      processedAt: new Date().toISOString(),
      deduplicationKey: this.generateDeduplicationKey(event)
    };

    this.events.set(event.id, storedEvent);
    this.processedEventIds.add(event.id);
    this.deduplicationKeys.add(storedEvent.deduplicationKey);

    // Enforce max events
    if (this.events.size > (this.config.maxEvents || 10000)) {
      this.evictOldestEvents();
    }

    return storedEvent;
  }

  // Get event by ID
  getEvent(id: string): StoredEvent | undefined {
    return this.events.get(id);
  }

  // Get all events
  getAllEvents(): StoredEvent[] {
    return Array.from(this.events.values()).sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  // Get events by type
  getEventsByType(type: string): StoredEvent[] {
    return this.getAllEvents().filter(event => event.type === type);
  }

  // Get events by causality
  getEventsCausedBy(eventId: string): StoredEvent[] {
    return this.getAllEvents().filter(event => 
      event.causality?.causedBy?.includes(eventId)
    );
  }

  // Get events by correlation ID
  getEventsByCorrelationId(correlationId: string): StoredEvent[] {
    return this.getAllEvents().filter(event => 
      event.causality?.correlationId === correlationId
    );
  }

  // Get root event for correlation
  getRootEvent(correlationId: string): StoredEvent | undefined {
    const events = this.getEventsByCorrelationId(correlationId);
    return events.find(event => !event.causality?.parentEvent);
  }

  // Get event chain (causality trace)
  getEventChain(eventId: string): StoredEvent[] {
    const chain: StoredEvent[] = [];
    let currentEvent = this.getEvent(eventId);

    while (currentEvent) {
      chain.unshift(currentEvent);
      
      if (currentEvent.causality?.parentEvent) {
        currentEvent = this.getEvent(currentEvent.causality.parentEvent);
      } else {
        break;
      }
    }

    return chain;
  }

  // Check if event was processed
  isProcessed(eventId: string): boolean {
    return this.processedEventIds.has(eventId);
  }

  // Clear event store
  clear(): void {
    this.events.clear();
    this.processedEventIds.clear();
    this.deduplicationKeys.clear();
  }

  // Get statistics
  getStats() {
    return {
      totalEvents: this.events.size,
      uniqueEventTypes: new Set(this.getAllEvents().map(e => e.type)).size,
      processedCount: this.processedEventIds.size,
      deduplicatedCount: this.deduplicationKeys.size
    };
  }

  // Private helpers

  private generateDeduplicationKey(event: DomainEvent): string {
    // Generate a deduplication key based on event type, source, and data hash
    // In production, this would use a proper hash function
    const dataStr = JSON.stringify(event.data);
    return `${event.type}:${event.source}:${dataStr}`;
  }

  private findEventByDeduplicationKey(key: string): StoredEvent | undefined {
    return Array.from(this.events.values()).find(event => event.deduplicationKey === key);
  }

  private evictOldestEvents(): void {
    const events = this.getAllEvents();
    const eventsToRemove = events.slice(0, events.length - (this.config.maxEvents || 10000));
    
    eventsToRemove.forEach(event => {
      this.events.delete(event.id);
      this.processedEventIds.delete(event.id);
      this.deduplicationKeys.delete(event.deduplicationKey);
    });
  }
}

// Helper to create events with causality
export function createEvent(
  type: string,
  source: string,
  data: Record<string, unknown>,
  causality?: {
    causedBy?: string[];
    correlationId?: string;
    parentEvent?: string;
    rootEvent?: string;
  }
): DomainEvent {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    source,
    timestamp: new Date().toISOString(),
    data,
    causality
  };
}

// Helper to create child events with automatic causality
export function createChildEvent(
  parentEvent: DomainEvent,
  type: string,
  source: string,
  data: Record<string, unknown>
): DomainEvent {
  return createEvent(type, source, data, {
    causedBy: [parentEvent.id],
    correlationId: parentEvent.causality?.correlationId || parentEvent.id,
    parentEvent: parentEvent.id,
    rootEvent: parentEvent.causality?.rootEvent || parentEvent.id
  });
}
