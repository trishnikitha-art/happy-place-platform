/**
 * Projections - All projections in one view
 * 
 * Shows all available projection types and their current state.
 * Everything is a projection.
 */

'use client';

import { useState, useEffect } from 'react';
import { Database, RefreshCw, Eye } from 'lucide-react';
import { projectionApi } from '@/lib/api/client';

export default function ProjectionsPage() {
  const [projectionTypes, setProjectionTypes] = useState<any[]>([]);
  const [selectedProjection, setSelectedProjection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadProjections();
  }, []);

  const loadProjections = async () => {
    try {
      setLoading(true);
      const data = await projectionApi.getAll();
      // Group by type
      const grouped = data.reduce((acc: any[], proj) => {
        const existing = acc.find(p => p.id === proj.type);
        if (existing) {
          existing.count++;
        } else {
          acc.push({
            id: proj.type,
            name: `${proj.type.charAt(0).toUpperCase() + proj.type.slice(1)} Projection`,
            description: `${proj.type} state and relationships`,
            count: 1,
            lastUpdated: proj.lastActivity,
            status: proj.health,
          });
        }
        return acc;
      }, []);
      setProjectionTypes(grouped);
    } catch (err) {
      console.error('Failed to load projections:', err);
      // P0 FIX: Do not use fallback mock data - expose the actual error
      setError('Failed to load projections: API endpoint not available');
      setProjectionTypes([]);
      setLoading(false);
      return; // Exit early to show empty state, not fake data
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'healthy': 'bg-green-100 text-green-800',
      'degraded': 'bg-yellow-100 text-yellow-800',
      'unhealthy': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Projections</h1>
        <p className="text-muted-foreground mb-6">All projections in one view - everything is a projection</p>
        <div className="text-center py-12 text-muted-foreground">Loading projections...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Projections</h1>
        <p className="text-muted-foreground mb-6">All projections in one view - everything is a projection</p>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">API Endpoint Not Available</h2>
          <p className="text-red-700">{error}</p>
          <p className="text-sm text-red-600 mt-2">The /api/projections endpoint does not exist in the current deployment.</p>
        </div>
      </div>
    );
  }

  if (projectionTypes.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Projections</h1>
        <p className="text-muted-foreground mb-6">All projections in one view - everything is a projection</p>
        <div className="text-center py-12 text-muted-foreground">
          No projections available. The projection API endpoint is not configured.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Projections</h1>
        <p className="text-muted-foreground">
          Everything is a projection - view all available projections
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Database className="text-primary" size={24} />
            <div>
              <div className="text-2xl font-bold text-foreground">
                {projectionTypes.reduce((sum: number, p: any) => sum + p.count, 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Projections</div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-green-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-foreground">
                {projectionTypes.filter((p: any) => p.status === 'healthy').length}
              </div>
              <div className="text-sm text-muted-foreground">Healthy Types</div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center gap-3">
            <RefreshCw className="text-yellow-500" size={24} />
            <div>
              <div className="text-2xl font-bold text-foreground">
                {projectionTypes.filter((p: any) => p.status !== 'healthy').length}
              </div>
              <div className="text-sm text-muted-foreground">Degraded Types</div>
            </div>
          </div>
        </div>
      </div>

      {/* Projection Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projectionTypes.map((projection: any) => (
          <div
            key={projection.id}
            className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-foreground">{projection.name}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(projection.status)}`}>
                    {projection.status}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{projection.description}</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{projection.count}</span> instances
              </div>
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground">
                  Updated: {formatDate(projection.lastUpdated)}
                </div>
                <button
                  onClick={() => setSelectedProjection(projection.id)}
                  className="flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  <Eye size={14} />
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
