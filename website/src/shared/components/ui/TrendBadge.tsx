/**
 * TrendBadge - Reusable trend badge component
 * 
 * Uses centralized trend registry for consistent styling.
 * Never repeat color mappings across components.
 */

import { getTrendConfig } from '@/shared/theme/trend-registry';

interface TrendBadgeProps {
  trend: string;
  showIcon?: boolean;
}

export function TrendBadge({ trend, showIcon = true }: TrendBadgeProps) {
  const config = getTrendConfig(trend);

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {showIcon && <span className="mr-1">{config.icon}</span>}
      {trend}
    </span>
  );
}
