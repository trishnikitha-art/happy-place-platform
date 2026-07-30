/**
 * Execution View - Execution Plans like Git commits
 * 
 * States:
 * - Created
 * - Pending
 * - Running
 * - Succeeded
 * - Failed
 * - Rolled Back
 * 
 * Every execution is expandable to show details.
 */

'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, PlayCircle, CheckCircle, XCircle, RotateCcw, Clock, GitCommit } from 'lucide-react';
import { executionApi, type ExecutionPlan } from '@/lib/api/client';

export default function ExecutionPage() {
  const [executionPlans, setExecutionPlans] = useState<ExecutionPlan[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'running' | 'succeeded' | 'failed' | 'rolled-back'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExecutionPlans();
  }, []);

  const loadExecutionPlans = async () => {
    try {
      setLoading(true);
      const data = await executionApi.getAll();
      setExecutionPlans(data);
    } catch (err) {
      console.error('Failed to load execution plans:', err);
      // Fallback to mock data for development
      setExecutionPlans([
        {
          id: 'exec-1',
          name: 'Kitchen Remodel - Phase 1',
          status: 'running',
          createdAt: new Date().toISOString(),
          startedAt: new Date().toISOString(),
          recommendationId: 'rec-1',
          steps: [
            { id: 'step-1', name: 'Schedule crew', status: 'completed', completedAt: new Date().toISOString() },
            { id: 'step-2', name: 'Order materials', status: 'completed', completedAt: new Date().toISOString() },
            { id: 'step-3', name: 'Site preparation', status: 'in-progress', startedAt: new Date().toISOString() },
          ],
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (id: string) => {
    try {
      await executionApi.rollback(id);
      await loadExecutionPlans();
    } catch (err) {
      console.error('Failed to rollback execution:', err);
    }
  };

  const filteredExecutions = filter === 'all' 
    ? executionPlans 
    : executionPlans.filter((exec: ExecutionPlan) => exec.status === filter);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'running':
        return <PlayCircle size={16} className="text-blue-500" />;
      case 'succeeded':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'failed':
        return <XCircle size={16} className="text-red-500" />;
      case 'rolled-back':
        return <RotateCcw size={16} className="text-orange-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'running': 'bg-blue-100 text-blue-800',
      'succeeded': 'bg-green-100 text-green-800',
      'failed': 'bg-red-100 text-red-800',
      'rolled-back': 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Execution Plans</h1>
        <p className="text-muted-foreground mb-6">Execution plans like Git commits - every execution is traceable</p>
        <div className="text-center py-12 text-muted-foreground">Loading execution plans...</div>
      </div>
    );
  }

  const getStepStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'completed': 'bg-green-100 text-green-800',
      'in-progress': 'bg-blue-100 text-blue-800',
      'pending': 'bg-gray-100 text-gray-800',
      'failed': 'bg-red-100 text-red-800',
      'rolled-back': 'bg-orange-100 text-orange-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Execution Plans</h1>
        <p className="text-muted-foreground">
          Execution plans like Git commits - every execution is traceable
        </p>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(['all', 'pending', 'running', 'succeeded', 'failed', 'rolled-back'] as const).map((status) => (
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

      {/* Execution Plans */}
      <div className="space-y-4">
        {filteredExecutions.map((execution: ExecutionPlan) => (
          <div
            key={execution.id}
            className="bg-card border border-border rounded-lg overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <GitCommit size={16} className="text-primary" />
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                      {execution.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {execution.id}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-1">
                    {execution.name}
                  </h3>
                  <div className="text-sm text-muted-foreground">
                    Created: {formatDate(execution.createdAt)}
                    {execution.startedAt && ` • Started: ${formatDate(execution.startedAt)}`}
                    {execution.completedAt && ` • Completed: ${formatDate(execution.completedAt)}`}
                    {execution.failedAt && ` • Failed: ${formatDate(execution.failedAt)}`}
                    {execution.rolledBackAt && ` • Rolled Back: ${formatDate(execution.rolledBackAt)}`}
                  </div>
                  {execution.error && (
                    <div className="mt-2 text-sm text-red-600">
                      Error: {execution.error}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setSelectedExecution(
                    selectedExecution === execution.id ? null : execution.id
                  )}
                  className="p-2 hover:bg-accent rounded transition-colors"
                >
                  <ChevronRight 
                    size={20} 
                    className={selectedExecution === execution.id ? 'rotate-90' : ''} 
                  />
                </button>
              </div>
            </div>

            {/* Expanded Steps */}
            {selectedExecution === execution.id && (
              <div className="p-4 border-t border-border bg-muted/30">
                <h4 className="text-sm font-medium text-foreground mb-3">Execution Steps</h4>
                <div className="space-y-2">
                  {execution.steps.map((step: any, index: number) => (
                    <div key={step.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getStepStatusColor(step.status)}`}>
                          {index + 1}
                        </div>
                        {index < execution.steps.length - 1 && (
                          <div className="w-0.5 h-8 bg-border mt-1" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{step.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStepStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>
                        {step.completedAt && (
                          <div className="text-xs text-muted-foreground">
                            Completed: {formatDate(step.completedAt)}
                          </div>
                        )}
                        {'startedAt' in step && step.startedAt && step.status === 'in-progress' && (
                          <div className="text-xs text-muted-foreground">
                            Started: {formatDate(step.startedAt)}
                          </div>
                        )}
                        {'error' in step && step.error && (
                          <div className="text-xs text-red-600">
                            Error: {step.error}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredExecutions.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No execution plans found with current filter.
        </div>
      )}
    </div>
  );
}
