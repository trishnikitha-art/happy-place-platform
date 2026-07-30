/**
 * MissionQueue - Orchestration primitive for mission queue management
 * 
 * Displays queued missions with priority, status, and estimated duration.
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AgentProjection } from "../projection/agent-projection";

interface MissionQueueProps {
  agent: AgentProjection;
}

export function MissionQueue({ agent }: MissionQueueProps) {
  const { orchestration } = agent;
  if (!orchestration) return null;

  const { missionQueue } = orchestration;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Mission Queue</h3>
        <span className="text-sm text-text-muted">{missionQueue.length} missions</span>
      </div>

      {missionQueue.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No missions in queue
        </div>
      ) : (
        <div className="space-y-3">
          {missionQueue.map((item) => (
            <div key={item.missionId} className="border border-border rounded p-3 bg-surface">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className="font-medium text-sm">{item.missionId}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-text-muted">
                <div>
                  <span>Type:</span>
                  <span className="ml-1">{item.type}</span>
                </div>
                <div>
                  <span>Queued:</span>
                  <span className="ml-1">{new Date(item.queuedAt).toLocaleTimeString()}</span>
                </div>
                {item.estimatedDuration && (
                  <div>
                    <span>Est. Duration:</span>
                    <span className="ml-1">{item.estimatedDuration}s</span>
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
