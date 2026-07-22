/**
 * Health Card Component
 * 
 * Displays overall health score and category.
 * Pure rendering component - receives data as props, no calculations.
 */

import type { HealthMetrics } from "@/lib/metrics";

interface HealthCardProps {
  health: HealthMetrics;
}

export function HealthCard({ health }: HealthCardProps) {
  const getCategoryColor = (category: string) => {
    switch (category) {
      case "excellent":
        return "text-green-500";
      case "good":
        return "text-blue-500";
      case "fair":
        return "text-yellow-500";
      case "poor":
        return "text-red-500";
      default:
        return "text-text-muted";
    }
  };

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "excellent":
        return "bg-green-100 text-green-800";
      case "good":
        return "bg-blue-100 text-blue-800";
      case "fair":
        return "bg-yellow-100 text-yellow-800";
      case "poor":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-border-soft">
      <h2 className="text-xl font-bold mb-4">Overall Health</h2>
      
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className={`text-5xl font-bold ${getCategoryColor(health.category)}`}>
            {health.score}
          </div>
          <div className="text-sm text-text-muted mt-1">Health Score</div>
        </div>
        
        <div className={`px-4 py-2 rounded-full text-lg font-medium ${getCategoryBadge(health.category)}`}>
          {health.category.toUpperCase()}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Repository</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500" 
                style={{ width: `${health.breakdown.repository}%` }}
              />
            </div>
            <span className="text-sm font-medium">{health.breakdown.repository}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Media</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500" 
                style={{ width: `${health.breakdown.media}%` }}
              />
            </div>
            <span className="text-sm font-medium">{health.breakdown.media}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Projects</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500" 
                style={{ width: `${health.breakdown.projects}%` }}
              />
            </div>
            <span className="text-sm font-medium">{health.breakdown.projects}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Reviews</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-orange-500" 
                style={{ width: `${health.breakdown.reviews}%` }}
              />
            </div>
            <span className="text-sm font-medium">{health.breakdown.reviews}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Brand</span>
          <div className="flex items-center gap-2">
            <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-pink-500" 
                style={{ width: `${health.breakdown.brand}%` }}
              />
            </div>
            <span className="text-sm font-medium">{health.breakdown.brand}</span>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-soft">
        <div className="text-sm text-text-muted">
          Total Findings: <span className="font-medium">{health.findings.total}</span>
        </div>
      </div>
    </div>
  );
}
