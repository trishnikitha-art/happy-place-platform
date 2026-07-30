/**
 * StatusBadge - Reusable status badge component
 * 
 * Uses centralized status registry for consistent styling.
 * Never repeat color mappings across components.
 */

import { getStatusConfig } from '@/shared/theme/status-registry';

interface StatusBadgeProps {
  status: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = getStatusConfig(status);

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {showIcon && config.icon && <span className="mr-1">{config.icon}</span>}
      {status}
    </span>
  );
}
