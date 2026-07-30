/**
 * Connector Types - Shared types for all connectors
 * 
 * These types are used by all connector implementations.
 * No monolithic Connector interface - only capabilities needed.
 */

export interface ConnectorConfig {
  id: string;
  name: string;
  type: string;
  credentials: Record<string, any>;
  settings?: Record<string, any>;
}

export interface ReadOptions {
  fields?: string[];
  filter?: Record<string, any>;
  sort?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

export interface QueryOptions {
  parameters?: Record<string, any>;
}

export interface StreamCallback {
  (data: any, event: StreamEvent): void;
}

export type Unsubscribe = () => void;

export interface StreamEvent {
  type: 'created' | 'updated' | 'deleted';
  timestamp: string;
  id: string;
}

export interface WebhookEvent {
  type: string;
  payload: any;
  timestamp: string;
  signature?: string;
}

export interface Schema {
  resources: ResourceSchema[];
  version: string;
}

export interface ResourceSchema {
  name: string;
  fields: FieldSchema[];
  operations: string[];
}

export interface FieldSchema {
  name: string;
  type: string;
  required: boolean;
  readonly?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  lastCheck: string;
}

export interface ConnectorMetrics {
  requests: number;
  errors: number;
  latency: number;
  uptime: number;
}
