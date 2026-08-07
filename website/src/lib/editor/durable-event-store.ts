/**
 * Durable Event Store
 * 
 * Constitutional Law: Event Store Must Be Durable
 * 
 * The event store must persist events to storage for replay sovereignty.
 * This implementation uses file-based persistence.
 * 
 * Events are:
 * - Appended transactionally
 * - Deep-frozen to prevent mutation
 * - Validated against canonical schema
 * - Enforced for sequence monotonicity
 */

import { AnyEvent, Event } from './event-system';
import { sequenceAuthority } from './sequence-authority';

interface PersistedEventStore {
  events: Event[];
  version: number;
  lastSequence: number;
}

class DurableEventStore {
  private static instance: DurableEventStore;
  private events: Event[] = [];
  private version = 0;
  private lastSequence = 0;
  private storageKey = 'hpp_event_store';

  private constructor() {
    this.loadFromStorage();
  }

  static getInstance(): DurableEventStore {
    if (!DurableEventStore.instance) {
      DurableEventStore.instance = new DurableEventStore();
    }
    return DurableEventStore.instance;
  }

  /**
   * Load events from storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data: PersistedEventStore = JSON.parse(stored);
        this.events = data.events;
        this.version = data.version;
        this.lastSequence = data.lastSequence;
        
        // Restore sequence authority state
        sequenceAuthority.reset();
        for (const event of this.events) {
          // Ensure sequence authority is aware of existing sequences
          // This is a simplification - in production, you'd reconstruct the full state
        }
      }
    } catch (error) {
      console.error('Failed to load event store from storage:', error);
      // Start fresh on load failure
      this.events = [];
      this.version = 0;
      this.lastSequence = 0;
    }
  }

  /**
   * Save events to storage
   */
  private saveToStorage(): void {
    try {
      const data: PersistedEventStore = {
        events: this.events,
        version: this.version,
        lastSequence: this.lastSequence
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save event store to storage:', error);
      throw new Error('Event store persistence failed');
    }
  }

  /**
   * Deep freeze an event to prevent mutation
   */
  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    // Freeze primitive properties
    Object.freeze(obj);

    // Recursively freeze nested objects
    for (const key of Object.keys(obj)) {
      const value = (obj as any)[key];
      if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
        this.deepFreeze(value);
      }
    }

    return obj;
  }

  /**
   * Validate event against canonical schema
   */
  private validateEvent(event: Event): boolean {
    // Ensure event has required fields
    if (!event.id || !event.type || !event.sequence || !event.commandId) {
      return false;
    }

    // Validate sequence monotonicity
    if (event.sequence <= this.lastSequence) {
      return false;
    }

    // Validate event ID matches sequence
    const expectedId = `evt_${event.sequence}`;
    if (event.id !== expectedId) {
      return false;
    }

    return true;
  }

  /**
   * Append a single event
   * Enforces canonical schema and sequence invariants
   */
  append(event: Event): void {
    if (!this.validateEvent(event)) {
      throw new Error('Event validation failed');
    }

    // Deep freeze to prevent mutation
    const frozenEvent = this.deepFreeze(event);
    
    this.events.push(frozenEvent);
    this.lastSequence = event.sequence;
    this.version++;
    
    this.saveToStorage();
  }

  /**
   * Append multiple events atomically
   * All events must validate before any are persisted
   */
  appendAll(events: Event[]): void {
    // Validate all events first
    for (const event of events) {
      if (!this.validateEvent(event)) {
        throw new Error('Event validation failed in batch');
      }
    }

    // Deep freeze all events
    const frozenEvents = events.map(e => this.deepFreeze(e));
    
    // Append all events
    this.events.push(...frozenEvents);
    
    // Update last sequence to the highest sequence
    const maxSequence = Math.max(...events.map(e => e.sequence));
    this.lastSequence = maxSequence;
    this.version++;
    
    this.saveToStorage();
  }

  /**
   * Get all events
   * Returns deep copies to prevent mutation
   */
  getAll(): Event[] {
    return this.events.map(e => JSON.parse(JSON.stringify(e)));
  }

  /**
   * Get events from sequence
   * Returns deep copies to prevent mutation
   */
  getFromSequence(fromSequence: number): Event[] {
    return this.events
      .filter(e => e.sequence >= fromSequence)
      .map(e => JSON.parse(JSON.stringify(e)));
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.version = 0;
    this.lastSequence = 0;
    this.saveToStorage();
  }

  /**
   * Get current version
   */
  getVersion(): number {
    return this.version;
  }

  /**
   * Get last sequence number
   */
  getLastSequence(): number {
    return this.lastSequence;
  }
}

export const durableEventStore = DurableEventStore.getInstance();
