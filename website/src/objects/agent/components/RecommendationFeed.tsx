/**
 * RecommendationFeed - Orchestration primitive for viewing agent recommendations
 * 
 * Displays agent recommendations with priority, confidence, reasoning, and impact.
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AgentProjection } from "../projection/agent-projection";

interface RecommendationFeedProps {
  agent: AgentProjection;
}

export function RecommendationFeed({ agent }: RecommendationFeedProps) {
  const { recommendations } = agent;
  if (!recommendations) return null;

  const { actions } = recommendations;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-100 text-green-800';
    if (confidence > 0.5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Recommendations</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">{actions.length} actions</span>
          {recommendations.prioritized && (
            <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
              Prioritized
            </span>
          )}
        </div>
      </div>

      {actions.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No recommendations
        </div>
      ) : (
        <div className="space-y-3">
          {actions.map((action, index) => (
            <div key={index} className="border border-border rounded p-4 bg-surface">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(action.priority)}`}>
                    {action.priority}
                  </span>
                  <span className="font-medium">{action.action}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getConfidenceColor(action.confidence)}`}>
                    {Math.round(action.confidence * 100)}%
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(recommendations.generatedAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              
              <div className="text-sm text-text-muted mb-3">
                {action.reasoning}
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border border-border rounded p-2 bg-surface">
                  <span className="text-text-muted">Estimated Impact:</span>
                  <span className="ml-2 font-medium">{action.estimatedImpact}</span>
                </div>
                <div className="border border-border rounded p-2 bg-surface">
                  <span className="text-text-muted">Estimated Effort:</span>
                  <span className="ml-2 font-medium">{action.estimatedEffort}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
