/**
 * ExecutionTimeline - Orchestration primitive for execution timeline visualization
 * 
 * Displays execution timeline with events, timestamps, and durations.
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AgentProjection } from "../projection/agent-projection";

interface ExecutionTimelineProps {
  agent: AgentProjection;
}

export function ExecutionTimeline({ agent }: ExecutionTimelineProps) {
  const { orchestration } = agent;
  if (!orchestration) return null;

  const { executionTimeline } = orchestration;

  const getEventColor = (event: string) => {
    if (event.includes('error') || event.includes('failed')) return 'border-red-500';
    if (event.includes('complete') || event.includes('success')) return 'border-green-500';
    if (event.includes('start') || event.includes('begin')) return 'border-blue-500';
    return 'border-gray-500';
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Execution Timeline</h3>
        <span className="text-sm text-text-muted">{executionTimeline.length} events</span>
      </div>

      {executionTimeline.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No execution events
        </div>
      ) : (
        <div className="space-y-4">
          {executionTimeline.map((item, index) => (
            <div key={index} className="relative pl-6">
              <div className={`absolute left-0 top-2 w-3 h-3 rounded-full border-2 ${getEventColor(item.event)}`} />
              <div className="border-l-2 border-gray-200 absolute left-1.5 top-5 bottom-0" />
              <div className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{item.event}</span>
                  <span className="text-xs text-text-muted">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                {item.duration && (
                  <div className="text-xs text-text-muted mb-2">
                    Duration: {item.duration}ms
                  </div>
                )}
                {item.details && (
                  <div className="text-xs text-text-muted">
                    <pre className="bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
