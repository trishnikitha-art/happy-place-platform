/**
 * Recommendation Review - Human-in-the-loop recommendation approval
 * 
 * Flow:
 * Evidence
 * ↓
 * Recommendation
 * ↓
 * Approve / Reject / Modify
 * ↓
 * Execution Plan
 */

'use client';

import { useState, useEffect } from 'react';
import { Check, X, Edit, ChevronRight, Lightbulb } from 'lucide-react';
import { recommendationApi, type Recommendation } from '@/lib/api/client';

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecommendations();
  }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const data = await recommendationApi.getAll();
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
      // Fallback to mock data for development
      setRecommendations([
        {
          id: 'rec-1',
          action: 'Schedule morning appointment',
          confidence: 0.85,
          reasoning: 'Customer prefers morning appointments based on historical data',
          evidenceId: 'evd-1',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'rec-2',
          action: 'Send weekly progress updates',
          confidence: 0.92,
          reasoning: 'Customer has requested frequent updates on previous projects',
          evidenceId: 'evd-2',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await recommendationApi.approve(id);
      await loadRecommendations();
    } catch (err) {
      console.error('Failed to approve recommendation:', err);
    }
  };

  const handleReject = async (id: string) => {
    try {
      await recommendationApi.reject(id);
      await loadRecommendations();
    } catch (err) {
      console.error('Failed to reject recommendation:', err);
    }
  };

  const handleModify = async (id: string) => {
    try {
      await recommendationApi.modify(id, {});
      await loadRecommendations();
    } catch (err) {
      console.error('Failed to modify recommendation:', err);
    }
  };

  const filteredRecommendations = filter === 'all' 
    ? recommendations 
    : recommendations.filter((rec: Recommendation) => rec.status === filter);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Recommendations</h1>
        <p className="text-muted-foreground mb-6">Evidence → Recommendation → Approve/Reject/Modify → Execution Plan</p>
        <div className="text-center py-12 text-muted-foreground">Loading recommendations...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Recommendations</h1>
        <p className="text-muted-foreground">
          Evidence → Recommendation → Approve/Reject/Modify → Execution Plan
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`
              px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${filter === status
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground hover:bg-muted/80'
              }
            `}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Recommendations List */}
      <div className="space-y-4">
        {filteredRecommendations.map((recommendation) => (
          <div
            key={recommendation.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb size={16} className="text-primary" />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(recommendation.status)}`}>
                      {recommendation.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(recommendation.confidence * 100).toFixed(0)}% confidence
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {recommendation.action}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {recommendation.reasoning}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedRecommendation(
                    selectedRecommendation === recommendation.id ? null : recommendation.id
                  )}
                  className="p-2 hover:bg-accent rounded transition-colors"
                >
                  <ChevronRight 
                    size={20} 
                    className={selectedRecommendation === recommendation.id ? 'rotate-90' : ''} 
                  />
                </button>
              </div>
            </div>

            {/* Expanded Actions */}
            {selectedRecommendation === recommendation.id && (
              <div className="p-4 border-t border-border bg-muted/30">
                {recommendation.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(recommendation.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                    >
                      <Check size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleModify(recommendation.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                      <Edit size={16} />
                      Modify
                    </button>
                    <button
                      onClick={() => handleReject(recommendation.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                    >
                      <X size={16} />
                      Reject
                    </button>
                  </div>
                )}
                {recommendation.status === 'approved' && (
                  <div className="text-sm text-muted-foreground">
                    ✓ Approved - Execution plan created
                  </div>
                )}
                {recommendation.status === 'rejected' && (
                  <div className="text-sm text-muted-foreground">
                    ✗ Rejected
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredRecommendations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No recommendations found with current filter.
        </div>
      )}
    </div>
  );
}
