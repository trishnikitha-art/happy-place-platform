/**
 * Event System
 * 
 * Constitutional Law 10: Commands Produce Events
 * 
 * Commands never write storage directly.
 * Commands produce events that update projections.
 * 
 * Event flow:
 * Command → Event → Event Store → Projection → Runtime
 * 
 * Events contain only forward-looking state (no old* fields).
 * Replay applies events to projection, not re-emits through recording path.
 */

import { slotRegistry } from './slot-registry';

export interface Event {
  id: string;
  type: EventType;
  sequence: number;
  commandId: string;
  data: any;
}

export type EventType =
  | 'AssetReplaced'
  | 'PlacementMoved'
  | 'PlacementSwapped'
  | 'PlacementDeleted'
  | 'PlacementDuplicated'
  | 'AssetCropped'
  | 'FocalPointAdjusted'
  | 'SlotConstraintsUpdated'
  | 'StagedPublished';

export interface AssetReplacedEvent extends Event {
  type: 'AssetReplaced';
  data: {
    slotId: string;
    newAssetId: string;
  };
}

export interface PlacementMovedEvent extends Event {
  type: 'PlacementMoved';
  data: {
    placementId: string;
    newSlotId: string;
  };
}

export interface PlacementDeletedEvent extends Event {
  type: 'PlacementDeleted';
  data: {
    placementId: string;
  };
}

export interface FocalPointAdjustedEvent extends Event {
  type: 'FocalPointAdjusted';
  data: {
    assetId: string;
    newFocalPoint: { x: number; y: number };
  };
}

export interface StagedPublishedEvent extends Event {
  type: 'StagedPublished';
  data: {
    placementIds: string[];
  };
}

export type AnyEvent = 
  | AssetReplacedEvent
  | PlacementMovedEvent
  | PlacementDeletedEvent
  | FocalPointAdjustedEvent
  | StagedPublishedEvent;

/**
 * Event Listener
 */
type EventListener = (event: AnyEvent) => void | Promise<void>;

/**
 * Event Store (for durability - separated from bus)
 * This will eventually be persisted to storage
 */
class EventStore {
  private static instance: EventStore;
  private events: Event[] = [];

  private constructor() {}

  static getInstance(): EventStore {
    if (!EventStore.instance) {
      EventStore.instance = new EventStore();
    }
    return EventStore.instance;
  }

  append(event: Event): void {
    this.events.push(event);
  }

  getAll(): Event[] {
    return [...this.events];
  }

  getFromSequence(fromSequence: number): Event[] {
    return this.events.filter(e => e.sequence >= fromSequence);
  }

  clear(): void {
    this.events = [];
  }
}

export const eventStore = EventStore.getInstance();

/**
 * Event Bus (for notification - separated from store)
 * Not for durability or replay
 */
class EventBus {
  private static instance: EventBus;
  private listeners: Map<EventType, Set<EventListener>> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  /**
   * Emit event to notify listeners
   * Does NOT store event - use eventStore for persistence
   */
  async emit(event: AnyEvent): Promise<void> {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      // Execute listeners in registration order for determinism
      const orderedListeners = Array.from(listeners);
      for (const listener of orderedListeners) {
        await listener(event);
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(eventType: EventType, listener: EventListener): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(eventType)?.delete(listener);
    };
  }
}

export const eventBus = EventBus.getInstance();

/**
 * Event System facade
 * Coordinates event bus and event store
 */
class EventSystem {
  private static instance: EventSystem;
  private sequence = 0;

  private constructor() {}

  static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    return EventSystem.instance;
  }

  private nextSequence(): number {
    return ++this.sequence;
  }

  /**
   * Emit and store event
   * This is the canonical event emission point
   */
  async emit(event: AnyEvent): Promise<void> {
    // Store in event store for durability/replay
    eventStore.append(event);
    
    // Notify listeners via event bus
    await eventBus.emit(event);
  }

  /**
   * Replay events to rebuild state
   * Applies events to projection without re-emitting through recording path
   */
  async replay(fromSequence?: number): Promise<void> {
    const events = fromSequence
      ? eventStore.getFromSequence(fromSequence)
      : eventStore.getAll();

    // Replay directly to projections (not through emit)
    // This prevents corrupting event history
    for (const event of events) {
      await this.applyToProjection(event as AnyEvent);
    }
  }

  /**
   * Apply event to projection
   * Separate from emit to prevent replay corruption
   */
  private async applyToProjection(event: AnyEvent): Promise<void> {
    // Lazy import to avoid circular dependency
    const { placementGraph } = await import('./placement-graph');
    const { slotRegistry } = await import('./slot-registry');
    
    switch (event.type) {
      case 'AssetReplaced':
        await this.applyAssetReplaced(event as AssetReplacedEvent, placementGraph, slotRegistry);
        break;
      case 'PlacementMoved':
        await this.applyPlacementMoved(event as PlacementMovedEvent, placementGraph);
        break;
      case 'PlacementDeleted':
        await this.applyPlacementDeleted(event as PlacementDeletedEvent, placementGraph);
        break;
      case 'FocalPointAdjusted':
        await this.applyFocalPointAdjusted(event as FocalPointAdjustedEvent);
        break;
      case 'StagedPublished':
        await this.applyStagedPublished(event as StagedPublishedEvent, placementGraph);
        break;
    }
  }

  private async applyAssetReplaced(event: AssetReplacedEvent, placementGraph: any, slotRegistry: any): Promise<void> {
    const existingPlacement = placementGraph.getPlacementForSlot(event.data.slotId);
    
    if (existingPlacement) {
      placementGraph.replaceAsset(existingPlacement.placementId, event.data.newAssetId);
    } else {
      // Need pageId and componentId for new placement
      // This should come from slot registration
      const slot = slotRegistry.getSlot(event.data.slotId);
      if (slot) {
        placementGraph.createPlacement({
          assetId: event.data.newAssetId,
          slotId: event.data.slotId,
          pageId: slot.page,
          componentId: slot.component
        });
      }
    }
  }

  private async applyPlacementMoved(event: PlacementMovedEvent, placementGraph: any): Promise<void> {
    placementGraph.movePlacement(event.data.placementId, event.data.newSlotId);
  }

  private async applyPlacementDeleted(event: PlacementDeletedEvent, placementGraph: any): Promise<void> {
    placementGraph.deletePlacement(event.data.placementId);
  }

  private async applyFocalPointAdjusted(event: FocalPointAdjustedEvent): Promise<void> {
    // TODO: Apply focal point adjustment to asset metadata
    console.log('Focal point adjustment not yet implemented in placement graph');
  }

  private async applyStagedPublished(event: StagedPublishedEvent, placementGraph: any): Promise<void> {
    placementGraph.publishStaged();
  }

  /**
   * Get event history
   */
  getHistory(): Event[] {
    return eventStore.getAll();
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    eventStore.clear();
  }
}

export const eventSystem = EventSystem.getInstance();

/**
 * Event Builder
 * Type-safe event creation with deterministic IDs
 */
class EventBuilder {
  private static generateId(sequence: number): string {
    return `evt_${sequence}`;
  }

  static assetReplaced(params: {
    commandId: string;
    slotId: string;
    newAssetId: string;
  }): AssetReplacedEvent {
    const sequence = eventSystem['nextSequence']();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'AssetReplaced',
      sequence,
      commandId: params.commandId,
      data: {
        slotId: params.slotId,
        newAssetId: params.newAssetId
      }
    };
  }

  static placementMoved(params: {
    commandId: string;
    placementId: string;
    newSlotId: string;
  }): PlacementMovedEvent {
    const sequence = eventSystem['nextSequence']();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'PlacementMoved',
      sequence,
      commandId: params.commandId,
      data: {
        placementId: params.placementId,
        newSlotId: params.newSlotId
      }
    };
  }

  static placementDeleted(params: {
    commandId: string;
    placementId: string;
  }): PlacementDeletedEvent {
    const sequence = eventSystem['nextSequence']();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'PlacementDeleted',
      sequence,
      commandId: params.commandId,
      data: {
        placementId: params.placementId
      }
    };
  }

  static focalPointAdjusted(params: {
    commandId: string;
    assetId: string;
    newFocalPoint: { x: number; y: number };
  }): FocalPointAdjustedEvent {
    const sequence = eventSystem['nextSequence']();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'FocalPointAdjusted',
      sequence,
      commandId: params.commandId,
      data: {
        assetId: params.assetId,
        newFocalPoint: params.newFocalPoint
      }
    };
  }

  static stagedPublished(params: {
    commandId: string;
    placementIds: string[];
  }): StagedPublishedEvent {
    const sequence = eventSystem['nextSequence']();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'StagedPublished',
      sequence,
      commandId: params.commandId,
      data: {
        placementIds: params.placementIds
      }
    };
  }
}

export { EventBuilder as eventBuilder };