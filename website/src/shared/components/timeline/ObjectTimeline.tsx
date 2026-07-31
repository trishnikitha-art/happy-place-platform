/**
 * ObjectTimeline - Universal timeline component for all object types
 * 
 * Every object needs a timeline:
 * - Customer Timeline
 * - Mission Timeline
 * - Worker Timeline
 * - Project Timeline
 * - Artifact Timeline
 * - Recommendation Timeline
 * 
 * Generated automatically from events.
 * Event-driven UI reconstructs business state from events.
 */

"use client";

import { useState } from 'react';
import { StatusBadge } from '../ui/StatusBadge';
import { ObjectInspector } from '../inspector/ObjectInspector';

export interface TimelineEvent {
  id: string;
  type: string;
  timestamp: string;
  description: string;
  status?: string;
  data?: any;
  causality?: {
    causedBy?: string[];
    caused?: string[];
  };
  objectId?: string;
  objectType?: string;
}

interface ObjectTimelineProps {
  objectId: string;
  objectType: string;
  events: TimelineEvent[];
  showCausality?: boolean;
  defaultExpanded?: boolean;
}

export function ObjectTimeline({ 
  objectId, 
  objectType, 
  events, 
  showCausality = false,
  defaultExpanded = false 
}: ObjectTimelineProps) {
  const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const getEventColor = (type: string) => {
    if (type.includes('create') || type.includes('start')) return 'border-green-500';
    if (type.includes('complete') || type.includes('finish')) return 'border-blue-500';
    if (type.includes('error') || type.includes('fail')) return 'border-red-500';
    if (type.includes('update') || type.includes('modify')) return 'border-yellow-500';
    return 'border-gray-500';
  };

  const getCausalityChain = (eventId: string): TimelineEvent[] => {
    const chain: TimelineEvent[] = [];
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

  const getDownstreamEvents = (eventId: string): TimelineEvent[] => {
    const downstream: TimelineEvent[] = [];
    
    events.forEach(event => {
      if (event.causality?.causedBy?.includes(eventId)) {
        downstream.push(event);
      }
    });
    
    return downstream;
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">{objectType} Timeline</h3>
          <span className="text-sm text-text-muted">{objectId}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">{sortedEvents.length} events</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-sm text-primary hover:underline"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {sortedEvents.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No events for this object
        </div>
      ) : (
        <div className="space-y-4">
          {sortedEvents.map((event, index) => (
            <div key={event.id} className="relative pl-6">
              <div className={`absolute left-0 top-2 w-3 h-3 rounded-full border-2 ${getEventColor(event.type)}`} />
              <div className="absolute left-1.5 top-5 bottom-0 w-0.5 bg-gray-200" />
              
              <div
                className={`border border-border rounded p-3 bg-surface cursor-pointer transition-colors ${
                  selectedEvent?.id === event.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
                onClick={() => setSelectedEvent(selectedEvent?.id === event.id ? null : event)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{event.type}</span>
                    {event.status && <StatusBadge status={event.status} />}
                  </div>
                  <span className="text-xs text-text-muted">
                    {new Date(event.timestamp).toLocaleString()}
                  </span>
                </div>
                
                <div className="text-sm mb-2">{event.description}</div>
                
                {showCausality && event.causality && (
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    {event.causality.causedBy && event.causality.causedBy.length > 0 && (
                      <span>
                        Caused by: {event.causality.causedBy.length} events
                      </span>
                    )}
                    {event.causality.caused && event.causality.caused.length > 0 && (
                      <span>
                        Caused: {event.causality.caused.length} events
                      </span>
                    )}
                  </div>
                )}
              </div>

              {selectedEvent?.id === event.id && expanded && (
                <div className="mt-4 ml-4 space-y-4">
                  {/* Causality Chain */}
                  {showCausality && event.causality?.causedBy && event.causality.causedBy.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Causality Chain</h4>
                      <div className="space-y-2">
                        {getCausalityChain(event.id).map((chainEvent) => (
                          <div key={chainEvent.id} className="text-xs p-2 bg-muted rounded">
                            {chainEvent.type} - {new Date(chainEvent.timestamp).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Downstream Events */}
                  {showCausality && event.causality?.caused && event.causality.caused.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Downstream Events</h4>
                      <div className="space-y-2">
                        {getDownstreamEvents(event.id).map((downstreamEvent) => (
                          <div key={downstreamEvent.id} className="text-xs p-2 bg-muted rounded">
                            {downstreamEvent.type} - {new Date(downstreamEvent.timestamp).toLocaleString()}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Event Data */}
                  {event.data && (
                    <div>
                      <h4 className="text-sm font-medium mb-2">Event Data</h4>
                      <ObjectInspector data={event.data} name="data" defaultExpanded={false} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
