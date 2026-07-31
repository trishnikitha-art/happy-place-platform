/**
 * ProjectionCard - Universal projection card
 * 
 * Renders any projection identically with:
 * - Summary
 * - Evidence
 * - History
 * - Timeline
 * - Relationships
 * - Actions
 */

'use client';

import { useState } from 'react';
import { 
  ChevronRight, 
  Clock, 
  Activity, 
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';

interface Projection {
  id: string;
  type: string;
  name: string;
  status: string;
  health: string;
  lastActivity: string;
  summary: Record<string, any>;
}

interface ProjectionCardProps {
  projection: Projection;
}

export function ProjectionCard({ projection }: ProjectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getHealthColor = (health: string) => {
    const colors: Record<string, string> = {
      'healthy': 'text-green-500',
      'degraded': 'text-yellow-500',
      'unhealthy': 'text-red-500',
    };
    return colors[health] || 'text-gray-500';
  };

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-muted-foreground uppercase">
                {projection.type}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(projection.status)}`}>
                {projection.status}
              </span>
            </div>
            <h3 className="text-lg font-semibold text-foreground">{projection.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={16} className={getHealthColor(projection.health)} />
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 hover:bg-accent rounded transition-colors"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="p-4">
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(projection.summary).map(([key, value]) => (
            <div key={key} className="bg-muted/50 rounded p-3">
              <div className="text-xs text-muted-foreground capitalize mb-1">{key}</div>
              <div className="text-sm font-medium text-foreground">
                {typeof value === 'number' ? value.toLocaleString() : String(value)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock size={14} />
            <span>Last activity: {formatDate(projection.lastActivity)}</span>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-sm text-primary hover:underline"
          >
            {expanded ? 'Collapse' : 'Expand'}
            <ChevronRight size={16} className={expanded ? 'rotate-90' : ''} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-4 border-t border-border space-y-4">
          {/* Evidence */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Evidence</h4>
            <div className="bg-muted/50 rounded p-3">
              <p className="text-xs text-muted-foreground">No evidence available</p>
            </div>
          </div>

          {/* Actions */}
          <div>
            <h4 className="text-sm font-medium text-foreground mb-2">Actions</h4>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors text-sm">
                <Eye size={14} />
                View
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-muted text-foreground rounded hover:bg-muted/90 transition-colors text-sm">
                <Edit size={14} />
                Edit
              </button>
              <button className="flex items-center gap-2 px-3 py-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors text-sm">
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-4 top-16 bg-card border border-border rounded-lg shadow-lg z-10">
          <div className="p-2 space-y-1">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded transition-colors">
              <Eye size={14} />
              View Details
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-accent rounded transition-colors">
              <Edit size={14} />
              Edit
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-accent rounded transition-colors">
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
