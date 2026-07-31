/**
 * Explorer - Universal projection viewer
 * 
 * Renders every projection identically. No special cases.
 * 
 * Projection Card:
 * - Summary
 * - Evidence
 * - History
 * - Timeline
 * - Relationships
 * - Actions
 */

'use client';

import { useState, useEffect } from 'react';
import { ProjectionCard } from '@/components/workbench/explorer/ProjectionCard';
import { ProjectionFilter } from '@/components/workbench/explorer/ProjectionFilter';
import { projectionApi, type ProjectionData } from '@/lib/api/client';

export default function ExplorerPage() {
  const [projections, setProjections] = useState<ProjectionData[]>([]);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjections();
  }, []);

  const loadProjections = async () => {
    try {
      setLoading(true);
      const data = await projectionApi.getAll();
      setProjections(data);
    } catch (err) {
      console.error('Failed to load projections:', err);
      // Fallback to mock data for development
      setProjections([
        {
          id: 'customer-1',
          type: 'customer',
          name: 'John Smith',
          status: 'active',
          health: 'healthy',
          lastActivity: new Date().toISOString(),
          summary: {
            totalProjects: 3,
            totalRevenue: 45000,
            averageRating: 4.8,
          },
        },
        {
          id: 'project-1',
          type: 'project',
          name: 'Kitchen Remodel',
          status: 'in-progress',
          health: 'healthy',
          lastActivity: new Date().toISOString(),
          summary: {
            progress: 65,
            budget: 25000,
            spent: 16250,
            deadline: '2024-02-15',
          },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjections = projections.filter((projection) => {
    const matchesType = selectedType === 'all' || projection.type === selectedType;
    const matchesSearch = projection.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const projectionTypes = ['all', ...Array.from(new Set(projections.map((p) => p.type)))];

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Explorer</h1>
        <p className="text-muted-foreground mb-6">Universal projection viewer - everything is a projection</p>
        <div className="text-center py-12 text-muted-foreground">Loading projections...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Explorer</h1>
        <p className="text-muted-foreground">
          Universal projection viewer - everything is a projection
        </p>
      </div>

      {/* Filters */}
      <ProjectionFilter
        types={projectionTypes}
        selectedType={selectedType}
        onTypeChange={setSelectedType}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Projections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {filteredProjections.map((projection) => (
          <ProjectionCard key={projection.id} projection={projection} />
        ))}
      </div>

      {filteredProjections.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No projections found matching your filters.
        </div>
      )}
    </div>
  );
}
