/**
 * ProjectionExplorer - Orchestration primitive for exploring projections
 * 
 * Displays projections for all canonical objects with filtering and search.
 * Instead of individual dashboards, build reusable projections.
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 */

"use client";

import { useState } from 'react';

interface Projection {
  id: string;
  type: string;
  object: string;
  data: any;
  generatedAt: string;
  sources: string[];
}

interface ProjectionExplorerProps {
  projections?: Projection[];
}

export function ProjectionExplorer({ projections = [] }: ProjectionExplorerProps) {
  const [filter, setFilter] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedObject, setSelectedObject] = useState('all');

  const types = Array.from(new Set(projections.map(p => p.type)));
  const objects = Array.from(new Set(projections.map(p => p.object)));

  const filteredProjections = projections.filter(p => {
    const matchesFilter = filter === '' || 
      p.id.toLowerCase().includes(filter.toLowerCase()) ||
      p.type.toLowerCase().includes(filter.toLowerCase()) ||
      p.object.toLowerCase().includes(filter.toLowerCase());
    const matchesType = selectedType === 'all' || p.type === selectedType;
    const matchesObject = selectedObject === 'all' || p.object === selectedObject;
    return matchesFilter && matchesType && matchesObject;
  });

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Projection Explorer</h3>
        <span className="text-sm text-text-muted">{filteredProjections.length} projections</span>
      </div>

      {/* Filters */}
      <div className="space-y-3 mb-4">
        <input
          type="text"
          placeholder="Search projections..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
        />
        <div className="flex gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 border border-border rounded bg-surface text-sm"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <select
            value={selectedObject}
            onChange={(e) => setSelectedObject(e.target.value)}
            className="px-3 py-2 border border-border rounded bg-surface text-sm"
          >
            <option value="all">All Objects</option>
            {objects.map(obj => (
              <option key={obj} value={obj}>{obj}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projections List */}
      {filteredProjections.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No projections found
        </div>
      ) : (
        <div className="space-y-3">
          {filteredProjections.map((projection) => (
            <div key={projection.id} className="border border-border rounded p-4 bg-surface">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{projection.id}</span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                    {projection.type}
                  </span>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                    {projection.object}
                  </span>
                </div>
                <span className="text-xs text-text-muted">
                  {new Date(projection.generatedAt).toLocaleString()}
                </span>
              </div>

              <div className="mb-3">
                <div className="text-xs text-text-muted mb-2">Sources:</div>
                <div className="flex flex-wrap gap-2">
                  {projection.sources.map((source, index) => (
                    <span key={index} className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {source}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs text-text-muted mb-2">Data:</div>
                <pre className="bg-gray-50 p-2 rounded text-xs overflow-x-auto">
                  {JSON.stringify(projection.data, null, 2)}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
