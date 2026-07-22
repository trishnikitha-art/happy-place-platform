/**
 * Authority Card Component
 * 
 * Displays individual authority metrics.
 * Pure rendering component - receives data as props, no calculations.
 */

import type { MediaMetrics, ProjectMetrics, ReviewMetrics, BrandMetrics } from "@/lib/metrics";

interface AuthorityCardProps {
  name: string;
  data: MediaMetrics | ProjectMetrics | ReviewMetrics | BrandMetrics;
  color: "blue" | "green" | "purple" | "orange";
}

export function AuthorityCard({ name, data, color }: AuthorityCardProps) {
  const getColorClasses = (color: string) => {
    switch (color) {
      case "blue":
        return {
          bg: "bg-blue-50",
          text: "text-blue-600",
          border: "border-blue-200",
          progress: "bg-blue-500",
        };
      case "green":
        return {
          bg: "bg-green-50",
          text: "text-green-600",
          border: "border-green-200",
          progress: "bg-green-500",
        };
      case "purple":
        return {
          bg: "bg-purple-50",
          text: "text-purple-600",
          border: "border-purple-200",
          progress: "bg-purple-500",
        };
      case "orange":
        return {
          bg: "bg-orange-50",
          text: "text-orange-600",
          border: "border-orange-200",
          progress: "bg-orange-500",
        };
      default:
        return {
          bg: "bg-gray-50",
          text: "text-gray-600",
          border: "border-gray-200",
          progress: "bg-gray-500",
        };
    }
  };

  const colors = getColorClasses(color);
  const metrics = data as any;

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

  return (
    <div className={`bg-white rounded-lg shadow p-6 border ${colors.border}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">{name}</h3>
        <span className={`px-2 py-1 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
          {metrics.total} items
        </span>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Score</span>
          <span className={`text-2xl font-bold ${getStatusColor(metrics.health)}`}>
            {metrics.score}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-text-muted">Health</span>
          <span className={`text-sm font-medium ${getStatusColor(metrics.health)}`}>
            {metrics.health.toUpperCase()}
          </span>
        </div>

        {/* Media-specific metrics */}
        {name === "Media" && (
          <div className="pt-3 border-t border-border-soft space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Alt Text Coverage</span>
              <span className="font-medium">{metrics.altTextCoverage}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Variant Coverage</span>
              <span className="font-medium">{metrics.variantCoverage}%</span>
            </div>
          </div>
        )}

        {/* Project-specific metrics */}
        {name === "Projects" && (
          <div className="pt-3 border-t border-border-soft space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Hero Coverage</span>
              <span className="font-medium">{metrics.heroCoverage}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Story Coverage</span>
              <span className="font-medium">{metrics.storyCoverage}%</span>
            </div>
          </div>
        )}

        {/* Review-specific metrics */}
        {name === "Reviews" && (
          <div className="pt-3 border-t border-border-soft space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Rating Coverage</span>
              <span className="font-medium">{metrics.ratingCoverage}%</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-muted">Average Rating</span>
              <span className="font-medium">{metrics.averageRating}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
