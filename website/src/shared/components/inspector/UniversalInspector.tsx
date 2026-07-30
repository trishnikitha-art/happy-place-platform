/**
 * UniversalInspector - One inspector for all entity types
 * 
 * Can inspect:
 * - Object
 * - Projection
 * - Worker
 * - Mission
 * - Capability
 * - Analytics
 * - Events
 * 
 * Uses ObjectInspector as the base rendering engine.
 */

"use client";

import { useState } from 'react';
import { ObjectInspector } from './ObjectInspector';
import { ProjectionInspector } from './ProjectionInspector';
import { EvidenceInspector } from './EvidenceInspector';

export type InspectableType = 
  | 'object'
  | 'projection'
  | 'worker'
  | 'mission'
  | 'capability'
  | 'analytics'
  | 'event'
  | 'evidence';

interface UniversalInspectorProps {
  data: any;
  type?: InspectableType;
  name?: string;
  defaultExpanded?: boolean;
}

export function UniversalInspector({ 
  data, 
  type = 'object', 
  name = 'Inspector',
  defaultExpanded = false 
}: UniversalInspectorProps) {
  const [selectedType, setSelectedType] = useState<InspectableType>(type);

  // Auto-detect type if not provided
  const detectedType = detectType(data);
  const effectiveType = type === 'object' ? detectedType : selectedType;

  return (
    <div className="border border-border rounded p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{name}</h3>
        <select
          value={effectiveType}
          onChange={(e) => setSelectedType(e.target.value as InspectableType)}
          className="px-3 py-2 border border-border rounded bg-surface text-sm"
        >
          <option value="object">Object</option>
          <option value="projection">Projection</option>
          <option value="worker">Worker</option>
          <option value="mission">Mission</option>
          <option value="capability">Capability</option>
          <option value="analytics">Analytics</option>
          <option value="event">Event</option>
          <option value="evidence">Evidence</option>
        </select>
      </div>

      {renderInspector(effectiveType, data, name, defaultExpanded)}
    </div>
  );
}

function detectType(data: any): InspectableType {
  if (!data) return 'object';
  
  // Projection detection
  if (data.projection || data.sources || data.generatedAt) {
    return 'projection';
  }
  
  // Evidence detection
  if (data.observations || data.classifications || data.recommendations) {
    return 'evidence';
  }
  
  // Event detection
  if (data.eventType || data.causality || data.objectId) {
    return 'event';
  }
  
  // Mission detection
  if (data.missionId || data.workers || data.steps) {
    return 'mission';
  }
  
  // Worker detection
  if (data.workerId || data.chain || data.dependencies) {
    return 'worker';
  }
  
  // Capability detection
  if (data.owns || data.capabilities || data.version) {
    return 'capability';
  }
  
  // Analytics detection
  if (data.metrics || data.facts || data.dimensions || data.aggregations) {
    return 'analytics';
  }
  
  return 'object';
}

function renderInspector(
  type: InspectableType,
  data: any,
  name: string,
  defaultExpanded: boolean
): React.ReactNode {
  switch (type) {
    case 'projection':
      return <ProjectionInspector projection={data} name={name} defaultExpanded={defaultExpanded} />;
    
    case 'evidence':
      return <EvidenceInspector evidence={data} name={name} defaultExpanded={defaultExpanded} />;
    
    case 'event':
      return renderEventInspector(data, name, defaultExpanded);
    
    case 'mission':
      return renderMissionInspector(data, name, defaultExpanded);
    
    case 'worker':
      return renderWorkerInspector(data, name, defaultExpanded);
    
    case 'capability':
      return renderCapabilityInspector(data, name, defaultExpanded);
    
    case 'analytics':
      return renderAnalyticsInspector(data, name, defaultExpanded);
    
    default:
      return <ObjectInspector data={data} name={name} defaultExpanded={defaultExpanded} />;
  }
}

function renderEventInspector(data: any, name: string, defaultExpanded: boolean): React.ReactNode {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.id && (
          <div>
            <span className="text-text-muted">ID:</span>
            <span className="ml-2">{data.id}</span>
          </div>
        )}
        {data.type && (
          <div>
            <span className="text-text-muted">Type:</span>
            <span className="ml-2">{data.type}</span>
          </div>
        )}
        {data.objectType && (
          <div>
            <span className="text-text-muted">Object:</span>
            <span className="ml-2">{data.objectType}</span>
          </div>
        )}
        {data.objectId && (
          <div>
            <span className="text-text-muted">Object ID:</span>
            <span className="ml-2">{data.objectId}</span>
          </div>
        )}
        {data.timestamp && (
          <div className="col-span-2">
            <span className="text-text-muted">Timestamp:</span>
            <span className="ml-2">{new Date(data.timestamp).toLocaleString()}</span>
          </div>
        )}
      </div>
      
      {data.causality && (
        <div>
          <h4 className="text-sm font-medium mb-2">Causality</h4>
          <ObjectInspector data={data.causality} name="causality" defaultExpanded={false} />
        </div>
      )}
      
      <div>
        <h4 className="text-sm font-medium mb-2">Event Data</h4>
        <ObjectInspector data={data.data} name="data" defaultExpanded={defaultExpanded} />
      </div>
    </div>
  );
}

function renderMissionInspector(data: any, name: string, defaultExpanded: boolean): React.ReactNode {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.missionId && (
          <div>
            <span className="text-text-muted">Mission ID:</span>
            <span className="ml-2">{data.missionId}</span>
          </div>
        )}
        {data.type && (
          <div>
            <span className="text-text-muted">Type:</span>
            <span className="ml-2">{data.type}</span>
          </div>
        )}
        {data.status && (
          <div>
            <span className="text-text-muted">Status:</span>
            <span className="ml-2">{data.status}</span>
          </div>
        )}
        {data.priority && (
          <div>
            <span className="text-text-muted">Priority:</span>
            <span className="ml-2">{data.priority}</span>
          </div>
        )}
      </div>
      
      <ObjectInspector data={data} name="mission" defaultExpanded={defaultExpanded} />
    </div>
  );
}

function renderWorkerInspector(data: any, name: string, defaultExpanded: boolean): React.ReactNode {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.workerId && (
          <div>
            <span className="text-text-muted">Worker ID:</span>
            <span className="ml-2">{data.workerId}</span>
          </div>
        )}
        {data.type && (
          <div>
            <span className="text-text-muted">Type:</span>
            <span className="ml-2">{data.type}</span>
          </div>
        )}
        {data.status && (
          <div>
            <span className="text-text-muted">Status:</span>
            <span className="ml-2">{data.status}</span>
          </div>
        )}
        {data.progress !== undefined && (
          <div>
            <span className="text-text-muted">Progress:</span>
            <span className="ml-2">{data.progress}%</span>
          </div>
        )}
      </div>
      
      {data.dependencies && (
        <div>
          <h4 className="text-sm font-medium mb-2">Dependencies</h4>
          <ObjectInspector data={data.dependencies} name="dependencies" defaultExpanded={false} />
        </div>
      )}
      
      <ObjectInspector data={data} name="worker" defaultExpanded={defaultExpanded} />
    </div>
  );
}

function renderCapabilityInspector(data: any, name: string, defaultExpanded: boolean): React.ReactNode {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.id && (
          <div>
            <span className="text-text-muted">ID:</span>
            <span className="ml-2">{data.id}</span>
          </div>
        )}
        {data.name && (
          <div>
            <span className="text-text-muted">Name:</span>
            <span className="ml-2">{data.name}</span>
          </div>
        )}
        {data.status && (
          <div>
            <span className="text-text-muted">Status:</span>
            <span className="ml-2">{data.status}</span>
          </div>
        )}
        {data.version && (
          <div>
            <span className="text-text-muted">Version:</span>
            <span className="ml-2">{data.version}</span>
          </div>
        )}
      </div>
      
      {data.owns && (
        <div>
          <h4 className="text-sm font-medium mb-2">Owns</h4>
          <div className="flex flex-wrap gap-2">
            {data.owns.map((owned: string, index: number) => (
              <span key={index} className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                {owned}
              </span>
            ))}
          </div>
        </div>
      )}
      
      <ObjectInspector data={data} name="capability" defaultExpanded={defaultExpanded} />
    </div>
  );
}

function renderAnalyticsInspector(data: any, name: string, defaultExpanded: boolean): React.ReactNode {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 text-sm">
        {data.analytics?.id && (
          <div>
            <span className="text-text-muted">ID:</span>
            <span className="ml-2">{data.analytics.id}</span>
          </div>
        )}
        {data.analytics?.type && (
          <div>
            <span className="text-text-muted">Type:</span>
            <span className="ml-2">{data.analytics.type}</span>
          </div>
        )}
        {data.analytics?.period && (
          <div className="col-span-2">
            <span className="text-text-muted">Period:</span>
            <span className="ml-2">{data.analytics.period}</span>
          </div>
        )}
      </div>
      
      {data.metrics && data.metrics.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Metrics ({data.metrics.length})</h4>
          <ObjectInspector data={data.metrics} name="metrics" defaultExpanded={false} />
        </div>
      )}
      
      {data.aggregations && data.aggregations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Aggregations ({data.aggregations.length})</h4>
          <ObjectInspector data={data.aggregations} name="aggregations" defaultExpanded={false} />
        </div>
      )}
      
      {data.forecasts && data.forecasts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Forecasts ({data.forecasts.length})</h4>
          <ObjectInspector data={data.forecasts} name="forecasts" defaultExpanded={false} />
        </div>
      )}
      
      <ObjectInspector data={data} name="analytics" defaultExpanded={defaultExpanded} />
    </div>
  );
}
