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
 */

export interface Command {
  id: string;
  type: CommandType;
  timestamp: number;
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
  | 'BatchOperation';

export interface ReplaceAssetCommand extends Command {
  type: 'ReplaceAsset';
  slotId: string;
  oldAssetId: string | null;
  newAssetId: string;
}

export interface MovePlacementCommand extends Command {
  type: 'MovePlacement';
  placementId: string;
  oldSlotId: string;
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
  deletedPlacement: any; // Store for undo
}

export interface DuplicatePlacementCommand extends Command {
  type: 'DuplicatePlacement';
  sourcePlacementId: string;
  newPlacementId: string;
  targetSlotId: string;
}

export interface CropAssetCommand extends Command {
  type: 'CropAsset';
  assetId: string;
  oldCrop: any;
  newCrop: any;
}

export interface AdjustFocalPointCommand extends Command {
  type: 'AdjustFocalPoint';
  assetId: string;
  oldFocalPoint: { x: number; y: number } | null;
  newFocalPoint: { x: number; y: number };
}

export interface UpdateSlotConstraintsCommand extends Command {
  type: 'UpdateSlotConstraints';
  slotId: string;
  oldConstraints: any;
  newConstraints: any;
}

export interface BatchOperationCommand extends Command {
  type: 'BatchOperation';
  commands: Command[];
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
  | BatchOperationCommand;

/**
 * Command Builder
 * Type-safe command creation
 */
export class CommandBuilder {
  private static generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static replaceAsset(params: {
    slotId: string;
    oldAssetId: string | null;
    newAssetId: string;
  }): ReplaceAssetCommand {
    return {
      id: this.generateId(),
      type: 'ReplaceAsset',
      timestamp: Date.now(),
      ...params
    };
  }

  static movePlacement(params: {
    placementId: string;
    oldSlotId: string;
    newSlotId: string;
  }): MovePlacementCommand {
    return {
      id: this.generateId(),
      type: 'MovePlacement',
      timestamp: Date.now(),
      ...params
    };
  }

  static swapPlacement(params: {
    placementId1: string;
    placementId2: string;
  }): SwapPlacementCommand {
    return {
      id: this.generateId(),
      type: 'SwapPlacement',
      timestamp: Date.now(),
      ...params
    };
  }

  static deletePlacement(params: {
    placementId: string;
    deletedPlacement: any;
  }): DeletePlacementCommand {
    return {
      id: this.generateId(),
      type: 'DeletePlacement',
      timestamp: Date.now(),
      ...params
    };
  }

  static duplicatePlacement(params: {
    sourcePlacementId: string;
    newPlacementId: string;
    targetSlotId: string;
  }): DuplicatePlacementCommand {
    return {
      id: this.generateId(),
      type: 'DuplicatePlacement',
      timestamp: Date.now(),
      ...params
    };
  }

  static cropAsset(params: {
    assetId: string;
    oldCrop: any;
    newCrop: any;
  }): CropAssetCommand {
    return {
      id: this.generateId(),
      type: 'CropAsset',
      timestamp: Date.now(),
      ...params
    };
  }

  static adjustFocalPoint(params: {
    assetId: string;
    oldFocalPoint: { x: number; y: number } | null;
    newFocalPoint: { x: number; y: number };
  }): AdjustFocalPointCommand {
    return {
      id: this.generateId(),
      type: 'AdjustFocalPoint',
      timestamp: Date.now(),
      ...params
    };
  }

  static updateSlotConstraints(params: {
    slotId: string;
    oldConstraints: any;
    newConstraints: any;
  }): UpdateSlotConstraintsCommand {
    return {
      id: this.generateId(),
      type: 'UpdateSlotConstraints',
      timestamp: Date.now(),
      ...params
    };
  }

  static batchOperation(commands: Command[]): BatchOperationCommand {
    return {
      id: this.generateId(),
      type: 'BatchOperation',
      timestamp: Date.now(),
      commands
    };
  }
}

/**
 * Command Executor
 * Executes commands and produces events
 */
export class CommandExecutor {
  private static instance: CommandExecutor;

  private constructor() {}

  static getInstance(): CommandExecutor {
    if (!CommandExecutor.instance) {
      CommandExecutor.instance = new CommandExecutor();
    }
    return CommandExecutor.instance;
  }

  /**
   * Execute a command and produce an event
   * Constitutional Law 10: Commands Produce Events
   */
  async execute(command: AnyCommand): Promise<void> {
    // This will emit an event that updates the placement graph
    // The placement graph projection then refreshes the runtime
    console.log('Executing command:', command);
    
    // TODO: Emit event to event system
    // await eventSystem.emit('command.executed', command);
  }

  /**
   * Undo a command
   */
  async undo(command: AnyCommand): Promise<void> {
    console.log('Undoing command:', command);
    // TODO: Implement undo logic
  }

  /**
   * Redo a command
   */
  async redo(command: AnyCommand): Promise<void> {
    console.log('Redoing command:', command);
    // TODO: Implement redo logic
  }
}

export const commandExecutor = CommandExecutor.getInstance();