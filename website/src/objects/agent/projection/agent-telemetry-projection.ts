/**
 * Agent Telemetry Projection - Composed projection for agent telemetry
 * 
 * SHAREABLE CONTRACT: This interface is shared between HPP and PING.
 * Do not import HPP-specific types. All types must be defined here or
 * reference other shareable contracts.
 */

export interface AgentTelemetryProjection {
  cpu: number;
  memory: number;
  latency: number;
  throughput: number;
  errorRate: number;
  uptime: number;
  lastUpdated: string;
}

export interface TelemetryMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
}
