/**
 * PriorityBadge - Reusable priority badge component
 * 
 * Uses centralized priority registry for consistent styling.
 * Never repeat color mappings across components.
 */

import { getPriorityConfig } from '@/shared/theme/priority-registry';

interface PriorityBadgeProps {
  priority: string;
  showIcon?: boolean;
}

export function PriorityBadge({ priority, showIcon = true }: PriorityBadgeProps) {
  const config = getPriorityConfig(priority);

  return (
    <span className={`px-2 py-1 rounded text-xs font-medium ${config.bg} ${config.text}`}>
      {showIcon && config.icon && <span className="mr-1">{config.icon}</span>}
      {priority}
    </span>
  );
}
