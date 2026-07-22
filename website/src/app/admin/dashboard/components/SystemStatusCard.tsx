/**
 * System Status Card Component
 * 
 * Displays runtime system status (Google Drive, variants, EXIF).
 * Pure rendering component - receives data as props, no calculations.
 * 
 * This is separate from authority validation - it's runtime state.
 */

import type { SystemStatus } from "@/lib/system-status";

interface SystemStatusCardProps {
  systemStatus: SystemStatus;
}

export function SystemStatusCard({ systemStatus }: SystemStatusCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
      case "operational":
        return "text-green-500";
      case "inactive":
      case "offline":
        return "text-gray-500";
      case "error":
        return "text-red-500";
      case "partial":
        return "text-yellow-500";
      default:
        return "text-text-muted";
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
      case "operational":
        return "bg-green-100 text-green-800";
      case "inactive":
      case "offline":
        return "bg-gray-100 text-gray-800";
      case "error":
        return "bg-red-100 text-red-800";
      case "partial":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-border-soft">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">System Status</h2>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(systemStatus.overallStatus)}`}>
            {systemStatus.overallStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Google Drive Status */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-text-muted">Google Drive</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">Status</span>
            <span className={`text-sm font-medium ${getStatusColor(systemStatus.googleDrive.status)}`}>
              {systemStatus.googleDrive.status.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Enabled</span>
            <span className="text-sm font-medium">
              {systemStatus.googleDrive.enabled ? "Yes" : "No"}
            </span>
          </div>
          {systemStatus.googleDrive.lastSync && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Sync</span>
              <span className="text-sm text-text-muted">
                {new Date(systemStatus.googleDrive.lastSync).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* Variant Generation Status */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-text-muted">Variant Generation</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">Coverage</span>
            <span className="text-sm font-medium">
              {systemStatus.variantGeneration.coveragePercentage}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">With Variants</span>
            <span className="text-sm font-medium">
              {systemStatus.variantGeneration.mediaWithVariants} / {systemStatus.variantGeneration.totalMedia}
            </span>
          </div>
          {systemStatus.variantGeneration.lastGenerated && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Generated</span>
              <span className="text-sm text-text-muted">
                {new Date(systemStatus.variantGeneration.lastGenerated).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* EXIF Extraction Status */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-text-muted">EXIF Extraction</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">Coverage</span>
            <span className="text-sm font-medium">
              {systemStatus.exifExtraction.coveragePercentage}%
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">With EXIF</span>
            <span className="text-sm font-medium">
              {systemStatus.exifExtraction.mediaWithExif} / {systemStatus.exifExtraction.totalMedia}
            </span>
          </div>
          {systemStatus.exifExtraction.lastExtracted && (
            <div className="flex items-center justify-between">
              <span className="text-sm">Last Extracted</span>
              <span className="text-sm text-text-muted">
                {new Date(systemStatus.exifExtraction.lastExtracted).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-border-soft">
        <div className="text-xs text-text-muted">
          Last checked: {new Date(systemStatus.lastChecked).toLocaleString()}
        </div>
      </div>
    </div>
  );
}
