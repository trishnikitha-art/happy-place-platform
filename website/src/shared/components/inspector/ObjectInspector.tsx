/**
 * ObjectInspector - Reusable object inspector component
 * 
 * Provides debugging UI for objects with:
 * - collapse/expand
 * - copy
 * - search
 * - highlight
 * 
 * Never use JSON.stringify directly in components.
 */

"use client";

import { useState } from 'react';

interface ObjectInspectorProps {
  data: any;
  name?: string;
  defaultExpanded?: boolean;
}

export function ObjectInspector({ data, name = 'Object', defaultExpanded = false }: ObjectInspectorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [searchTerm, setSearchTerm] = useState('');

  const toggleExpanded = () => setExpanded(!expanded);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
  };

  const renderValue = (value: any, key: string): React.ReactNode => {
    if (value === null) return <span className="text-purple-600">null</span>;
    if (value === undefined) return <span className="text-gray-500">undefined</span>;
    if (typeof value === 'boolean') return <span className="text-blue-600">{String(value)}</span>;
    if (typeof value === 'number') return <span className="text-green-600">{String(value)}</span>;
    if (typeof value === 'string') {
      const isHighlighted = searchTerm && value.toLowerCase().includes(searchTerm.toLowerCase());
      return (
        <span className={isHighlighted ? 'bg-yellow-200' : 'text-orange-600'}>
          "{value}"
        </span>
      );
    }
    if (typeof value === 'object') {
      return <ObjectInspector data={value} name={key} defaultExpanded={false} />;
    }
    return <span>{String(value)}</span>;
  };

  if (typeof data !== 'object' || data === null) {
    return <span>{renderValue(data, name)}</span>;
  }

  const isArray = Array.isArray(data);
  const entries = isArray 
    ? data.map((item, i) => [i, item]) 
    : Object.entries(data);

  const filteredEntries = searchTerm
    ? entries.filter(([key, value]) => {
        const keyStr = String(key).toLowerCase();
        const valStr = JSON.stringify(value).toLowerCase();
        return keyStr.includes(searchTerm.toLowerCase()) || valStr.includes(searchTerm.toLowerCase());
      })
    : entries;

  return (
    <div className="font-mono text-xs">
      <div className="flex items-center gap-2">
        <button
          onClick={toggleExpanded}
          className="text-blue-600 hover:text-blue-800 focus:outline-none"
        >
          {expanded ? '▼' : '▶'}
        </button>
        <span className="text-purple-600">{name}</span>
        <span className="text-gray-500">{isArray ? `[${data.length}]` : `{${entries.length}}`}</span>
        <button
          onClick={copyToClipboard}
          className="text-gray-400 hover:text-gray-600 focus:outline-none ml-auto"
          title="Copy to clipboard"
        >
          📋
        </button>
      </div>

      {expanded && (
        <div className="ml-4 mt-1">
          {searchTerm && (
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 border border-border rounded mb-2 text-xs"
            />
          )}
          
          {filteredEntries.length === 0 ? (
            <div className="text-gray-500 italic">No matches</div>
          ) : (
            <div className="pl-2 border-l border-gray-300">
              {filteredEntries.map(([key, value]) => (
                <div key={String(key)} className="py-0.5">
                  <span className="text-blue-600">{key}:</span>
                  <span className="ml-1">{renderValue(value, String(key))}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
