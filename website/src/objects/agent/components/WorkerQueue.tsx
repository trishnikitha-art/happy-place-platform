/**
 * WorkerQueue - Orchestration primitive for worker queue management
 * 
 * Displays queued workers with mission assignment, status, and progress.
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AgentProjection } from "../projection/agent-projection";

interface WorkerQueueProps {
  agent: AgentProjection;
}

export function WorkerQueue({ agent }: WorkerQueueProps) {
  const { orchestration } = agent;
  if (!orchestration) return null;

  const { workerQueue } = orchestration;

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
        <h3 className="text-lg font-bold">Worker Queue</h3>
        <span className="text-sm text-text-muted">{workerQueue.length} workers</span>
      </div>

      {workerQueue.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No workers in queue
        </div>
      ) : (
        <div className="space-y-3">
          {workerQueue.map((item) => (
            <div key={item.workerId} className="border border-border rounded p-3 bg-surface">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.workerId}</span>
                  <span className="text-xs text-text-muted">→ {item.missionId}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                  {item.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-text-muted mb-2">
                <div>
                  <span>Type:</span>
                  <span className="ml-1">{item.type}</span>
                </div>
                <div>
                  <span>Queued:</span>
                  <span className="ml-1">{new Date(item.queuedAt).toLocaleTimeString()}</span>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-muted">Progress</span>
                  <span className="font-medium">{item.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
