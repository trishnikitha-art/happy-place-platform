/**
 * Timeline - Universal event timeline
 * 
 * Visualizes: Event → Evidence → Recommendation → Execution → Completion
 * 
 * Example flow:
 * Customer Created
 * ↓
 * Lead Qualified
 * ↓
 * Estimate Sent
 * ↓
 * Accepted
 * ↓
 * Crew Scheduled
 * ↓
 * Invoice Created
 * ↓
 * Paid
 * ↓
 * Review Received
 * ↓
 * Referral Requested
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, Clock, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import { timelineApi, type TimelineEvent } from '@/lib/api/client';

export default function TimelinePage() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await timelineApi.getEvents();
      setEvents(data);
    } catch (err) {
      console.error('Failed to load timeline events:', err);
      // Fallback to mock data for development
      setEvents([
        {
          id: 'evt-1',
          type: 'customer-created',
          timestamp: new Date().toISOString(),
          entity: 'Customer',
          entityId: 'customer-1',
          status: 'completed',
          description: 'Customer John Smith created',
        },
        {
          id: 'evt-2',
          type: 'lead-qualified',
          timestamp: new Date().toISOString(),
          entity: 'Lead',
          entityId: 'lead-1',
          status: 'completed',
          description: 'Lead qualified for kitchen remodel',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = selectedEntity === 'all' 
    ? events 
    : events.filter((evt: TimelineEvent) => evt.entity.toLowerCase() === selectedEntity);

  const entities = ['all', ...Array.from(new Set(events.map((e: TimelineEvent) => e.entity.toLowerCase())))];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Timeline</h1>
        <p className="text-muted-foreground">
          Event → Evidence → Recommendation → Execution → Completion
        </p>
      </div>

      {/* Entity Filter */}
      <div className="flex gap-2 mb-6">
        {entities.map((entity) => (
          <button
            key={entity}
            onClick={() => setSelectedEntity(entity)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${selectedEntity === entity
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
              }
            `}
          >
            {entity === 'all' ? 'All Entities' : entity.charAt(0).toUpperCase() + entity.slice(1)}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Vertical Line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

        {/* Events */}
        <div className="space-y-6">
          {filteredEvents.map((event: TimelineEvent, index: number) => (
            <div key={event.id} className="relative pl-12">
              {/* Status Icon */}
              <div className="absolute left-0 top-0 flex items-center justify-center w-8 h-8 bg-background border-2 border-border rounded-full">
                {getStatusIcon(event.status)}
              </div>

              {/* Event Card */}
              <div className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-muted-foreground uppercase">
                        {event.entity}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {event.entityId}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">
                      {event.type.split('-').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </h3>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(event.timestamp)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
