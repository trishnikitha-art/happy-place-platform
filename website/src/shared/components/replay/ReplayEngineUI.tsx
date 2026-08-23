/**
 * ReplayEngineUI - Interface for the replay engine
 * 
 * Features:
 * - Controls (play, pause, step forward, step backward, reset)
 * - Timeline (visual timeline of events)
 * - Inspector (inspect current state)
 * - Comparison (compare states at different points)
 * - Speed (control replay speed)
 * - State (view current reconstructed state)
 * - Diff (view diff between states)
 * 
 * Time travel through event history.
 */

"use client";

import { useState, useEffect, useMemo } from 'react';
import { ObjectInspector } from '../inspector/ObjectInspector';
import { ProjectionDiff } from '../diff/ProjectionDiff';

export interface ReplayEvent {
  id: string;
  type: string;
  timestamp: string;
  data: Record<string, unknown>;
}

export interface ReplayState {
  eventId: string;
  state: Record<string, unknown>;
  timestamp: string;
}

interface ReplayEngineUIProps {
  events: ReplayEvent[];
  initialState?: Record<string, unknown>;
  onReplay?: (eventId: string) => Record<string, unknown>;
}

export function ReplayEngineUI({ events, initialState, onReplay }: ReplayEngineUIProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [states, setStates] = useState<ReplayState[]>([]);
  const [compareIndex, setCompareIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'inspector' | 'comparison' | 'diff'>('timeline');

  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const currentEvent = sortedEvents[currentIndex];
  const currentState = states[currentIndex];

  // Build state history outside effect
  const stateHistory = useMemo(() => {
    const history: ReplayState[] = [];
    let currentState = initialState || {};

    sortedEvents.forEach((event) => {
      if (onReplay) {
        currentState = onReplay(event.id);
      } else {
        // Simple state update simulation
        currentState = { ...currentState, lastEvent: event };
      }

      history.push({
        eventId: event.id,
        state: currentState,
        timestamp: event.timestamp
      });
    });

    return history;
  }, [sortedEvents, initialState, onReplay]);

  // Initialize replay on mount
  useEffect(() => {
    setStates(stateHistory);
  }, [stateHistory]);

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStepForward = () => {
    setCurrentIndex(Math.min(currentIndex + 1, sortedEvents.length - 1));
  };

  const handleStepBackward = () => {
    setCurrentIndex(Math.max(currentIndex - 1, 0));
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setIsPlaying(false);
  };

  const handleSeek = (index: number) => {
    setCurrentIndex(index);
  };

  const handleCompare = () => {
    setCompareIndex(compareIndex === null ? currentIndex : null);
  };

  // Auto-play effect
  useEffect(() => {
    if (isPlaying && currentIndex < sortedEvents.length - 1) {
      const timeout = setTimeout(() => {
        setCurrentIndex(currentIndex + 1);
      }, 1000 / speed);
      return () => clearTimeout(timeout);
    }
  }, [isPlaying, currentIndex, speed, sortedEvents.length]);

  return (
    <div className="flex h-screen">
      {/* Sidebar - Controls */}
      <div className="w-64 border-r border-border bg-surface p-4">
        <h3 className="text-lg font-bold mb-4">Replay Engine</h3>

        {/* Playback Controls */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 border border-border rounded hover:bg-muted"
              title="Reset"
            >
              ⏮
            </button>
            <button
              onClick={handleStepBackward}
              className="p-2 border border-border rounded hover:bg-muted"
              title="Step Backward"
            >
              ◀
            </button>
            <button
              onClick={handlePlay}
              className={`p-2 border border-border rounded hover:bg-muted ${isPlaying ? 'bg-primary text-primary-foreground' : ''}`}
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              onClick={handleStepForward}
              className="p-2 border border-border rounded hover:bg-muted"
              title="Step Forward"
            >
              ▶
            </button>
            <button
              onClick={() => setCurrentIndex(sortedEvents.length - 1)}
              className="p-2 border border-border rounded hover:bg-muted"
              title="End"
            >
              ⏭
            </button>
          </div>

          <div>
            <label className="text-sm text-text-muted mb-1 block">Speed: {speed}x</label>
            <input
              type="range"
              min="0.5"
              max="4"
              step="0.5"
              value={speed}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div className="text-sm text-text-muted">
            Event: {currentIndex + 1} / {sortedEvents.length}
          </div>
        </div>

        {/* Tabs */}
        <div className="space-y-2">
          {(['timeline', 'inspector', 'comparison', 'diff'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full px-3 py-2 text-sm text-left rounded transition-colors ${
                activeTab === tab 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-muted'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Compare Button */}
        <button
          onClick={handleCompare}
          className={`w-full mt-4 px-3 py-2 text-sm rounded transition-colors ${
            compareIndex !== null 
              ? 'bg-blue-500 text-white' 
              : 'border border-border hover:bg-muted'
          }`}
        >
          {compareIndex !== null ? 'Clear Compare' : 'Compare State'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Timeline */}
        <div className="border-b border-border p-4 bg-surface">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm font-medium">Timeline</span>
            <span className="text-xs text-text-muted">
              {currentEvent ? new Date(currentEvent.timestamp).toLocaleString() : 'No event'}
            </span>
          </div>
          
          <div className="relative h-8 bg-gray-200 rounded">
            {sortedEvents.map((event, index) => (
              <div
                key={event.id}
                onClick={() => handleSeek(index)}
                className={`absolute top-0 bottom-0 w-1 cursor-pointer transition-colors ${
                  index === currentIndex ? 'bg-primary' : 
                  index < currentIndex ? 'bg-green-500' : 
                  'bg-gray-400'
                }`}
                style={{ left: `${(index / sortedEvents.length) * 100}%` }}
                title={`${event.type} - ${new Date(event.timestamp).toLocaleString()}`}
              />
            ))}
            
            {compareIndex !== null && (
              <div
                className="absolute top-0 bottom-0 w-1 bg-blue-500"
                style={{ left: `${(compareIndex / sortedEvents.length) * 100}%` }}
                title="Compare point"
              />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          {activeTab === 'timeline' && (
            <div className="space-y-2">
              {sortedEvents.map((event, index) => (
                <div
                  key={event.id}
                  onClick={() => handleSeek(index)}
                  className={`p-3 border border-border rounded cursor-pointer transition-colors ${
                    index === currentIndex ? 'bg-primary text-primary-foreground' : 
                    index < currentIndex ? 'bg-green-50' : 
                    'hover:bg-muted'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm">{event.type}</span>
                    <span className="text-xs text-text-muted">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {index === currentIndex && (
                    <div className="text-xs text-text-muted">
                      Current event
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'inspector' && (
            <div>
              <h3 className="text-lg font-bold mb-4">Current State</h3>
              
              {currentState ? (
                <ObjectInspector data={currentState.state} name="state" defaultExpanded={true} />
              ) : (
                <div className="text-center py-8 text-text-muted">
                  No state available
                </div>
              )}
            </div>
          )}

          {activeTab === 'comparison' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-bold mb-4">
                  {compareIndex !== null ? `State at Event ${compareIndex + 1}` : 'Select Compare Point'}
                </h3>
                
                {compareIndex !== null && states[compareIndex] ? (
                  <ObjectInspector data={states[compareIndex].state} name="stateA" defaultExpanded={false} />
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    Select a compare point
                  </div>
                )}
              </div>
              
              <div>
                <h3 className="text-lg font-bold mb-4">Current State</h3>
                
                {currentState ? (
                  <ObjectInspector data={currentState.state} name="stateB" defaultExpanded={false} />
                ) : (
                  <div className="text-center py-8 text-text-muted">
                    No state available
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'diff' && (
            <div>
              <h3 className="text-lg font-bold mb-4">State Diff</h3>
              
              {compareIndex !== null && states[compareIndex] && currentState ? (
                <ProjectionDiff
                  projectionA={states[compareIndex].state}
                  projectionB={currentState.state}
                  nameA={`State at Event ${compareIndex + 1}`}
                  nameB="Current State"
                />
              ) : (
                <div className="text-center py-8 text-text-muted">
                  Select a compare point to view diff
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
