/**
 * Command Pattern System
 * 
 * Constitutional Law 5: Placement Graph Owns Layout
 * Constitutional Law 9: Every Edit Is A Command
 * 
 * Every operation becomes a command that is:
 * - replayable
 * - undoable
 * - auditable
 * 
 * Commands never mutate state directly - they produce events.
 * Command IDs are deterministic (sequence-based, not time-based).
 */

export interface Command {
  id: string;
  type: CommandType;
  sequence: number;
  userId?: string;
}

export type CommandType =
  | 'ReplaceAsset'
  | 'MovePlacement'
  | 'SwapPlacement'
  | 'DeletePlacement'
  | 'DuplicatePlacement'
  | 'CropAsset'
  | 'AdjustFocalPoint'
  | 'UpdateSlotConstraints'
  | 'PublishStaged';

export interface ReplaceAssetCommand extends Command {
  type: 'ReplaceAsset';
  slotId: string;
  newAssetId: string;
}

export interface MovePlacementCommand extends Command {
  type: 'MovePlacement';
  placementId: string;
  newSlotId: string;
}

export interface SwapPlacementCommand extends Command {
  type: 'SwapPlacement';
  placementId1: string;
  placementId2: string;
}

export interface DeletePlacementCommand extends Command {
  type: 'DeletePlacement';
  placementId: string;
}

export interface DuplicatePlacementCommand extends Command {
  type: 'DuplicatePlacement';
  sourcePlacementId: string;
  targetSlotId: string;
}

export interface CropAssetCommand extends Command {
  type: 'CropAsset';
  assetId: string;
  newCrop: CropRegion;
}

export interface AdjustFocalPointCommand extends Command {
  type: 'AdjustFocalPoint';
  assetId: string;
  newFocalPoint: FocalPoint;
}

export interface UpdateSlotConstraintsCommand extends Command {
  type: 'UpdateSlotConstraints';
  slotId: string;
  newConstraints: SlotConstraints;
}

export interface PublishStagedCommand extends Command {
  type: 'PublishStaged';
}

export type AnyCommand = 
  | ReplaceAssetCommand
  | MovePlacementCommand
  | SwapPlacementCommand
  | DeletePlacementCommand
  | DuplicatePlacementCommand
  | CropAssetCommand
  | AdjustFocalPointCommand
  | UpdateSlotConstraintsCommand
  | PublishStagedCommand;

// Canonical value objects
export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FocalPoint {
  x: number;
  y: number;
}

export interface SlotConstraints {
  aspectRatio: string;
  responsive: boolean;
  focalPointEnabled: boolean;
  minWidth: number;
  compressionPreset: string;
}

/**
 * Command Builder
 * Type-safe command creation with deterministic IDs
 */
class CommandBuilder {
  private static sequence = 0;

  private static nextSequence(): number {
    return ++CommandBuilder.sequence;
  }

  static generateId(sequence: number): string {
    return `cmd_${sequence}`;
  }

  static replaceAsset(params: {
    slotId: string;
    newAssetId: string;
  }): ReplaceAssetCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'ReplaceAsset',
      sequence,
      ...params
    };
  }

  static movePlacement(params: {
    placementId: string;
    newSlotId: string;
  }): MovePlacementCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'MovePlacement',
      sequence,
      ...params
    };
  }

  static swapPlacement(params: {
    placementId1: string;
    placementId2: string;
  }): SwapPlacementCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'SwapPlacement',
      sequence,
      ...params
    };
  }

  static deletePlacement(params: {
    placementId: string;
  }): DeletePlacementCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'DeletePlacement',
      sequence,
      ...params
    };
  }

  static duplicatePlacement(params: {
    sourcePlacementId: string;
    targetSlotId: string;
  }): DuplicatePlacementCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'DuplicatePlacement',
      sequence,
      ...params
    };
  }

  static cropAsset(params: {
    assetId: string;
    newCrop: CropRegion;
  }): CropAssetCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'CropAsset',
      sequence,
      ...params
    };
  }

  static adjustFocalPoint(params: {
    assetId: string;
    newFocalPoint: FocalPoint;
  }): AdjustFocalPointCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'AdjustFocalPoint',
      sequence,
      ...params
    };
  }

  static updateSlotConstraints(params: {
    slotId: string;
    newConstraints: SlotConstraints;
  }): UpdateSlotConstraintsCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'UpdateSlotConstraints',
      sequence,
      ...params
    };
  }

  static publishStaged(): PublishStagedCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'PublishStaged',
      sequence
    };
  }
}

/**
 * Command Executor
 * Executes commands and produces events
 * Never mutates state directly - only produces events
 */
class CommandExecutor {
  private static instance: CommandExecutor;

  private constructor() {}

  static getInstance(): CommandExecutor {
    if (!CommandExecutor.instance) {
      CommandExecutor.instance = new CommandExecutor();
    }
    return CommandExecutor.instance;
  }

  /**
   * Execute a command and produce events
   * Constitutional Law 10: Commands Produce Events
   */
  async execute(command: AnyCommand): Promise<void> {
    console.log('Executing command:', command);
    
    // Produce corresponding event
    const event = this.commandToEvent(command);
    
    // Emit event to event system
    const { eventSystem } = await import('./event-system');
    await eventSystem.emit(event);
  }

  /**
   * Convert command to event
   * Events contain only forward-looking state (no old* fields)
   */
  private commandToEvent(command: AnyCommand): any {
    // Lazy import to avoid circular dependency
    const { eventBuilder } = require('./event-system');
    
    switch (command.type) {
      case 'ReplaceAsset':
        return eventBuilder.assetReplaced({
          commandId: command.id,
          slotId: command.slotId,
          newAssetId: command.newAssetId
        });
      case 'MovePlacement':
        return eventBuilder.placementMoved({
          commandId: command.id,
          placementId: command.placementId,
          newSlotId: command.newSlotId
        });
      case 'DeletePlacement':
        return eventBuilder.placementDeleted({
          commandId: command.id,
          placementId: command.placementId
        });
      case 'AdjustFocalPoint':
        return eventBuilder.focalPointAdjusted({
          commandId: command.id,
          assetId: command.assetId,
          newFocalPoint: command.newFocalPoint
        });
      default:
        throw new Error(`Unsupported command type: ${command.type}`);
    }
  }

  /**
   * Undo is a new command, not magical mutation
   * For event sourcing, undo creates new events
   */
  async undo(command: AnyCommand): Promise<void> {
    console.log('Undo via new command (not implemented yet)');
    // TODO: Implement undo as new command producing events
  }

  /**
   * Redo is a new command, not magical mutation
   */
  async redo(command: AnyCommand): Promise<void> {
    console.log('Redo via new command (not implemented yet)');
    // TODO: Implement redo as new command producing events
  }
}

export const commandExecutor = CommandExecutor.getInstance();
export { CommandBuilder as commandBuilder };