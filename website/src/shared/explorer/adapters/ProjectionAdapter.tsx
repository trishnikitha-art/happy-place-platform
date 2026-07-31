/**
 * ProjectionAdapter - Adapter for UniversalExplorer to handle projections
 */

import React from 'react';
import type { ExplorerAdapter, Filter, SortOption } from '../UniversalExplorer';

export const projectionAdapter: ExplorerAdapter = {
  id: 'projection',
  name: 'Projections',
  type: 'projection',
  
  canHandle: (item: any) => {
    return item && typeof item === 'object' && (item.type || item.object || item.projection);
  },
  
  renderItem: (item: any) => {
    return (
      <div>
        <div className="font-medium">{item.id || item.name || 'Unknown'}</div>
        <div className="text-xs text-text-muted">
          {item.type || item.object || 'Projection'}
        </div>
      </div>
    );
  },
  
  renderDetails: (item: any) => {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold mb-2">{item.id || item.name || 'Projection'}</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {item.type && (
              <div>
                <span className="text-text-muted">Type:</span>
                <span className="ml-2">{item.type}</span>
              </div>
            )}
            {item.object && (
              <div>
                <span className="text-text-muted">Object:</span>
                <span className="ml-2">{item.object}</span>
              </div>
            )}
            {item.generatedAt && (
              <div>
                <span className="text-text-muted">Generated:</span>
                <span className="ml-2">{new Date(item.generatedAt).toLocaleString()}</span>
              </div>
            )}
          </div>
        </div>
        
        {item.sources && (
          <div>
            <h4 className="text-sm font-medium mb-2">Sources</h4>
            <div className="flex flex-wrap gap-2">
              {item.sources.map((source: string, index: number) => (
                <span key={index} className="px-2 py-1 rounded text-xs bg-muted">
                  {source}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {item.data && (
          <div>
            <h4 className="text-sm font-medium mb-2">Data</h4>
            <pre className="bg-muted p-4 rounded text-xs overflow-x-auto">
              {JSON.stringify(item.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  },
  
  getFilters: (): Filter[] => [
    {
      id: 'type',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'review', label: 'Review' },
        { value: 'project', label: 'Project' },
        { value: 'customer', label: 'Customer' },
        { value: 'mission', label: 'Mission' },
        { value: 'agent', label: 'Agent' },
        { value: 'analytics', label: 'Analytics' },
      ],
      apply: (item: any, value: string) => item.type === value,
    },
    {
      id: 'object',
      label: 'Object',
      type: 'select',
      options: [
        { value: 'review', label: 'Review' },
        { value: 'project', label: 'Project' },
        { value: 'customer', label: 'Customer' },
        { value: 'mission', label: 'Mission' },
        { value: 'agent', label: 'Agent' },
        { value: 'analytics', label: 'Analytics' },
      ],
      apply: (item: any, value: string) => item.object === value,
    },
  ],
  
  getSortOptions: (): SortOption[] => [
    {
      id: 'generatedAt',
      label: 'Generated At (Newest)',
      compare: (a: any, b: any) => {
        const dateA = new Date(a.generatedAt || 0).getTime();
        const dateB = new Date(b.generatedAt || 0).getTime();
        return dateB - dateA;
      },
    },
    {
      id: 'generatedAt-asc',
      label: 'Generated At (Oldest)',
      compare: (a: any, b: any) => {
        const dateA = new Date(a.generatedAt || 0).getTime();
        const dateB = new Date(b.generatedAt || 0).getTime();
        return dateA - dateB;
      },
    },
    {
      id: 'name',
      label: 'Name (A-Z)',
      compare: (a: any, b: any) => {
        const nameA = (a.id || a.name || '').toLowerCase();
        const nameB = (b.id || b.name || '').toLowerCase();
        return nameA.localeCompare(nameB);
      },
    },
  ],
};
