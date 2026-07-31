/**
 * ProjectionFilter - Universal projection filter
 * 
 * Filters projections by type and search query.
 */

'use client';

import { Search } from 'lucide-react';

interface ProjectionFilterProps {
  types: string[];
  selectedType: string;
  onTypeChange: (type: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function ProjectionFilter({
  types,
  selectedType,
  onTypeChange,
  searchQuery,
  onSearchChange,
}: ProjectionFilterProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      {/* Type Filter */}
      <div className="flex gap-2 flex-wrap">
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onTypeChange(type)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${selectedType === type
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
              }
            `}
          >
            {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
        <input
          type="text"
          placeholder="Search projections..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>
    </div>
  );
}
