/**
 * Trends - Orchestration primitive for trends visualization
 * 
 * Displays trends metrics with current, previous, change, and trend direction.
 * Consumes metrics from analytics projection (facts/dimensions/measures/metrics/aggregations/forecasts).
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AnalyticsProjection } from "../projection/analytics-projection";

interface TrendsProps {
  analytics: AnalyticsProjection;
}

export function Trends({ analytics }: TrendsProps) {
  // Get trend metrics from metrics array
  const trendMetrics = analytics.metrics?.filter((m: any) => m.trend !== 'stable');
  
  if (!trendMetrics || trendMetrics.length === 0) {
    return (
      <div className="border border-border rounded-lg p-4 bg-surface">
        <div className="text-center py-8 text-text-muted">
          No trend metrics available
        </div>
      </div>
    );
  }

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      case 'stable': return '→';
      default: return '→';
    }
  };

  const getChangeColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Trends</h3>
        <span className="text-sm text-text-muted">{analytics.analytics.period}</span>
      </div>

      <div className="space-y-3">
        {trendMetrics.map((metric: any, index: number) => (
          <div key={index} className="border border-border rounded p-3 bg-surface">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">{metric.name}</span>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-sm font-medium">{metric.value.toLocaleString()}</div>
                  {metric.target && (
                    <div className="text-xs text-text-muted">Target: {metric.target.toLocaleString()}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg ${getTrendColor(metric.trend)}`}>
                    {getTrendIcon(metric.trend)}
                  </span>
                  <span className={`text-sm font-medium ${getChangeColor(metric.trend)}`}>
                    {metric.trend}
                  </span>
                </div>
              </div>
            </div>
            {metric.target && (
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-xs text-text-muted mb-1">Current</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full"
                      style={{ width: `${Math.min((metric.value / (metric.value + metric.target)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="text-xs text-text-muted mb-1">Target</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-400 h-2 rounded-full"
                      style={{ width: `${Math.min((metric.target / (metric.value + metric.target)) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
