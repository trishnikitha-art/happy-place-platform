/**
 * EventStoreUI - Interface for the event store
 * 
 * Features:
 * - Append events
 * - Stream events
 * - Inspect events
 * - Filter events
 * - Replay events
 * - Reconstruct state from events
 * 
 * Everything is event driven. The UI should reconstruct the business entirely from events.
 */

"use client";

import { useState } from 'react';
import { ObjectInspector } from '../inspector/ObjectInspector';
import { ObjectTimeline, type TimelineEvent } from '../timeline/ObjectTimeline';
import { BusinessReconstruction } from '../reconstruction/BusinessReconstruction';

export interface EventStoreUIProps {
  events: TimelineEvent[];
  onAppend?: (event: TimelineEvent) => void;
  onStream?: () => void;
}

export function EventStoreUI({ events, onAppend, onStream }: EventStoreUIProps) {
  const [activeTab, setActiveTab] = useState<'append' | 'stream' | 'inspect' | 'filter' | 'replay' | 'reconstruct'>('inspect');
  const [selectedEvents, setSelectedEvents] = useState<TimelineEvent[]>(events);
  const [newEvent, setNewEvent] = useState<Partial<TimelineEvent>>({
    type: '',
    description: '',
    status: 'pending'
  });

  const handleAppend = () => {
    if (!newEvent.type || !newEvent.description) return;
    
    const event: TimelineEvent = {
      id: `evt-${Date.now()}`,
      type: newEvent.type,
      timestamp: new Date().toISOString(),
      description: newEvent.description,
      status: newEvent.status || 'pending',
      data: newEvent.data,
      causality: newEvent.causality
    };

    if (onAppend) {
      onAppend(event);
    }
    
    setSelectedEvents([...selectedEvents, event]);
    setNewEvent({ type: '', description: '', status: 'pending' });
  };

  const handleFilter = (filter: string) => {
    if (!filter) {
      setSelectedEvents(events);
      return;
    }

    const filtered = events.filter(event => 
      event.type.toLowerCase().includes(filter.toLowerCase()) ||
      event.description.toLowerCase().includes(filter.toLowerCase()) ||
      event.id.toLowerCase().includes(filter.toLowerCase())
    );

    setSelectedEvents(filtered);
  };

  const stats = {
    total: events.length,
    byType: events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    byStatus: events.reduce((acc, event) => {
      if (event.status) {
        acc[event.status] = (acc[event.status] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  };

  return (
    <div className="border border-border rounded-lg bg-surface">
      {/* Tabs */}
      <div className="flex border-b border-border">
        {(['append', 'stream', 'inspect', 'filter', 'replay', 'reconstruct'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab 
                ? 'bg-primary text-primary-foreground' 
                : 'hover:bg-muted'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Stats */}
        <div className="flex gap-4 mb-4 text-sm">
          <div className="px-2 py-1 rounded bg-blue-100 text-blue-800">
            {stats.total} total events
          </div>
          {Object.entries(stats.byType).map(([type, count]) => (
            <div key={type} className="px-2 py-1 rounded bg-gray-100 text-gray-800">
              {type}: {count}
            </div>
          ))}
        </div>

        {/* Append Tab */}
        {activeTab === 'append' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Append Event</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-text-muted mb-1 block">Type</label>
                <input
                  type="text"
                  value={newEvent.type}
                  onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                  placeholder="e.g., customer.created"
                />
              </div>
              <div>
                <label className="text-sm text-text-muted mb-1 block">Status</label>
                <select
                  value={newEvent.status}
                  onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                >
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-sm text-text-muted mb-1 block">Description</label>
              <textarea
                value={newEvent.description}
                onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                rows={3}
                placeholder="Describe the event..."
              />
            </div>

            <div>
              <label className="text-sm text-text-muted mb-1 block">Data (JSON)</label>
              <textarea
                value={newEvent.data ? JSON.stringify(newEvent.data, null, 2) : ''}
                onChange={(e) => {
                  try {
                    setNewEvent({ ...newEvent, data: JSON.parse(e.target.value) });
                  } catch {
                    // Invalid JSON, ignore
                  }
                }}
                className="w-full px-3 py-2 border border-border rounded bg-surface text-sm font-mono"
                rows={5}
                placeholder='{"key": "value"}'
              />
            </div>

            <button
              onClick={handleAppend}
              className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
            >
              Append Event
            </button>
          </div>
        )}

        {/* Stream Tab */}
        {activeTab === 'stream' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Stream Events</h3>
            
            <div className="text-sm text-text-muted mb-4">
              Stream events in real-time from the event store.
            </div>

            {onStream && (
              <button
                onClick={onStream}
                className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm"
              >
                Start Streaming
              </button>
            )}

            <div className="border border-border rounded p-4 bg-surface">
              <div className="text-sm text-text-muted">
                Streaming status: <span className="text-green-600">Connected</span>
              </div>
            </div>
          </div>
        )}

        {/* Inspect Tab */}
        {activeTab === 'inspect' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Inspect Events</h3>
            
            <div className="text-sm text-text-muted mb-4">
              {selectedEvents.length} events
            </div>

            <ObjectTimeline
              objectId="all"
              objectType="all"
              events={selectedEvents}
              showCausality={true}
              defaultExpanded={false}
            />
          </div>
        )}

        {/* Filter Tab */}
        {activeTab === 'filter' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Filter Events</h3>
            
            <div>
              <label className="text-sm text-text-muted mb-1 block">Filter</label>
              <input
                type="text"
                onChange={(e) => handleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
                placeholder="Filter by type, description, or ID..."
              />
            </div>

            <div className="text-sm text-text-muted">
              {selectedEvents.length} events match filter
            </div>

            <div className="border border-border rounded p-4 bg-surface max-h-96 overflow-y-auto">
              {selectedEvents.map(event => (
                <div key={event.id} className="border-b border-border py-2 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{event.type}</span>
                    <span className="text-xs text-text-muted">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">{event.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Replay Tab */}
        {activeTab === 'replay' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Replay Events</h3>
            
            <div className="text-sm text-text-muted mb-4">
              Replay events to reconstruct state at any point in time.
            </div>

            <div>
              <label className="text-sm text-text-muted mb-1 block">Replay from event ID</label>
              <select
                className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
              >
                <option value="">Select event...</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.type} - {new Date(event.timestamp).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <button className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm">
              Start Replay
            </button>
          </div>
        )}

        {/* Reconstruct Tab */}
        {activeTab === 'reconstruct' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold">Reconstruct State</h3>
            
            <div className="text-sm text-text-muted mb-4">
              Reconstruct business state from events.
            </div>

            <BusinessReconstruction events={events} />
          </div>
        )}
      </div>
    </div>
  );
}
