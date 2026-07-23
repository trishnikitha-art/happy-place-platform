/**
 * Admin Dashboard Component
 * 
 * Pure consumer of Metrics and SystemStatus.
 * No calculations, no business logic, just rendering.
 * 
 * Architecture: Dashboard → fetchMetrics() → render()
 * 
 * This component:
 * - Fetches Metrics from /api/admin/metrics
 * - Fetches SystemStatus from /api/admin/system
 * - Renders child components with data as props
 * - No percentage calculations, no counting, no scanning
 */

"use client";

import { useEffect, useState } from "react";
import type { Metrics } from "@/lib/metrics";
import type { SystemStatus } from "@/lib/system-status";
import { RepositoryOverview } from "./components/RepositoryOverview";
import { HealthCard } from "./components/HealthCard";
import { AuthorityCard } from "./components/AuthorityCard";
import { FindingsTable } from "./components/FindingsTable";
import { SystemStatusCard } from "./components/SystemStatusCard";

export function Dashboard() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        const [metricsResponse, systemResponse] = await Promise.all([
          fetch("/api/admin/metrics"),
          fetch("/api/admin/system"),
        ]);

        if (!metricsResponse.ok) {
          throw new Error("Failed to load metrics");
        }
        if (!systemResponse.ok) {
          throw new Error("Failed to load system status");
        }

        const metricsData = await metricsResponse.json();
        const systemData = await systemResponse.json();

        setMetrics(metricsData);
        setSystemStatus(systemData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-muted">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  if (!metrics || !systemStatus) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-muted">No data available</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <div className="text-sm text-text-muted">
          Last updated: {new Date(metrics.timestamp).toLocaleString()}
        </div>
      </div>

      {/* Repository Overview */}
      {metrics.repository && <RepositoryOverview repository={metrics.repository} />}

      {/* Health Card */}
      {metrics.health && <HealthCard health={metrics.health} />}

      {/* Authority Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.media && (
          <AuthorityCard
            name="Media"
            data={metrics.media}
            color="blue"
          />
        )}
        {metrics.projects && (
          <AuthorityCard
            name="Projects"
            data={metrics.projects}
            color="green"
          />
        )}
        {metrics.reviews && (
          <AuthorityCard
            name="Reviews"
            data={metrics.reviews}
            color="purple"
          />
        )}
        {metrics.brand && (
          <AuthorityCard
            name="Brand"
            data={metrics.brand}
            color="orange"
          />
        )}
      </div>

      {/* System Status Card */}
      <SystemStatusCard systemStatus={systemStatus} />

      {/* Findings Table */}
      {metrics.health && <FindingsTable findings={metrics.health.findings} />}
    </div>
  );
}
