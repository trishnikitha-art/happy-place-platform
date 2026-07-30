/**
 * Connector Capabilities - Capability-based connector interface
 * 
 * Instead of one giant interface, connectors advertise what they support.
 * 
 * Capabilities:
 * - Readable: Can read data
 * - Writable: Can write data
 * - Queryable: Can execute queries
 * - Discoverable: Can discover schema
 * - Observable: Can stream/subscribe to changes
 * - Transformable: Can transform between formats
 * - Webhookable: Can receive webhooks
 * 
 * Example:
 * GoogleSheets implements Readable, Queryable, Discoverable
 * Stripe implements Readable, Writable, Webhookable
 * 
 * The runtime can ask:
 * - Can this connector stream?
 * - Can this connector write?
 * - Can this connector query?
 * 
 * without special cases.
 */

// Capability markers
export interface Readable {
  read<T>(resource: string, options?: ReadOptions): Promise<T[]>;
  readOne<T>(resource: string, id: string, options?: ReadOptions): Promise<T>;
}

export interface Writable {
  create<T>(resource: string, data: any): Promise<T>;
  update<T>(resource: string, id: string, data: any): Promise<T>;
  delete(resource: string, id: string): Promise<void>;
  upsert<T>(resource: string, data: any): Promise<T>;
}

export interface Queryable {
  query<T>(query: string, options?: QueryOptions): Promise<T[]>;
}

export interface Discoverable {
  discover(): Promise<Schema>;
  getResourceSchema(resource: string): Promise<ResourceSchema>;
}

export interface Observable {
  subscribe(resource: string, callback: StreamCallback): Unsubscribe;
  subscribeQuery(query: string, callback: StreamCallback): Unsubscribe;
}

export interface Transformable {
  transformToCanonical(data: any, resource: string): any;
  transformFromCanonical(data: any, resource: string): any;
}

export interface Webhookable {
  handleWebhook(event: WebhookEvent): Promise<void>;
  verifyWebhook(signature: string, payload: any): boolean;
}

// Supporting types
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

// Capability detection
export function isReadable(connector: any): connector is Readable {
  return connector && typeof connector.read === 'function' && typeof connector.readOne === 'function';
}

export function isWritable(connector: any): connector is Writable {
  return connector && 
    typeof connector.create === 'function' && 
    typeof connector.update === 'function' && 
    typeof connector.delete === 'function' &&
    typeof connector.upsert === 'function';
}

export function isQueryable(connector: any): connector is Queryable {
  return connector && typeof connector.query === 'function';
}

export function isDiscoverable(connector: any): connector is Discoverable {
  return connector && 
    typeof connector.discover === 'function' && 
    typeof connector.getResourceSchema === 'function';
}

export function isObservable(connector: any): connector is Observable {
  return connector && 
    typeof connector.subscribe === 'function' && 
    typeof connector.subscribeQuery === 'function';
}

export function isTransformable(connector: any): connector is Transformable {
  return connector && 
    typeof connector.transformToCanonical === 'function' && 
    typeof connector.transformFromCanonical === 'function';
}

export function isWebhookable(connector: any): connector is Webhookable {
  return connector && 
    typeof connector.handleWebhook === 'function' && 
    typeof connector.verifyWebhook === 'function';
}

// Capability advertisement
export interface ConnectorCapabilities {
  readable: boolean;
  writable: boolean;
  queryable: boolean;
  discoverable: boolean;
  observable: boolean;
  transformable: boolean;
  webhookable: boolean;
}

export function getConnectorCapabilities(connector: any): ConnectorCapabilities {
  return {
    readable: isReadable(connector),
    writable: isWritable(connector),
    queryable: isQueryable(connector),
    discoverable: isDiscoverable(connector),
    observable: isObservable(connector),
    transformable: isTransformable(connector),
    webhookable: isWebhookable(connector)
  };
}
