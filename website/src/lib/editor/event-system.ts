/**
 * Event System
 * 
 * Constitutional Law 10: Commands Produce Events
 * 
 * Commands never write storage directly.
 * Commands produce events that update projections.
 * 
 * Event flow:
 * Command → Event → Projection → Runtime
 */

export interface Event {
  id: string;
  type: EventType;
  timestamp: number;
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
  | 'BatchCompleted';

export interface AssetReplacedEvent extends Event {
  type: 'AssetReplaced';
  data: {
    slotId: string;
    oldAssetId: string | null;
    newAssetId: string;
  };
}

export interface PlacementMovedEvent extends Event {
  type: 'PlacementMoved';
  data: {
    placementId: string;
    oldSlotId: string;
    newSlotId: string;
  };
}

export interface PlacementSwappedEvent extends Event {
  type: 'PlacementSwapped';
  data: {
    placementId1: string;
    placementId2: string;
  };
}

export interface PlacementDeletedEvent extends Event {
  type: 'PlacementDeleted';
  data: {
    placementId: string;
  };
}

export interface PlacementDuplicatedEvent extends Event {
  type: 'PlacementDuplicated';
  data: {
    sourcePlacementId: string;
    newPlacementId: string;
    targetSlotId: string;
  };
}

export interface AssetCroppedEvent extends Event {
  type: 'AssetCropped';
  data: {
    assetId: string;
    oldCrop: any;
    newCrop: any;
  };
}

export interface FocalPointAdjustedEvent extends Event {
  type: 'FocalPointAdjusted';
  data: {
    assetId: string;
    oldFocalPoint: { x: number; y: number } | null;
    newFocalPoint: { x: number; y: number };
  };
}

export interface SlotConstraintsUpdatedEvent extends Event {
  type: 'SlotConstraintsUpdated';
  data: {
    slotId: string;
    oldConstraints: any;
    newConstraints: any;
  };
}

export interface BatchCompletedEvent extends Event {
  type: 'BatchCompleted';
  data: {
    commandIds: string[];
  };
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
  | BatchCompletedEvent;

/**
 * Event Listener
 */
type EventListener = (event: AnyEvent) => void | Promise<void>;

/**
 * Event System
 * Central event bus for editor events
 */
class EventSystem {
  private static instance: EventSystem;
  private listeners: Map<EventType, Set<EventListener>> = new Map();
  private eventHistory: Event[] = [];

  private constructor() {}

  static getInstance(): EventSystem {
    if (!EventSystem.instance) {
      EventSystem.instance = new EventSystem();
    }
    return EventSystem.instance;
  }

  /**
   * Emit an event
   */
  async emit(event: AnyEvent): Promise<void> {
    // Add to history for replay/audit
    this.eventHistory.push(event);

    // Notify listeners
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      for (const listener of listeners) {
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

  /**
   * Get event history
   */
  getHistory(): Event[] {
    return [...this.eventHistory];
  }

  /**
   * Clear history
   */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /**
   * Replay events from history
   * Useful for rebuilding editor state
   */
  async replay(fromTimestamp?: number): Promise<void> {
    const events = fromTimestamp
      ? this.eventHistory.filter(e => e.timestamp >= fromTimestamp)
      : this.eventHistory;

    for (const event of events) {
      await this.emit(event);
    }
  }
}

export const eventSystem = EventSystem.getInstance();

/**
 * Event Builder
 * Type-safe event creation
 */
export class EventBuilder {
  private static generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static assetReplaced(params: {
    commandId: string;
    slotId: string;
    oldAssetId: string | null;
    newAssetId: string;
  }): AssetReplacedEvent {
    return {
      id: this.generateId(),
      type: 'AssetReplaced',
      timestamp: Date.now(),
      commandId: params.commandId,
      data: {
        slotId: params.slotId,
        oldAssetId: params.oldAssetId,
        newAssetId: params.newAssetId
      }
    };
  }

  static placementMoved(params: {
    commandId: string;
    placementId: string;
    oldSlotId: string;
    newSlotId: string;
  }): PlacementMovedEvent {
    return {
      id: this.generateId(),
      type: 'PlacementMoved',
      timestamp: Date.now(),
      commandId: params.commandId,
      data: {
        placementId: params.placementId,
        oldSlotId: params.oldSlotId,
        newSlotId: params.newSlotId
      }
    };
  }

  static placementDeleted(params: {
    commandId: string;
    placementId: string;
  }): PlacementDeletedEvent {
    return {
      id: this.generateId(),
      type: 'PlacementDeleted',
      timestamp: Date.now(),
      commandId: params.commandId,
      data: {
        placementId: params.placementId
      }
    };
  }

  static focalPointAdjusted(params: {
    commandId: string;
    assetId: string;
    oldFocalPoint: { x: number; y: number } | null;
    newFocalPoint: { x: number; y: number };
  }): FocalPointAdjustedEvent {
    return {
      id: this.generateId(),
      type: 'FocalPointAdjusted',
      timestamp: Date.now(),
      commandId: params.commandId,
      data: {
        assetId: params.assetId,
        oldFocalPoint: params.oldFocalPoint,
        newFocalPoint: params.newFocalPoint
      }
    };
  }
}