/**
 * Findings Table Component
 * 
 * Displays validation findings in a table format.
 * Pure rendering component - receives data as props, no calculations.
 */

import type { FindingsSummary } from "@/lib/findings";

interface FindingsTableProps {
  findings: FindingsSummary;
}

export function FindingsTable({ findings }: FindingsTableProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-600 bg-red-50";
      case "high":
        return "text-orange-600 bg-orange-50";
      case "medium":
        return "text-yellow-600 bg-yellow-50";
      case "low":
        return "text-blue-600 bg-blue-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  const getAuthorityColor = (authority: string) => {
    switch (authority) {
      case "media":
        return "text-blue-600";
      case "projects":
        return "text-green-600";
      case "reviews":
        return "text-purple-600";
      case "brand":
        return "text-orange-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 border border-border-soft">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">Findings</h2>
        <div className="text-sm text-text-muted">
          Total: {findings.total}
        </div>
      </div>

      {/* Summary by severity */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="text-center p-3 bg-red-50 rounded">
          <div className="text-2xl font-bold text-red-600">{findings.bySeverity.critical}</div>
          <div className="text-xs text-text-muted">Critical</div>
        </div>
        <div className="text-center p-3 bg-orange-50 rounded">
          <div className="text-2xl font-bold text-orange-600">{findings.bySeverity.high}</div>
          <div className="text-xs text-text-muted">High</div>
        </div>
        <div className="text-center p-3 bg-yellow-50 rounded">
          <div className="text-2xl font-bold text-yellow-600">{findings.bySeverity.medium}</div>
          <div className="text-xs text-text-muted">Medium</div>
        </div>
        <div className="text-center p-3 bg-blue-50 rounded">
          <div className="text-2xl font-bold text-blue-600">{findings.bySeverity.low}</div>
          <div className="text-xs text-text-muted">Low</div>
        </div>
      </div>

      {/* Findings table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-soft">
              <th className="text-left py-2 px-3 font-medium text-text-muted">Severity</th>
              <th className="text-left py-2 px-3 font-medium text-text-muted">Authority</th>
              <th className="text-left py-2 px-3 font-medium text-text-muted">Rule</th>
              <th className="text-left py-2 px-3 font-medium text-text-muted">Count</th>
            </tr>
          </thead>
          <tbody>
            {findings.groups.map((group, index) => (
              <tr key={index} className="border-b border-border-soft hover:bg-gray-50">
                <td className="py-2 px-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(group.severity)}`}>
                    {group.severity.toUpperCase()}
                  </span>
                </td>
                <td className={`py-2 px-3 font-medium ${getAuthorityColor(group.authority)}`}>
                  {group.authority}
                </td>
                <td className="py-2 px-3 text-text-muted">
                  {group.rule}
                </td>
                <td className="py-2 px-3 font-medium">
                  {group.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {findings.groups.length === 0 && (
        <div className="text-center py-8 text-text-muted">
          No findings - all systems healthy!
        </div>
      )}
    </div>
  );
}
