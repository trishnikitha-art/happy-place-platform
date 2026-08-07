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
import { SlotConstraints } from './command-pattern';

export interface Event {
  id: string;
  type: EventType;
  sequence: number;
  commandId: string;
}

// Discriminated union for event data
export interface EventData {
  AssetReplaced: {
    slotId: string;
    newAssetId: string;
  };
  PlacementMoved: {
    placementId: string;
    newSlotId: string;
  };
  PlacementSwapped: {
    placementId1: string;
    placementId2: string;
  };
  PlacementDeleted: {
    placementId: string;
  };
  PlacementDuplicated: {
    sourcePlacementId: string;
    newPlacementId: string;
    targetSlotId: string;
  };
  AssetCropped: {
    assetId: string;
    newCrop: { x: number; y: number; width: number; height: number };
  };
  FocalPointAdjusted: {
    assetId: string;
    newFocalPoint: { x: number; y: number };
  };
  SlotConstraintsUpdated: {
    slotId: string;
    newConstraints: SlotConstraints;
  };
  StagedPublished: {
    placementIds: string[];
  };
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
  data: EventData['AssetReplaced'];
}

export interface PlacementMovedEvent extends Event {
  type: 'PlacementMoved';
  data: EventData['PlacementMoved'];
}

export interface PlacementDeletedEvent extends Event {
  type: 'PlacementDeleted';
  data: EventData['PlacementDeleted'];
}

export interface PlacementSwappedEvent extends Event {
  type: 'PlacementSwapped';
  data: EventData['PlacementSwapped'];
}

export interface PlacementDuplicatedEvent extends Event {
  type: 'PlacementDuplicated';
  data: EventData['PlacementDuplicated'];
}

export interface AssetCroppedEvent extends Event {
  type: 'AssetCropped';
  data: EventData['AssetCropped'];
}

export interface SlotConstraintsUpdatedEvent extends Event {
  type: 'SlotConstraintsUpdated';
  data: EventData['SlotConstraintsUpdated'];
}

export interface FocalPointAdjustedEvent extends Event {
  type: 'FocalPointAdjusted';
  data: EventData['FocalPointAdjusted'];
}

export interface StagedPublishedEvent extends Event {
  type: 'StagedPublished';
  data: EventData['StagedPublished'];
}

export type AnyEvent = 
  | AssetReplacedEvent
  | PlacementMovedEvent
  | PlacementSwappedEvent
  | PlacementDeletedEvent
  | PlacementDuplicatedEvent
  | AssetCroppedEvent
  | FocalPointAdjustedEvent
  | SlotConstraintsUpdatedEvent
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

  appendAll(events: Event[]): void {
    this.events.push(...events);
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

  /**
   * Generate next sequence number
   * Exposed for EventBuilder to use for deterministic event IDs
   */
  nextSequence(): number {
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
      case 'PlacementSwapped':
        await this.applyPlacementSwapped(event as PlacementSwappedEvent, placementGraph);
        break;
      case 'PlacementDeleted':
        await this.applyPlacementDeleted(event as PlacementDeletedEvent, placementGraph);
        break;
      case 'PlacementDuplicated':
        await this.applyPlacementDuplicated(event as PlacementDuplicatedEvent, placementGraph, slotRegistry);
        break;
      case 'AssetCropped':
        await this.applyAssetCropped(event as AssetCroppedEvent, placementGraph);
        break;
      case 'FocalPointAdjusted':
        await this.applyFocalPointAdjusted(event as FocalPointAdjustedEvent, placementGraph);
        break;
      case 'SlotConstraintsUpdated':
        await this.applySlotConstraintsUpdated(event as SlotConstraintsUpdatedEvent, slotRegistry);
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

  private async applyPlacementSwapped(event: PlacementSwappedEvent, placementGraph: any): Promise<void> {
    // Swap placement slots
    const placement1 = placementGraph.getPlacement(event.data.placementId1);
    const placement2 = placementGraph.getPlacement(event.data.placementId2);
    
    if (placement1 && placement2) {
      const slot1 = placement1.slotId;
      const slot2 = placement2.slotId;
      
      placementGraph.movePlacement(event.data.placementId1, slot2);
      placementGraph.movePlacement(event.data.placementId2, slot1);
    }
  }

  private async applyPlacementDeleted(event: PlacementDeletedEvent, placementGraph: any): Promise<void> {
    placementGraph.deletePlacement(event.data.placementId);
  }

  private async applyPlacementDuplicated(event: PlacementDuplicatedEvent, placementGraph: any, slotRegistry: any): Promise<void> {
    const sourcePlacement = placementGraph.getPlacement(event.data.sourcePlacementId);
    if (sourcePlacement) {
      const slot = slotRegistry.getSlot(event.data.targetSlotId);
      if (slot) {
        placementGraph.createPlacement({
          assetId: sourcePlacement.assetId,
          slotId: event.data.targetSlotId,
          pageId: slot.page,
          componentId: slot.component
        });
      }
    }
  }

  private async applyAssetCropped(event: AssetCroppedEvent, placementGraph: any): Promise<void> {
    // Update crop metadata on placements using this asset
    const placements = placementGraph.getPlacementsForAsset(event.data.assetId);
    for (const placement of placements) {
      if (placement.metadata) {
        placement.metadata.crop = event.data.newCrop;
      } else {
        placement.metadata = { crop: event.data.newCrop };
      }
    }
  }

  private async applyFocalPointAdjusted(event: FocalPointAdjustedEvent, placementGraph: any): Promise<void> {
    // Update focal point metadata on placements using this asset
    const placements = placementGraph.getPlacementsForAsset(event.data.assetId);
    for (const placement of placements) {
      if (placement.metadata) {
        placement.metadata.focalPoint = event.data.newFocalPoint;
      } else {
        placement.metadata = { focalPoint: event.data.newFocalPoint };
      }
    }
  }

  private async applySlotConstraintsUpdated(event: SlotConstraintsUpdatedEvent, slotRegistry: any): Promise<void> {
    // Update slot constraints in registry
    const slot = slotRegistry.getSlot(event.data.slotId);
    if (slot) {
      // Slot constraints are immutable once registered
      // This event would need to trigger a component re-registration
      // For now, this is a no-op in the registry
    }
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
    const sequence = eventSystem.nextSequence();
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
    const sequence = eventSystem.nextSequence();
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
    const sequence = eventSystem.nextSequence();
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

  static placementSwapped(params: {
    commandId: string;
    placementId1: string;
    placementId2: string;
  }): PlacementSwappedEvent {
    const sequence = eventSystem.nextSequence();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'PlacementSwapped',
      sequence,
      commandId: params.commandId,
      data: {
        placementId1: params.placementId1,
        placementId2: params.placementId2
      }
    };
  }

  static placementDuplicated(params: {
    commandId: string;
    sourcePlacementId: string;
    newPlacementId: string;
    targetSlotId: string;
  }): PlacementDuplicatedEvent {
    const sequence = eventSystem.nextSequence();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'PlacementDuplicated',
      sequence,
      commandId: params.commandId,
      data: {
        sourcePlacementId: params.sourcePlacementId,
        newPlacementId: params.newPlacementId,
        targetSlotId: params.targetSlotId
      }
    };
  }

  static assetCropped(params: {
    commandId: string;
    assetId: string;
    newCrop: { x: number; y: number; width: number; height: number };
  }): AssetCroppedEvent {
    const sequence = eventSystem.nextSequence();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'AssetCropped',
      sequence,
      commandId: params.commandId,
      data: {
        assetId: params.assetId,
        newCrop: params.newCrop
      }
    };
  }

  static slotConstraintsUpdated(params: {
    commandId: string;
    slotId: string;
    newConstraints: SlotConstraints;
  }): SlotConstraintsUpdatedEvent {
    const sequence = eventSystem.nextSequence();
    return {
      id: EventBuilder.generateId(sequence),
      type: 'SlotConstraintsUpdated',
      sequence,
      commandId: params.commandId,
      data: {
        slotId: params.slotId,
        newConstraints: params.newConstraints
      }
    };
  }

  static focalPointAdjusted(params: {
    commandId: string;
    assetId: string;
    newFocalPoint: { x: number; y: number };
  }): FocalPointAdjustedEvent {
    const sequence = eventSystem.nextSequence();
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
    const sequence = eventSystem.nextSequence();
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