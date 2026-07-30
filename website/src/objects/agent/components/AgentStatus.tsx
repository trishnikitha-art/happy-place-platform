/**
 * AgentStatus - Orchestration primitive for agent runtime status
 * 
 * Displays agent identity, current mission, current worker, context,
 * memory, reasoning summary, confidence, evidence, recommendations, health, permissions
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AgentProjection } from "../projection/agent-projection";

interface AgentStatusProps {
  agent: AgentProjection;
}

export function AgentStatus({ agent }: AgentStatusProps) {
  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="border border-border rounded-lg p-4 bg-surface">
        <h3 className="text-lg font-bold mb-2">Agent Identity</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-muted">Name:</span>
            <span className="ml-2 font-medium">{agent.agent.name}</span>
          </div>
          <div>
            <span className="text-text-muted">Type:</span>
            <span className="ml-2 font-medium">{agent.agent.type}</span>
          </div>
          <div>
            <span className="text-text-muted">Status:</span>
            <span className={`ml-2 font-medium ${
              agent.agent.status === 'running' ? 'text-green-600' :
              agent.agent.status === 'error' ? 'text-red-600' :
              agent.agent.status === 'idle' ? 'text-yellow-600' :
              'text-gray-600'
            }`}>{agent.agent.status}</span>
          </div>
          <div>
            <span className="text-text-muted">Last Activity:</span>
            <span className="ml-2 font-medium">{agent.agent.lastActivity || 'Never'}</span>
          </div>
        </div>
      </div>

      {/* Current Mission */}
      {agent.currentMission && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <h3 className="text-lg font-bold mb-2">Current Mission</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Mission ID:</span>
              <span className="ml-2 font-medium">{agent.currentMission.missionId}</span>
            </div>
            <div>
              <span className="text-text-muted">Type:</span>
              <span className="ml-2 font-medium">{agent.currentMission.type}</span>
            </div>
            <div>
              <span className="text-text-muted">Status:</span>
              <span className="ml-2 font-medium">{agent.currentMission.status}</span>
            </div>
            <div>
              <span className="text-text-muted">Progress:</span>
              <span className="ml-2 font-medium">{agent.currentMission.progress}%</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${agent.currentMission.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Current Worker */}
      {agent.currentWorker && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <h3 className="text-lg font-bold mb-2">Current Worker</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Worker ID:</span>
              <span className="ml-2 font-medium">{agent.currentWorker.workerId}</span>
            </div>
            <div>
              <span className="text-text-muted">Type:</span>
              <span className="ml-2 font-medium">{agent.currentWorker.type}</span>
            </div>
            <div>
              <span className="text-text-muted">Status:</span>
              <span className="ml-2 font-medium">{agent.currentWorker.status}</span>
            </div>
            <div>
              <span className="text-text-muted">Progress:</span>
              <span className="ml-2 font-medium">{agent.currentWorker.progress}%</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${agent.currentWorker.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Health */}
      {agent.health && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <h3 className="text-lg font-bold mb-2">Health</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Status:</span>
              <span className={`ml-2 font-medium ${
                agent.health.status === 'healthy' ? 'text-green-600' :
                agent.health.status === 'degraded' ? 'text-yellow-600' :
                'text-red-600'
              }`}>{agent.health.status}</span>
            </div>
            <div>
              <span className="text-text-muted">Score:</span>
              <span className="ml-2 font-medium">{agent.health.score}/100</span>
            </div>
          </div>
          {agent.health.issues.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium mb-2">Issues</h4>
              <ul className="space-y-1">
                {agent.health.issues.map((issue, index) => (
                  <li key={index} className="text-sm text-text-muted">
                    <span className={`font-medium ${
                      issue.severity === 'high' ? 'text-red-600' :
                      issue.severity === 'medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    }`}>{issue.severity}:</span> {issue.issue}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Confidence */}
      {agent.confidence && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <h3 className="text-lg font-bold mb-2">Confidence</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">Overall:</span>
              <span className="ml-2 font-medium">{Math.round(agent.confidence.overall * 100)}%</span>
            </div>
            <div>
              <span className="text-text-muted">Trend:</span>
              <span className={`ml-2 font-medium ${
                agent.confidence.trend === 'increasing' ? 'text-green-600' :
                agent.confidence.trend === 'decreasing' ? 'text-red-600' :
                'text-gray-600'
              }`}>{agent.confidence.trend}</span>
            </div>
          </div>
        </div>
      )}

      {/* Telemetry */}
      {agent.telemetry && (
        <div className="border border-border rounded-lg p-4 bg-surface">
          <h3 className="text-lg font-bold mb-2">Telemetry</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-muted">CPU:</span>
              <span className="ml-2 font-medium">{Math.round(agent.telemetry.cpu * 100)}%</span>
            </div>
            <div>
              <span className="text-text-muted">Memory:</span>
              <span className="ml-2 font-medium">{Math.round(agent.telemetry.memory * 100)}%</span>
            </div>
            <div>
              <span className="text-text-muted">Latency:</span>
              <span className="ml-2 font-medium">{agent.telemetry.latency}ms</span>
            </div>
            <div>
              <span className="text-text-muted">Throughput:</span>
              <span className="ml-2 font-medium">{agent.telemetry.throughput}/s</span>
            </div>
            <div>
              <span className="text-text-muted">Error Rate:</span>
              <span className="ml-2 font-medium">{Math.round(agent.telemetry.errorRate * 100)}%</span>
            </div>
            <div>
              <span className="text-text-muted">Uptime:</span>
              <span className="ml-2 font-medium">{agent.telemetry.uptime}s</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
