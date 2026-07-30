/**
 * ProjectionInspector - Reusable projection inspector component
 * 
 * Specialized inspector for projections with:
 * - Source visualization
 * - Data inspection
 * - Metadata display
 * - Timestamp tracking
 */

"use client";

import { ObjectInspector } from './ObjectInspector';

interface ProjectionInspectorProps {
  projection: any;
  name?: string;
  defaultExpanded?: boolean;
}

export function ProjectionInspector({ projection, name = 'Projection', defaultExpanded = false }: ProjectionInspectorProps) {
  return (
    <div className="border border-border rounded p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{name}</h3>
        {projection.generatedAt && (
          <span className="text-xs text-text-muted">
            Generated: {new Date(projection.generatedAt).toLocaleString()}
          </span>
        )}
      </div>

      {/* Sources */}
      {projection.sources && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Sources</h4>
          <div className="flex flex-wrap gap-2">
            {projection.sources.map((source: string, index: number) => (
              <span key={index} className="px-2 py-1 rounded text-xs bg-blue-50 text-blue-700">
                {source}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Type/Object */}
      <div className="mb-4 grid grid-cols-2 gap-2 text-sm">
        {projection.type && (
          <div>
            <span className="text-text-muted">Type:</span>
            <span className="ml-2">{projection.type}</span>
          </div>
        )}
        {projection.object && (
          <div>
            <span className="text-text-muted">Object:</span>
            <span className="ml-2">{projection.object}</span>
          </div>
        )}
      </div>

      {/* Full Data */}
      <div>
        <h4 className="text-sm font-medium mb-2">Data</h4>
        <ObjectInspector data={projection.data || projection} name="data" defaultExpanded={defaultExpanded} />
      </div>
    </div>
  );
}
