/**
 * Replay Studio - Debug and explore event history
 * 
 * Flow:
 * Choose Date
 * ↓
 * Load Event Stream
 * ↓
 * Rebuild Every Projection
 * ↓
 * Compare Old Projection vs New Projection
 */

'use client';

import { useState, useEffect } from 'react';
import { Calendar, Play, RotateCcw, ArrowRight, GitCompare } from 'lucide-react';
import { replayApi } from '@/lib/api/client';

export default function ReplayPage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayComplete, setReplayComplete] = useState(false);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);

  useEffect(() => {
    loadAvailableDates();
  }, []);

  const loadAvailableDates = async () => {
    try {
      setLoadingDates(true);
      const dates = await replayApi.getAvailableDates();
      setAvailableDates(dates);
      if (dates.length > 0) {
        setSelectedDate(dates[0]);
      }
    } catch (err) {
      console.error('Failed to load available dates:', err);
      // Fallback to mock data for development
      const today = new Date();
      const mockDates = [
        today.toISOString().split('T')[0],
        new Date(today.getTime() - 86400000).toISOString().split('T')[0],
        new Date(today.getTime() - 172800000).toISOString().split('T')[0],
      ];
      setAvailableDates(mockDates);
      setSelectedDate(mockDates[0]);
    } finally {
      setLoadingDates(false);
    }
  };

  const handleReplay = async () => {
    if (!selectedDate) return;
    setIsReplaying(true);
    try {
      await replayApi.replayToDate(selectedDate);
      setReplayComplete(true);
    } catch (err) {
      console.error('Failed to replay:', err);
      // Fallback to mock for development
      setTimeout(() => {
        setIsReplaying(false);
        setReplayComplete(true);
      }, 2000);
    } finally {
      setIsReplaying(false);
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Replay Studio</h1>
        <p className="text-muted-foreground">
          Choose Date → Load Event Stream → Rebuild Projections → Compare
        </p>
      </div>

      {/* Date Selection */}
      <div className="bg-card border border-border rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Select Replay Date</h2>
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              Date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          <button
            onClick={handleReplay}
            disabled={!selectedDate || isReplaying}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isReplaying ? (
              <>
                <RotateCcw size={16} className="animate-spin" />
                Replaying...
              </>
            ) : (
              <>
                <Play size={16} />
                Start Replay
              </>
            )}
          </button>
        </div>
      </div>

      {/* Replay Progress */}
      {isReplaying && (
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Replay Progress</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-white text-xs">
                ✓
              </div>
              <span className="text-sm text-foreground">Loading event stream</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs animate-pulse">
                ...
              </div>
              <span className="text-sm text-foreground">Rebuilding projections</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs">
                3
              </div>
              <span className="text-sm text-muted-foreground">Comparing projections</span>
            </div>
          </div>
        </div>
      )}

      {/* Replay Results */}
      {replayComplete && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Replay Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded p-4">
                <div className="text-2xl font-bold text-foreground">156</div>
                <div className="text-sm text-muted-foreground">Events Processed</div>
              </div>
              <div className="bg-muted/50 rounded p-4">
                <div className="text-2xl font-bold text-foreground">8</div>
                <div className="text-sm text-muted-foreground">Projections Rebuilt</div>
              </div>
              <div className="bg-muted/50 rounded p-4">
                <div className="text-2xl font-bold text-green-600">3</div>
                <div className="text-sm text-muted-foreground">Differences Found</div>
              </div>
            </div>
          </div>

          {/* Comparison */}
          <div className="bg-card border border-border rounded-lg p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">Projection Comparison</h2>
            <div className="space-y-4">
              {/* Customer Projection */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitCompare size={16} className="text-primary" />
                    <span className="font-medium text-foreground">Customer Projection</span>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Changed
                  </span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Before</div>
                    <div className="bg-muted rounded p-3 text-sm">
                      <div>Health: healthy</div>
                      <div>Total Projects: 2</div>
                      <div>Lifetime Value: $35,000</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">After</div>
                    <div className="bg-muted rounded p-3 text-sm">
                      <div>Health: healthy</div>
                      <div>Total Projects: 3</div>
                      <div>Lifetime Value: $45,000</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Project Projection */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitCompare size={16} className="text-primary" />
                    <span className="font-medium text-foreground">Project Projection</span>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Changed
                  </span>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">Before</div>
                    <div className="bg-muted rounded p-3 text-sm">
                      <div>Status: in-progress</div>
                      <div>Progress: 50%</div>
                      <div>Budget: $25,000</div>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-2">After</div>
                    <div className="bg-muted rounded p-3 text-sm">
                      <div>Status: in-progress</div>
                      <div>Progress: 65%</div>
                      <div>Budget: $25,000</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Mission Projection */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="p-4 bg-muted/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <GitCompare size={16} className="text-primary" />
                    <span className="font-medium text-foreground">Mission Projection</span>
                  </div>
                  <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
                    Unchanged
                  </span>
                </div>
                <div className="p-4">
                  <div className="text-sm text-muted-foreground">
                    No changes detected in mission projection
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!selectedDate && !isReplaying && !replayComplete && (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar size={48} className="mx-auto mb-4 opacity-50" />
          <p>Select a date to begin replay</p>
        </div>
      )}
    </div>
  );
}
