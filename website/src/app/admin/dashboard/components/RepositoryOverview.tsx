/**
 * Repository Overview Component
 * 
 * Displays overall repository health summary.
 * Pure rendering component - receives data as props, no calculations.
 */

import type { RepositoryMetrics } from "@/lib/metrics";

interface RepositoryOverviewProps {
  repository: RepositoryMetrics;
}

export function RepositoryOverview({ repository }: RepositoryOverviewProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "text-green-500";
      case "warning":
        return "text-yellow-500";
      case "critical":
        return "text-red-500";
      default:
        return "text-text-muted";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 text-green-800";
      case "warning":
        return "bg-yellow-100 text-yellow-800";
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-border-soft">
      <h2 className="text-xl font-bold mb-4">Repository Overview</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-3xl font-bold">{repository.totalAuthorities}</div>
          <div className="text-sm text-text-muted">Total Authorities</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-green-500">{repository.healthyAuthorities}</div>
          <div className="text-sm text-text-muted">Healthy</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-yellow-500">{repository.warningAuthorities}</div>
          <div className="text-sm text-text-muted">Warning</div>
        </div>
        
        <div className="text-center">
          <div className="text-3xl font-bold text-red-500">{repository.criticalAuthorities}</div>
          <div className="text-sm text-text-muted">Critical</div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-soft flex items-center justify-between">
        <span className="text-sm text-text-muted">Overall Health</span>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(repository.overallHealth)}`}>
          {repository.overallHealth.toUpperCase()}
        </span>
      </div>
    </div>
  );
}
