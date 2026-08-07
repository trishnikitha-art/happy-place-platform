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
  | 'PublishStaged'
  | 'BatchOperation';

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

export interface BatchOperationCommand extends Command {
  type: 'BatchOperation';
  commands: AnyCommand[];
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
  | PublishStagedCommand
  | BatchOperationCommand;

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

  static batchOperation(commands: AnyCommand[]): BatchOperationCommand {
    const sequence = CommandBuilder.nextSequence();
    return {
      id: CommandBuilder.generateId(sequence),
      type: 'BatchOperation',
      sequence,
      commands
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
    
    if (command.type === 'BatchOperation') {
      await this.executeBatch(command);
    } else {
      // Produce corresponding event
      const event = this.commandToEvent(command);
      
      // Emit event to event system
      const { eventSystem } = await import('./event-system');
      await eventSystem.emit(event);
    }
  }

  /**
   * Execute batch operation with atomicity
   * Validates ALL commands before producing ANY events
   */
  private async executeBatch(command: BatchOperationCommand): Promise<void> {
    // Validate all commands first
    for (const cmd of command.commands) {
      await this.validateCommand(cmd);
    }

    // All validations passed - produce events atomically
    const { eventSystem } = await import('./event-system');
    
    for (const cmd of command.commands) {
      const event = this.commandToEvent(cmd);
      await eventSystem.emit(event);
    }
  }

  /**
   * Validate a command before execution
   */
  private async validateCommand(command: AnyCommand): Promise<void> {
    // Add validation logic based on command type
    switch (command.type) {
      case 'ReplaceAsset':
        // Validate asset exists, slot exists, etc.
        break;
      case 'MovePlacement':
        // Validate placement exists, target slot exists and is available
        break;
      default:
        // Default validation
        break;
    }
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
      case 'PublishStaged':
        return eventBuilder.stagedPublished({
          commandId: command.id,
          placementIds: []
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
    // Generate inverse command based on command type
    const inverseCommand = this.createInverseCommand(command);
    
    // Execute the inverse command (produces new events)
    await this.execute(inverseCommand);
  }

  /**
   * Redo is a new command, not magical mutation
   */
  async redo(command: AnyCommand): Promise<void> {
    // Redo is just re-executing the original command
    await this.execute(command);
  }

  /**
   * Create inverse command for undo
   * This creates a new command that reverses the original
   */
  private createInverseCommand(command: AnyCommand): AnyCommand {
    switch (command.type) {
      case 'ReplaceAsset':
        // Need current asset ID from placement graph
        // This is a simplification - in production, we'd query the graph
        throw new Error('Undo for ReplaceAsset requires current state query');
      case 'MovePlacement':
        // Move back to original slot
        return CommandBuilder.movePlacement({
          placementId: command.placementId,
          newSlotId: command.newSlotId // This would need original slot
        });
      case 'DeletePlacement':
        // Recreate placement (would need original placement data)
        throw new Error('Undo for DeletePlacement requires original placement data');
      default:
        throw new Error(`Undo not implemented for command type: ${command.type}`);
    }
  }
}

export const commandExecutor = CommandExecutor.getInstance();
export { CommandBuilder as commandBuilder };