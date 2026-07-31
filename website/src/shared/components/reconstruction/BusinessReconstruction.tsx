/**
 * BusinessReconstruction - Reconstruct business state from events
 * 
 * Given only events, the system reconstructs:
 * Customer → Estimate → Mission → Workers → Artifacts → Analytics
 * 
 * This is one of PING's biggest advantages.
 * Event-driven UI reconstructs business entirely from events.
 */

"use client";

import { useState } from 'react';
import { ObjectTimeline, type TimelineEvent } from '../timeline/ObjectTimeline';
import { ObjectInspector } from '../inspector/ObjectInspector';

export interface ReconstructionNode {
  id: string;
  type: string;
  status: string;
  events: TimelineEvent[];
  state: any;
  children?: ReconstructionNode[];
}

interface BusinessReconstructionProps {
  events: TimelineEvent[];
  rootObjectId?: string;
}

export function BusinessReconstruction({ events, rootObjectId }: BusinessReconstructionProps) {
  const [selectedNode, setSelectedNode] = useState<ReconstructionNode | null>(null);
  const [reconstructedState, setReconstructedState] = useState<ReconstructionNode[]>([]);

  // Reconstruct business state from events
  const reconstruct = () => {
    const stateMap = new Map<string, ReconstructionNode>();
    
    // Group events by object
    events.forEach(event => {
      const objectId = event.objectId || event.data?.objectId;
      if (!objectId) return;
      
      if (!stateMap.has(objectId)) {
        stateMap.set(objectId, {
          id: objectId,
          type: event.objectType || 'unknown',
          status: event.status || 'unknown',
          events: [],
          state: {},
          children: []
        });
      }
      
      stateMap.get(objectId)!.events.push(event);
    });

    // Build relationships based on causality
    stateMap.forEach((node, objectId) => {
      node.events.forEach(event => {
        if (event.causality?.causedBy) {
          event.causality.causedBy.forEach(parentId => {
            const parentNode = stateMap.get(parentId);
            if (parentNode && !parentNode.children?.includes(node)) {
              parentNode.children = parentNode.children || [];
              parentNode.children.push(node);
            }
          });
        }
      });
    });

    // Find root nodes (nodes without parents)
    const rootNodes = Array.from(stateMap.values()).filter(node => {
      const hasParent = Array.from(stateMap.values()).some(parent => 
        parent.children?.includes(node)
      );
      return !hasParent;
    });

    setReconstructedState(rootNodes);
  };

  useState(() => {
    reconstruct();
  });

  const getNodeTypeColor = (type: string) => {
    switch (type) {
      case 'customer': return 'bg-blue-100 text-blue-800';
      case 'estimate': return 'bg-purple-100 text-purple-800';
      case 'mission': return 'bg-green-100 text-green-800';
      case 'worker': return 'bg-orange-100 text-orange-800';
      case 'artifact': return 'bg-pink-100 text-pink-800';
      case 'analytics': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const renderNode = (node: ReconstructionNode, depth: number = 0) => {
    return (
      <div key={node.id} style={{ marginLeft: `${depth * 24}px` }}>
        <div
          className={`border border-border rounded p-3 bg-surface cursor-pointer transition-colors ${
            selectedNode?.id === node.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
          }`}
          onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getNodeTypeColor(node.type)}`}>
              {node.type}
            </span>
            <span className="font-medium text-sm">{node.id}</span>
            <span className="text-xs text-text-muted">{node.events.length} events</span>
          </div>
          <div className="text-xs text-text-muted">
            Status: {node.status}
          </div>
        </div>

        {node.children && node.children.length > 0 && (
          <div className="mt-2">
            {node.children.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen">
      {/* Reconstruction Tree */}
      <div className="w-96 border-r border-border bg-surface p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Business Reconstruction</h3>
          <button
            onClick={reconstruct}
            className="text-sm text-primary hover:underline"
          >
            Reconstruct
          </button>
        </div>

        <div className="text-sm text-text-muted mb-4">
          {reconstructedState.length} root objects
        </div>

        {reconstructedState.length === 0 ? (
          <div className="text-center py-8 text-text-muted">
            No reconstructed state
          </div>
        ) : (
          <div className="space-y-2">
            {reconstructedState.map(node => renderNode(node))}
          </div>
        )}
      </div>

      {/* Details Panel */}
      <div className="flex-1 p-4 overflow-y-auto">
        {selectedNode ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">{selectedNode.type} Details</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium ${getNodeTypeColor(selectedNode.type)}`}>
                {selectedNode.type}
              </span>
            </div>

            <div className="border border-border rounded p-4 bg-surface">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-text-muted">ID:</span>
                  <span className="ml-2">{selectedNode.id}</span>
                </div>
                <div>
                  <span className="text-text-muted">Status:</span>
                  <span className="ml-2">{selectedNode.status}</span>
                </div>
                <div>
                  <span className="text-text-muted">Events:</span>
                  <span className="ml-2">{selectedNode.events.length}</span>
                </div>
                <div>
                  <span className="text-text-muted">Children:</span>
                  <span className="ml-2">{selectedNode.children?.length || 0}</span>
                </div>
              </div>
            </div>

            {/* Object Timeline */}
            <div>
              <h4 className="text-sm font-medium mb-2">Timeline</h4>
              <ObjectTimeline
                objectId={selectedNode.id}
                objectType={selectedNode.type}
                events={selectedNode.events}
                showCausality={true}
                defaultExpanded={false}
              />
            </div>

            {/* Current State */}
            <div>
              <h4 className="text-sm font-medium mb-2">Current State</h4>
              <ObjectInspector data={selectedNode.state} name="state" defaultExpanded={true} />
            </div>

            {/* All Events */}
            <div>
              <h4 className="text-sm font-medium mb-2">All Events</h4>
              <ObjectInspector data={selectedNode.events} name="events" defaultExpanded={false} />
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-text-muted">
            Select an object to view details
          </div>
        )}
      </div>
    </div>
  );
}
