/**
 * EvidenceInspector - Reusable evidence inspector component
 * 
 * Specialized inspector for evidence with:
 * - Observations display
 * - Classifications display
 * - Recommendations display
 * - Sources display
 * - Confidence visualization
 */

"use client";

import { ObjectInspector } from './ObjectInspector';
import { ProgressBar } from '../ui/ProgressBar';

interface EvidenceInspectorProps {
  evidence: any;
  name?: string;
  defaultExpanded?: boolean;
}

export function EvidenceInspector({ evidence, name = 'Evidence', defaultExpanded = false }: EvidenceInspectorProps) {
  const { observations, classifications, recommendations, sources } = evidence;

  return (
    <div className="border border-border rounded p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{name}</h3>
        <span className="text-sm text-text-muted">
          {observations?.length || 0} obs, {classifications?.length || 0} cls, {recommendations?.length || 0} rec
        </span>
      </div>

      {/* Observations */}
      {observations && observations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Observations</h4>
          <div className="space-y-2">
            {observations.map((obs: any, index: number) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{obs.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(obs.timestamp).toLocaleTimeString()}
                    </span>
                    <ProgressBar value={obs.confidence * 100} size="sm" showLabel />
                  </div>
                </div>
                <ObjectInspector data={obs.data} name="data" defaultExpanded={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classifications */}
      {classifications && classifications.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Classifications</h4>
          <div className="space-y-2">
            {classifications.map((cls: any, index: number) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{cls.type}</span>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                      {cls.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(cls.timestamp).toLocaleTimeString()}
                    </span>
                    <ProgressBar value={cls.confidence * 100} size="sm" showLabel />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations && recommendations.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium mb-2">Recommendations</h4>
          <div className="space-y-2">
            {recommendations.map((rec: any, index: number) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{rec.action}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </span>
                    <ProgressBar value={rec.confidence * 100} size="sm" showLabel />
                  </div>
                </div>
                <div className="text-sm text-text-muted mb-2">
                  {rec.reasoning}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sources */}
      {sources && sources.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Evidence Sources</h4>
          <div className="space-y-2">
            {sources.map((source: any, index: number) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{source.source}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      Weight: {source.weight}
                    </span>
                    <span className="text-xs text-text-muted">
                      {new Date(source.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
