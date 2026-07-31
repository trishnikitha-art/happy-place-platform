/**
 * Agent Memory Projection - Composed projection for agent memory
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 */

export interface AgentMemoryProjection {
  shortTerm: MemoryItem[];
  longTerm: MemoryItem[];
  workingMemory: MemoryItem[];
}

export interface MemoryItem {
  key: string;
  value: any;
  timestamp: string;
  ttl?: number;
  accessCount?: number;
  lastAccessed?: string;
}

export interface MemoryStats {
  totalItems: number;
  shortTermCount: number;
  longTermCount: number;
  workingMemoryCount: number;
  totalSize: number;
}
