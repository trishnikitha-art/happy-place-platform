/**
 * UniversalExplorer - One explorer shell for all object types
 * 
 * Instead of creating multiple explorers (Projection Explorer, Customer Explorer, Worker Explorer, etc.),
 * create one Universal Explorer with adapters.
 * 
 * Explorer
 *   projectionAdapter
 *   customerAdapter
 *   missionAdapter
 *   workerAdapter
 *   analyticsAdapter
 * 
 * One shell. Infinite object types.
 */

"use client";

import { useState } from 'react';

export interface ExplorerAdapter {
  id: string;
  name: string;
  type: string;
  canHandle: (item: any) => boolean;
  renderItem: (item: any) => React.ReactNode;
  renderDetails: (item: any) => React.ReactNode;
  getFilters: () => Filter[];
  getSortOptions: () => SortOption[];
}

export interface Filter {
  id: string;
  label: string;
  type: 'text' | 'select' | 'multiselect' | 'date' | 'number';
  options?: { value: string; label: string }[];
  apply: (item: any, value: any) => boolean;
}

export interface SortOption {
  id: string;
  label: string;
  compare: (a: any, b: any) => number;
}

interface UniversalExplorerProps {
  adapters: ExplorerAdapter[];
  items: any[];
  defaultAdapterId?: string;
}

export function UniversalExplorer({ adapters, items, defaultAdapterId }: UniversalExplorerProps) {
  const [selectedAdapterId, setSelectedAdapterId] = useState(defaultAdapterId || adapters[0]?.id);
  const [filter, setFilter] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<Record<string, any>>({});
  const [sortOption, setSortOption] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const selectedAdapter = adapters.find(a => a.id === selectedAdapterId) || adapters[0];
  const filters = selectedAdapter?.getFilters() || [];
  const sortOptions = selectedAdapter?.getSortOptions() || [];

  const filteredItems = items.filter(item => {
    // Adapter filter
    if (!selectedAdapter?.canHandle(item)) return false;

    // Text filter
    if (filter && !JSON.stringify(item).toLowerCase().includes(filter.toLowerCase())) {
      return false;
    }

    // Adapter-specific filters
    for (const [filterId, filterValue] of Object.entries(selectedFilter)) {
      const filterDef = filters.find(f => f.id === filterId);
      if (filterDef && filterValue !== '' && !filterDef.apply(item, filterValue)) {
        return false;
      }
    }

    return true;
  });

  const sortedItems = sortOption
    ? [...filteredItems].sort(
        sortOptions.find(s => s.id === sortOption)?.compare || (() => 0)
      )
    : filteredItems;

  return (
    <div className="flex h-screen">
      {/* Sidebar - Adapter Selection */}
      <div className="w-64 border-r border-border bg-surface p-4">
        <h3 className="text-lg font-bold mb-4">Explorers</h3>
        <div className="space-y-2">
          {adapters.map(adapter => (
            <button
              key={adapter.id}
              onClick={() => setSelectedAdapterId(adapter.id)}
              className={`w-full text-left px-3 py-2 rounded transition-colors ${
                selectedAdapterId === adapter.id
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted'
              }`}
            >
              {adapter.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Items List */}
        <div className="w-96 border-r border-border bg-surface p-4">
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
            />
          </div>

          {/* Adapter-specific filters */}
          {filters.length > 0 && (
            <div className="mb-4 space-y-2">
              {filters.map(filterDef => (
                <div key={filterDef.id}>
                  <label className="text-sm text-text-muted mb-1 block">{filterDef.label}</label>
                  {filterDef.type === 'select' && (
                    <select
                      value={selectedFilter[filterDef.id] || ''}
                      onChange={(e) => setSelectedFilter({ ...selectedFilter, [filterDef.id]: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                    >
                      <option value="">All</option>
                      {filterDef.options?.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                  {filterDef.type === 'text' && (
                    <input
                      type="text"
                      value={selectedFilter[filterDef.id] || ''}
                      onChange={(e) => setSelectedFilter({ ...selectedFilter, [filterDef.id]: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Sort options */}
          {sortOptions.length > 0 && (
            <div className="mb-4">
              <select
                value={sortOption || ''}
                onChange={(e) => setSortOption(e.target.value || null)}
                className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
              >
                <option value="">Sort by...</option>
                {sortOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          )}

          <div className="text-sm text-text-muted mb-2">
            {sortedItems.length} items
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[calc(100vh-300px)]">
            {sortedItems.map((item, index) => (
              <div
                key={index}
                onClick={() => setSelectedItem(item)}
                className={`p-3 border border-border rounded cursor-pointer transition-colors ${
                  selectedItem === item ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                {selectedAdapter?.renderItem(item)}
              </div>
            ))}
          </div>
        </div>

        {/* Details Panel */}
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedItem ? (
            selectedAdapter?.renderDetails(selectedItem)
          ) : (
            <div className="text-center py-8 text-text-muted">
              Select an item to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
