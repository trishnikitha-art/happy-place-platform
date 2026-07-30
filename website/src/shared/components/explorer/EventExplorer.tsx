/**
 * Event Explorer - Event-driven exploration with filter, replay, stream, causality
 * 
 * Everything is event driven. The UI should reconstruct the business entirely from events.
 * 
 * Features:
 * - Filter events by type, object, time range
 * - Replay events to reconstruct state
 * - Stream events in real-time
 * - View causality and dependencies
 * - Time travel through event history
 */

"use client";

import { useState } from 'react';
import { ObjectInspector } from '../inspector/ObjectInspector';

interface Event {
  id: string;
  type: string;
  objectType: string;
  objectId: string;
  timestamp: string;
  data: any;
  causality?: {
    causedBy?: string[];
    caused?: string[];
  };
}

interface EventExplorerProps {
  events: Event[];
  onReplay?: (eventId: string) => void;
  onStream?: () => void;
}

export function EventExplorer({ events, onReplay, onStream }: EventExplorerProps) {
  const [filter, setFilter] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedObject, setSelectedObject] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCausality, setShowCausality] = useState(false);
  const [replayMode, setReplayMode] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  const types = Array.from(new Set(events.map(e => e.type)));
  const objects = Array.from(new Set(events.map(e => e.objectType)));

  const filteredEvents = events.filter(event => {
    const matchesFilter = filter === '' || 
      event.id.toLowerCase().includes(filter.toLowerCase()) ||
      event.type.toLowerCase().includes(filter.toLowerCase()) ||
      event.objectType.toLowerCase().includes(filter.toLowerCase());
    const matchesType = selectedType === 'all' || event.type === selectedType;
    const matchesObject = selectedObject === 'all' || event.objectType === selectedObject;
    return matchesFilter && matchesType && matchesObject;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const handleReplay = (eventId: string) => {
    if (onReplay) {
      onReplay(eventId);
    }
    setReplayMode(true);
  };

  const handleReplayStep = (direction: 'next' | 'prev') => {
    if (direction === 'next') {
      setReplayIndex(Math.min(replayIndex + 1, sortedEvents.length - 1));
    } else {
      setReplayIndex(Math.max(replayIndex - 1, 0));
    }
  };

  const getCausalityChain = (eventId: string): Event[] => {
    const chain: Event[] = [];
    const visited = new Set<string>();
    
    const traverse = (currentId: string) => {
      if (visited.has(currentId)) return;
      visited.add(currentId);
      
      const event = events.find(e => e.id === currentId);
      if (event) {
        chain.push(event);
        if (event.causality?.causedBy) {
          event.causality.causedBy.forEach(traverse);
        }
      }
    };
    
    traverse(eventId);
    return chain.reverse();
  };

  const getDownstreamEvents = (eventId: string): Event[] => {
    const downstream: Event[] = [];
    
    events.forEach(event => {
      if (event.causality?.causedBy?.includes(eventId)) {
        downstream.push(event);
      }
    });
    
    return downstream;
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar - Filters */}
      <div className="w-64 border-r border-border bg-surface p-4">
        <h3 className="text-lg font-bold mb-4">Event Explorer</h3>
        
        <div className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Search events..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
            />
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Event Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
            >
              <option value="all">All Types</option>
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Object Type</label>
            <select
              value={selectedObject}
              onChange={(e) => setSelectedObject(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded bg-surface text-sm"
            >
              <option value="all">All Objects</option>
              {objects.map(obj => (
                <option key={obj} value={obj}>{obj}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="causality"
              checked={showCausality}
              onChange={(e) => setShowCausality(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="causality" className="text-sm">Show Causality</label>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="replay"
              checked={replayMode}
              onChange={(e) => setReplayMode(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="replay" className="text-sm">Replay Mode</label>
          </div>

          {onStream && (
            <button
              onClick={onStream}
              className="w-full px-3 py-2 bg-primary text-primary-foreground rounded text-sm"
            >
              Stream Events
            </button>
          )}
        </div>

        <div className="mt-4 text-sm text-text-muted">
          {sortedEvents.length} events
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Events List */}
        <div className="w-96 border-r border-border bg-surface p-4 overflow-y-auto">
          {replayMode ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Replay Mode</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReplayStep('prev')}
                    disabled={replayIndex === 0}
                    className="px-2 py-1 bg-muted rounded text-sm disabled:opacity-50"
                  >
                    ◀
                  </button>
                  <span className="text-sm">
                    {replayIndex + 1} / {sortedEvents.length}
                  </span>
                  <button
                    onClick={() => handleReplayStep('next')}
                    disabled={replayIndex === sortedEvents.length - 1}
                    className="px-2 py-1 bg-muted rounded text-sm disabled:opacity-50"
                  >
                    ▶
                  </button>
                </div>
              </div>
              
              {sortedEvents[replayIndex] && (
                <div className="border border-border rounded p-3 bg-primary text-primary-foreground">
                  <div className="font-medium">{sortedEvents[replayIndex].type}</div>
                  <div className="text-xs opacity-75">
                    {new Date(sortedEvents[replayIndex].timestamp).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedEvents.map((event, index) => (
                <div
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className={`p-3 border border-border rounded cursor-pointer transition-colors ${
                    selectedEvent?.id === event.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{event.type}</span>
                    <span className="text-xs text-text-muted">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-xs text-text-muted">
                    {event.objectType} - {event.objectId}
                  </div>
                  {showCausality && event.causality && (
                    <div className="mt-2 text-xs">
                      <span className="text-text-muted">Caused by:</span>
                      <span className="ml-1">{event.causality.causedBy?.join(', ') || 'None'}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Details Panel */}
        <div className="flex-1 p-4 overflow-y-auto">
          {selectedEvent ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">Event Details</h3>
                <button
                  onClick={() => handleReplay(selectedEvent.id)}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm"
                >
                  Replay from Here
                </button>
              </div>

              <div className="border border-border rounded p-4 bg-surface">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-text-muted">ID:</span>
                    <span className="ml-2">{selectedEvent.id}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Type:</span>
                    <span className="ml-2">{selectedEvent.type}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Object:</span>
                    <span className="ml-2">{selectedEvent.objectType}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Object ID:</span>
                    <span className="ml-2">{selectedEvent.objectId}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-muted">Timestamp:</span>
                    <span className="ml-2">{new Date(selectedEvent.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Causality */}
              {selectedEvent.causality && (
                <div className="border border-border rounded p-4 bg-surface">
                  <h4 className="text-sm font-medium mb-2">Causality</h4>
                  
                  {selectedEvent.causality.causedBy && selectedEvent.causality.causedBy.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-text-muted mb-2">Caused By:</div>
                      <div className="space-y-2">
                        {getCausalityChain(selectedEvent.id).map((event) => (
                          <div key={event.id} className="text-xs p-2 bg-muted rounded">
                            {event.type} - {new Date(event.timestamp).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedEvent.causality.caused && selectedEvent.causality.caused.length > 0 && (
                    <div>
                      <div className="text-xs text-text-muted mb-2">Caused:</div>
                      <div className="space-y-2">
                        {getDownstreamEvents(selectedEvent.id).map((event) => (
                          <div key={event.id} className="text-xs p-2 bg-muted rounded">
                            {event.type} - {new Date(event.timestamp).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Event Data */}
              <div>
                <h4 className="text-sm font-medium mb-2">Event Data</h4>
                <ObjectInspector data={selectedEvent.data} name="data" defaultExpanded={true} />
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-text-muted">
              Select an event to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
