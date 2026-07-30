/**
 * EvidenceViewer - Orchestration primitive for viewing agent evidence
 * 
 * Displays observations, classifications, recommendations, and sources.
 * Every capability should emit evidence, and the frontend should have evidence viewers built in.
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AgentProjection } from "../projection/agent-projection";

interface EvidenceViewerProps {
  agent: AgentProjection;
}

export function EvidenceViewer({ agent }: EvidenceViewerProps) {
  const { evidence } = agent;
  if (!evidence) return null;

  const { observations, classifications, recommendations, sources } = evidence;

  return (
    <div className="space-y-6">
      {/* Observations */}
      {observations.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Observations</h3>
            <span className="text-sm text-text-muted">{observations.length} observations</span>
          </div>
          <div className="space-y-3">
            {observations.map((obs, index) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{obs.type}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(obs.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      obs.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                      obs.confidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(obs.confidence * 100)}%
                    </span>
                  </div>
                </div>
                <div className="text-xs text-text-muted">
                  <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                    {JSON.stringify(obs.data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Classifications */}
      {classifications.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Classifications</h3>
            <span className="text-sm text-text-muted">{classifications.length} classifications</span>
          </div>
          <div className="space-y-3">
            {classifications.map((cls, index) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{cls.type}</span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {cls.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(cls.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      cls.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                      cls.confidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(cls.confidence * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Recommendations</h3>
            <span className="text-sm text-text-muted">{recommendations.length} recommendations</span>
          </div>
          <div className="space-y-3">
            {recommendations.map((rec, index) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{rec.action}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted">
                      {new Date(rec.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      rec.confidence > 0.8 ? 'bg-green-100 text-green-800' :
                      rec.confidence > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(rec.confidence * 100)}%
                    </span>
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
      {sources.length > 0 && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Evidence Sources</h3>
            <span className="text-sm text-text-muted">{sources.length} sources</span>
          </div>
          <div className="space-y-3">
            {sources.map((source, index) => (
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
