/**
 * Relationship Graph - Visualize entity relationships
 * 
 * Shows the complete relationship chain:
 * Customer → Projects → Invoices → Reviews → Recommendations → Execution Plans → Workers
 * 
 * Because everything is canonical, this graph becomes almost free.
 */

'use client';

import { useState, useEffect } from 'react';
import { Network, ZoomIn, ZoomOut, RotateCcw, Maximize2 } from 'lucide-react';
import { graphApi, type GraphData } from '@/lib/api/client';

// Mock relationship data
const mockRelationships = {
  nodes: [
    { id: 'customer-1', type: 'customer', label: 'John Smith', x: 400, y: 100 },
    { id: 'project-1', type: 'project', label: 'Kitchen Remodel', x: 200, y: 250 },
    { id: 'project-2', type: 'project', label: 'Bathroom Update', x: 600, y: 250 },
    { id: 'invoice-1', type: 'invoice', label: 'INV-001', x: 100, y: 400 },
    { id: 'invoice-2', type: 'invoice', label: 'INV-002', x: 300, y: 400 },
    { id: 'review-1', type: 'review', label: '5-star review', x: 500, y: 400 },
    { id: 'review-2', type: 'review', label: '4-star review', x: 700, y: 400 },
    { id: 'rec-1', type: 'recommendation', label: 'Schedule morning', x: 400, y: 550 },
    { id: 'exec-1', type: 'execution', label: 'Kitchen Phase 1', x: 400, y: 700 },
    { id: 'worker-1', type: 'worker', label: 'Crew A', x: 200, y: 700 },
  ],
  edges: [
    { from: 'customer-1', to: 'project-1', label: 'owns' },
    { from: 'customer-1', to: 'project-2', label: 'owns' },
    { from: 'project-1', to: 'invoice-1', label: 'generated' },
    { from: 'project-1', to: 'invoice-2', label: 'generated' },
    { from: 'project-1', to: 'review-1', label: 'received' },
    { from: 'project-2', to: 'review-2', label: 'received' },
    { from: 'review-1', to: 'rec-1', label: 'triggered' },
    { from: 'rec-1', to: 'exec-1', label: 'created' },
    { from: 'exec-1', to: 'worker-1', label: 'assigned' },
  ],
};

const nodeColors: Record<string, string> = {
  'customer': 'bg-blue-500',
  'project': 'bg-green-500',
  'invoice': 'bg-yellow-500',
  'review': 'bg-purple-500',
  'recommendation': 'bg-pink-500',
  'execution': 'bg-orange-500',
  'worker': 'bg-cyan-500',
};

export default function GraphPage() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGraph();
  }, []);

  const loadGraph = async () => {
    try {
      setLoading(true);
      const data = await graphApi.getGraph();
      setGraphData(data);
    } catch (err) {
      console.error('Failed to load graph:', err);
      // Fallback to mock data for development
      setGraphData({
        nodes: [
          { id: 'customer-1', type: 'customer', label: 'John Smith', x: 400, y: 100 },
          { id: 'project-1', type: 'project', label: 'Kitchen Remodel', x: 200, y: 250 },
          { id: 'project-2', type: 'project', label: 'Bathroom Update', x: 600, y: 250 },
          { id: 'invoice-1', type: 'invoice', label: 'INV-001', x: 100, y: 400 },
          { id: 'invoice-2', type: 'invoice', label: 'INV-002', x: 300, y: 400 },
          { id: 'review-1', type: 'review', label: '5-star review', x: 500, y: 400 },
          { id: 'review-2', type: 'review', label: '4-star review', x: 700, y: 400 },
          { id: 'rec-1', type: 'recommendation', label: 'Schedule morning', x: 400, y: 550 },
          { id: 'exec-1', type: 'execution', label: 'Kitchen Phase 1', x: 400, y: 700 },
          { id: 'worker-1', type: 'worker', label: 'Crew A', x: 200, y: 700 },
        ],
        edges: [
          { from: 'customer-1', to: 'project-1', label: 'owns' },
          { from: 'customer-1', to: 'project-2', label: 'owns' },
          { from: 'project-1', to: 'invoice-1', label: 'generated' },
          { from: 'project-1', to: 'invoice-2', label: 'generated' },
          { from: 'project-1', to: 'review-1', label: 'received' },
          { from: 'project-2', to: 'review-2', label: 'received' },
          { from: 'review-1', to: 'rec-1', label: 'triggered' },
          { from: 'rec-1', to: 'exec-1', label: 'created' },
          { from: 'exec-1', to: 'worker-1', label: 'assigned' },
        ],
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedNodeData = selectedNode && graphData
    ? graphData.nodes.find(n => n.id === selectedNode)
    : null;

  const relatedEdges = selectedNode && graphData
    ? graphData.edges.filter(e => e.from === selectedNode || e.to === selectedNode)
    : [];

  const relatedNodes = selectedNode && graphData
    ? relatedEdges.flatMap(e => [e.from, e.to]).filter(id => id !== selectedNode)
    : [];

  if (loading) {
    return (
      <div className="p-6 h-full flex flex-col">
        <h1 className="text-3xl font-bold text-foreground mb-2">Relationship Graph</h1>
        <p className="text-muted-foreground mb-6">Customer → Projects → Invoices → Reviews → Recommendations → Execution Plans → Workers</p>
        <div className="text-center py-12 text-muted-foreground">Loading graph...</div>
      </div>
    );
  }

  if (!graphData) {
    return (
      <div className="p-6 h-full flex flex-col">
        <h1 className="text-3xl font-bold text-foreground mb-2">Relationship Graph</h1>
        <p className="text-muted-foreground mb-6">Customer → Projects → Invoices → Reviews → Recommendations → Execution Plans → Workers</p>
        <div className="text-center py-12 text-muted-foreground">No graph data available</div>
      </div>
    );
  }

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex-shrink-0">
        <h1 className="text-3xl font-bold text-foreground mb-2">Relationship Graph</h1>
        <p className="text-muted-foreground">
          Customer → Projects → Invoices → Reviews → Recommendations → Execution Plans → Workers
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-4 flex-shrink-0">
        <button
          onClick={() => setZoom(Math.min(zoom + 0.1, 2))}
          className="p-2 bg-card border border-border rounded hover:bg-accent transition-colors"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 0.1, 0.5))}
          className="p-2 bg-card border border-border rounded hover:bg-accent transition-colors"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-2 bg-card border border-border rounded hover:bg-accent transition-colors"
        >
          <RotateCcw size={16} />
        </button>
        <button
          onClick={() => setSelectedNode(null)}
          className="p-2 bg-card border border-border rounded hover:bg-accent transition-colors"
        >
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Graph Container */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Graph Visualization */}
        <div className="flex-1 bg-card border border-border rounded-lg overflow-hidden relative">
          <div 
            className="absolute inset-0 flex items-center justify-center"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
          >
            <svg width="800" height="800" className="overflow-visible">
              {/* Edges */}
              {graphData.edges.map((edge, index) => {
                const fromNode = graphData.nodes.find(n => n.id === edge.from);
                const toNode = graphData.nodes.find(n => n.id === edge.to);
                if (!fromNode || !toNode) return null;

                const isSelected = selectedNode && (edge.from === selectedNode || edge.to === selectedNode);
                const isRelated = selectedNode && relatedNodes.includes(edge.from) && relatedNodes.includes(edge.to);

                return (
                  <g key={index}>
                    <line
                      x1={fromNode.x}
                      y1={fromNode.y}
                      x2={toNode.x}
                      y2={toNode.y}
                      stroke={isSelected || isRelated ? '#3b82f6' : '#e5e7eb'}
                      strokeWidth={isSelected || isRelated ? 2 : 1}
                      className="transition-colors"
                    />
                    <text
                      x={(fromNode.x + toNode.x) / 2}
                      y={(fromNode.y + toNode.y) / 2 - 5}
                      textAnchor="middle"
                      fontSize="10"
                      fill="#6b7280"
                      className="pointer-events-none"
                    >
                      {edge.label}
                    </text>
                  </g>
                );
              })}

              {/* Nodes */}
              {graphData.nodes.map((node) => {
                const isSelected = selectedNode === node.id;
                const isRelated = selectedNode && relatedNodes.includes(node.id);
                const isDimmed = selectedNode && !isSelected && !isRelated;

                return (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isSelected ? 35 : 30}
                      className={`${nodeColors[node.type]} ${isDimmed ? 'opacity-30' : ''} transition-all cursor-pointer hover:opacity-80`}
                      onClick={() => setSelectedNode(node.id)}
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      textAnchor="middle"
                      fontSize="10"
                      fill="white"
                      className={`pointer-events-none ${isDimmed ? 'opacity-30' : ''}`}
                    >
                      {node.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Node Details Panel */}
        {selectedNodeData && (
          <div className="w-80 bg-card border border-border rounded-lg p-4 overflow-y-auto flex-shrink-0">
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {selectedNodeData.label}
            </h3>
            <div className="text-sm text-muted-foreground mb-4 capitalize">
              {selectedNodeData.type}
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Connections</h4>
                <div className="space-y-2">
                  {relatedEdges.map((edge, index) => {
                    const isOutgoing = edge.from === selectedNode;
                    const otherNodeId = isOutgoing ? edge.to : edge.from;
                    const otherNode = mockRelationships.nodes.find(n => n.id === otherNodeId);
                    
                    return (
                      <div key={index} className="text-sm">
                        <span className="text-muted-foreground">
                          {isOutgoing ? '→' : '←'}
                        </span>
                        <span className="ml-2">{edge.label}</span>
                        <span className="ml-2 text-foreground">{otherNode?.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">Actions</h4>
                <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm">
                  View Details
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex-shrink-0">
        <div className="flex flex-wrap gap-4">
          {Object.entries(nodeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${color}`} />
              <span className="text-sm text-muted-foreground capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
