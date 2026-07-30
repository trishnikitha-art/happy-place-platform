/**
 * BusinessHealth - Orchestration primitive for business health visualization
 * 
 * Displays business health score, status, factors, and trend.
 * Consumes metrics from analytics projection (facts/dimensions/measures/metrics/aggregations/forecasts).
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AnalyticsProjection } from "../projection/analytics-projection";

interface BusinessHealthProps {
  analytics: AnalyticsProjection;
}

export function BusinessHealth({ analytics }: BusinessHealthProps) {
  // Find business health metric from metrics array
  const healthMetric = analytics.metrics?.find(m => m.name === 'business-health');
  
  if (!healthMetric) {
    return (
      <div className="border border-border rounded-lg p-4 bg-surface">
        <div className="text-center py-8 text-text-muted">
          Business health metric not available
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-green-100 text-green-800';
      case 'at-risk': return 'bg-yellow-100 text-yellow-800';
      case 'off-track': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↑';
      case 'stable': return '→';
      case 'down': return '↓';
      default: return '→';
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'stable': return 'text-gray-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Get factors from aggregations
  const factorsAggregation = analytics.aggregations?.find(a => a.name === 'health-factors');
  const factors = factorsAggregation?.results || [];

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Business Health</h3>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(healthMetric.status)}`}>
            {healthMetric.status}
          </span>
          <span className={`text-sm font-medium ${getTrendColor(healthMetric.trend)}`}>
            {getTrendIcon(healthMetric.trend)} {healthMetric.trend}
          </span>
        </div>
      </div>

      {/* Health Score */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-text-muted">Health Score</span>
          <span className="text-2xl font-bold">{Math.round(healthMetric.value)}/100</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className={`h-4 rounded-full transition-all ${
              healthMetric.value >= 80 ? 'bg-green-500' :
              healthMetric.value >= 60 ? 'bg-blue-500' :
              healthMetric.value >= 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${Math.min(healthMetric.value, 100)}%` }}
          />
        </div>
      </div>

      {/* Health Factors */}
      {factors.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Health Factors</h4>
          <div className="space-y-3">
            {factors.map((factor: any, index: number) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{factor.group?.factor || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{Math.round(factor.value)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Weight:</span>
                  <span className="text-xs">{factor.group?.weight || 'N/A'}</span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(factor.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
