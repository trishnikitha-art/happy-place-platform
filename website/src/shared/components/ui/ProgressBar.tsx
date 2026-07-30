/**
 * ProgressBar - Reusable progress bar component
 * 
 * Never repeat progress bar logic across components.
 * Used by BusinessHealth, WorkerQueue, Revenue, Trends, etc.
 */

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  showLabel?: boolean;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function ProgressBar({ 
  value, 
  max = 100, 
  color = 'bg-primary', 
  showLabel = false,
  label,
  size = 'md'
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-4'
  };

  return (
    <div className="w-full">
      {(showLabel || label) && (
        <div className="flex items-center justify-between text-xs mb-1">
          {label && <span className="text-text-muted">{label}</span>}
          {showLabel && <span className="font-medium">{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div 
          className={`${color} ${sizeClasses[size]} rounded-full transition-all`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
