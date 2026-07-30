/**
 * ProjectionDiff - Compare two projections and show differences
 * 
 * Projection A → Projection B → Diff
 * 
 * Huge debugging tool for understanding how projections change over time.
 * Shows what changed, what was added, what was removed.
 */

"use client";

import { useState } from 'react';
import { ObjectInspector } from '../inspector/ObjectInspector';

export interface DiffChange {
  path: string;
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  oldValue?: any;
  newValue?: any;
  children?: DiffChange[];
}

interface ProjectionDiffProps {
  projectionA: any;
  projectionB: any;
  nameA?: string;
  nameB?: string;
}

export function ProjectionDiff({ 
  projectionA, 
  projectionB, 
  nameA = 'Projection A', 
  nameB = 'Projection B' 
}: ProjectionDiffProps) {
  const [diff, setDiff] = useState<DiffChange[]>([]);
  const [showUnchanged, setShowUnchanged] = useState(false);

  // Compute diff between two projections
  const computeDiff = () => {
    const changes: DiffChange[] = [];
    
    const compare = (objA: any, objB: any, path: string = ''): DiffChange[] => {
      const localChanges: DiffChange[] = [];
      
      // Handle null/undefined
      if (objA === null || objA === undefined) {
        if (objB !== null && objB !== undefined) {
          localChanges.push({
            path,
            type: 'added',
            newValue: objB
          });
        }
        return localChanges;
      }
      
      if (objB === null || objB === undefined) {
        localChanges.push({
          path,
          type: 'removed',
          oldValue: objA
        });
        return localChanges;
      }
      
      // Handle primitive types
      if (typeof objA !== 'object' || typeof objB !== 'object') {
        if (objA !== objB) {
          localChanges.push({
            path,
            type: 'modified',
            oldValue: objA,
            newValue: objB
          });
        } else {
          localChanges.push({
            path,
            type: 'unchanged',
            oldValue: objA,
            newValue: objB
          });
        }
        return localChanges;
      }
      
      // Handle arrays
      if (Array.isArray(objA) && Array.isArray(objB)) {
        const maxLength = Math.max(objA.length, objB.length);
        
        for (let i = 0; i < maxLength; i++) {
          const itemA = objA[i];
          const itemB = objB[i];
          
          if (itemA === undefined) {
            localChanges.push({
              path: `${path}[${i}]`,
              type: 'added',
              newValue: itemB
            });
          } else if (itemB === undefined) {
            localChanges.push({
              path: `${path}[${i}]`,
              type: 'removed',
              oldValue: itemA
            });
          } else {
            const itemChanges = compare(itemA, itemB, `${path}[${i}]`);
            localChanges.push(...itemChanges);
          }
        }
        
        return localChanges;
      }
      
      // Handle objects
      const allKeys = new Set([...Object.keys(objA), ...Object.keys(objB)]);
      
      allKeys.forEach(key => {
        const valueA = objA[key];
        const valueB = objB[key];
        const keyPath = path ? `${path}.${key}` : key;
        
        if (valueA === undefined) {
          localChanges.push({
            path: keyPath,
            type: 'added',
            newValue: valueB
          });
        } else if (valueB === undefined) {
          localChanges.push({
            path: keyPath,
            type: 'removed',
            oldValue: valueA
          });
        } else {
          const nestedChanges = compare(valueA, valueB, keyPath);
          localChanges.push(...nestedChanges);
        }
      });
      
      return localChanges;
    };
    
    setDiff(compare(projectionA, projectionB));
  };

  useState(() => {
    computeDiff();
  });

  const getChangeColor = (type: string) => {
    switch (type) {
      case 'added': return 'bg-green-100 text-green-800';
      case 'removed': return 'bg-red-100 text-red-800';
      case 'modified': return 'bg-yellow-100 text-yellow-800';
      case 'unchanged': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeIcon = (type: string) => {
    switch (type) {
      case 'added': return '+';
      case 'removed': return '-';
      case 'modified': return '~';
      case 'unchanged': return '=';
      default: return '?';
    }
  };

  const filteredDiff = showUnchanged 
    ? diff 
    : diff.filter(change => change.type !== 'unchanged');

  const stats = {
    added: diff.filter(c => c.type === 'added').length,
    removed: diff.filter(c => c.type === 'removed').length,
    modified: diff.filter(c => c.type === 'modified').length,
    unchanged: diff.filter(c => c.type === 'unchanged').length
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Projection Diff</h3>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showUnchanged}
              onChange={(e) => setShowUnchanged(e.target.checked)}
              className="rounded"
            />
            Show Unchanged
          </label>
          <button
            onClick={computeDiff}
            className="text-sm text-primary hover:underline"
          >
            Recompute
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-4 text-sm">
        <div className="px-2 py-1 rounded bg-green-100 text-green-800">
          +{stats.added} added
        </div>
        <div className="px-2 py-1 rounded bg-red-100 text-red-800">
          -{stats.removed} removed
        </div>
        <div className="px-2 py-1 rounded bg-yellow-100 text-yellow-800">
          ~{stats.modified} modified
        </div>
        <div className="px-2 py-1 rounded bg-gray-100 text-gray-800">
          ={stats.unchanged} unchanged
        </div>
      </div>

      {/* Projections */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="text-sm font-medium mb-2">{nameA}</h4>
          <ObjectInspector data={projectionA} name="projectionA" defaultExpanded={false} />
        </div>
        <div>
          <h4 className="text-sm font-medium mb-2">{nameB}</h4>
          <ObjectInspector data={projectionB} name="projectionB" defaultExpanded={false} />
        </div>
      </div>

      {/* Diff */}
      <div>
        <h4 className="text-sm font-medium mb-2">Changes ({filteredDiff.length})</h4>
        
        {filteredDiff.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            No changes
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDiff.map((change, index) => (
              <div key={index} className="border border-border rounded p-3 bg-surface">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getChangeColor(change.type)}`}>
                    {getChangeIcon(change.type)} {change.type}
                  </span>
                  <span className="font-medium text-sm">{change.path}</span>
                </div>
                
                {(change.type === 'modified' || change.type === 'added' || change.type === 'removed') && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    {change.oldValue !== undefined && (
                      <div>
                        <span className="text-text-muted">Old:</span>
                        <span className="ml-2 text-red-600">{JSON.stringify(change.oldValue)}</span>
                      </div>
                    )}
                    {change.newValue !== undefined && (
                      <div>
                        <span className="text-text-muted">New:</span>
                        <span className="ml-2 text-green-600">{JSON.stringify(change.newValue)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
