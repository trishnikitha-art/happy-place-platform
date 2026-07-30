/**
 * Revenue - Orchestration primitive for revenue visualization
 * 
 * Displays revenue metrics, growth, forecast, and breakdown.
 * Consumes metrics from analytics projection (facts/dimensions/measures/metrics/aggregations/forecasts).
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import type { AnalyticsProjection } from "../projection/analytics-projection";

interface RevenueProps {
  analytics: AnalyticsProjection;
}

export function Revenue({ analytics }: RevenueProps) {
  // Find revenue metric from metrics array
  const revenueMetric = analytics.metrics?.find((m: any) => m.name === 'revenue');
  
  if (!revenueMetric) {
    return (
      <div className="border border-border rounded-lg p-4 bg-surface">
        <div className="text-center py-8 text-text-muted">
          Revenue metric not available
        </div>
      </div>
    );
  }

  const getGrowthColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getGrowthIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↑';
      case 'down': return '↓';
      default: return '→';
    }
  };

  // Get breakdown from aggregations
  const breakdownAggregation = analytics.aggregations?.find((a: any) => a.name === 'revenue-breakdown');
  const breakdown = breakdownAggregation?.results || [];

  // Get forecast from forecasts
  const revenueForecast = analytics.forecasts?.find((f: any) => f.metric === 'revenue');

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Revenue</h3>
        <span className="text-sm text-text-muted">{analytics.analytics.period}</span>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-border rounded p-3 bg-surface">
          <div className="text-sm text-text-muted mb-1">Total Revenue</div>
          <div className="text-2xl font-bold">{revenueMetric.unit === '$' ? '$' : ''}{revenueMetric.value.toLocaleString()}</div>
        </div>
        <div className="border border-border rounded p-3 bg-surface">
          <div className="text-sm text-text-muted mb-1">Trend</div>
          <div className={`text-2xl font-bold ${getGrowthColor(revenueMetric.trend)}`}>
            {getGrowthIcon(revenueMetric.trend)} {revenueMetric.trend}
          </div>
        </div>
        {revenueForecast && (
          <>
            <div className="border border-border rounded p-3 bg-surface">
              <div className="text-sm text-text-muted mb-1">Forecast</div>
              <div className="text-2xl font-bold">${revenueForecast.predictions[0]?.value?.toLocaleString() || 'N/A'}</div>
            </div>
            <div className="border border-border rounded p-3 bg-surface">
              <div className="text-sm text-text-muted mb-1">Confidence</div>
              <div className="text-2xl font-bold">{Math.round(revenueForecast.confidence * 100)}%</div>
            </div>
          </>
        )}
      </div>

      {/* Revenue Breakdown */}
      {breakdown.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-3">Revenue Breakdown</h4>
          <div className="space-y-3">
            {breakdown.map((item: any, index: number) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{item.group?.category || 'Unknown'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">${item.value?.toLocaleString() || '0'}</span>
                    <span className="text-xs text-text-muted">{Math.round(item.group?.percentage || 0)}%</span>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(item.group?.percentage || 0, 100)}%` }}
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
