/**
 * ProjectionBase - Common base interface for all projections
 * 
 * Every projection extends this base, enabling the Explorer to render
 * every projection without custom code.
 * 
 * This is a huge win for consistency.
 */

export interface ProjectionId {
  type: string;
  version: string;
  id: string;
}

export interface TimeWindow {
  start: string;
  end: string;
  granularity: 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'quarter' | 'year';
}

export interface ProjectionSummary {
  count: number;
  generatedAt: string;
  window: TimeWindow;
  metadata?: Record<string, any>;
}

export interface Projection<T> {
  id: ProjectionId;
  generatedAt: string;
  window: TimeWindow;
  summary: ProjectionSummary;
  items: T[];
}

// Type guards for projection identification
export function isProjection(obj: any): obj is Projection<any> {
  return obj && 
    typeof obj === 'object' &&
    'id' in obj &&
    'generatedAt' in obj &&
    'window' in obj &&
    'summary' in obj &&
    'items' in obj &&
    Array.isArray(obj.items);
}

export function getProjectionType(projection: Projection<any>): string {
  return projection.id.type;
}

export function getProjectionVersion(projection: Projection<any>): string {
  return projection.id.version;
}

// Helper to create projection IDs
export function createProjectionId(type: string, id: string, version: string = '1.0.0'): ProjectionId {
  return { type, version, id };
}

// Helper to create time windows
export function createTimeWindow(
  start: string, 
  end: string, 
  granularity: TimeWindow['granularity'] = 'day'
): TimeWindow {
  return { start, end, granularity };
}

// Helper to create projection summaries
export function createProjectionSummary(count: number, window: TimeWindow, metadata?: Record<string, any>): ProjectionSummary {
  return {
    count,
    generatedAt: new Date().toISOString(),
    window,
    metadata
  };
}

// Helper to create projections
export function createProjection<T>(
  type: string,
  id: string,
  items: T[],
  window: TimeWindow,
  version: string = '1.0.0',
  metadata?: Record<string, any>
): Projection<T> {
  return {
    id: createProjectionId(type, id, version),
    generatedAt: new Date().toISOString(),
    window,
    summary: createProjectionSummary(items.length, window, metadata),
    items
  };
}
