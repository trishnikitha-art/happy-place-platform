/**
 * CapabilityRegistry - Orchestration primitive for viewing all capabilities
 * 
 * Displays all capabilities in the system with their owned resources.
 * Everything belongs to a capability. Nothing else owns business logic.
 * 
 * Capabilities:
 * - Customer, Review, Estimate, Project, Mission, Worker, Recommendation
 * - Connector, Campaign, Artifact, Employee, Observation, Event
 * - Analytics, Agent
 * 
 * Each capability owns: types, actions, hooks, projection, components, motion, events, permissions, analytics
 * 
 * This is a reusable orchestration primitive, not a page.
 * Screens compose this component.
 * 
 * Uses self-registering capability registry system.
 */

"use client";

import { useState, useEffect } from 'react';
import { getAllCapabilities, subscribeToCapabilities, type CapabilityRegistration } from '@/shared/registry/CapabilityRegistry';

interface CapabilityRegistryProps {
  autoRegister?: boolean;
}

export function CapabilityRegistry({ autoRegister = true }: CapabilityRegistryProps) {
  const [capabilities, setCapabilities] = useState<CapabilityRegistration[]>([]);

  useEffect(() => {
    // Subscribe to capability registry changes
    const unsubscribe = subscribeToCapabilities((caps) => {
      setCapabilities(caps);
    });

    // Initial load
    setCapabilities(getAllCapabilities());

    // Auto-register default capabilities if enabled
    if (autoRegister && capabilities.length === 0) {
      registerDefaultCapabilities();
    }

    return unsubscribe;
  }, [autoRegister, capabilities.length]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'deprecated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-border rounded-lg p-4 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold">Capability Registry</h3>
        <span className="text-sm text-text-muted">{capabilities.length} capabilities</span>
      </div>

      {capabilities.length === 0 ? (
        <div className="text-center py-8 text-text-muted">
          No capabilities registered
        </div>
      ) : (
        <div className="space-y-3">
          {capabilities.map((capability) => (
            <div key={capability.id} className="border border-border rounded p-4 bg-surface">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{capability.name}</span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(capability.status)}`}>
                    {capability.status}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span>v{capability.version}</span>
                  <span>{capability.lastUpdated}</span>
                </div>
              </div>

              <div>
                <div className="text-xs text-text-muted mb-2">Owns:</div>
                <div className="flex flex-wrap gap-2">
                  {capability.owns.map((owned) => (
                    <span key={owned} className="px-2 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      {owned}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper function to register default capabilities
function registerDefaultCapabilities() {
  const { registerCapability } = require('@/shared/registry/CapabilityRegistry');
  
  const defaultCapabilities = [
    {
      id: 'customer',
      name: 'Customer',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'review',
      name: 'Review',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'estimate',
      name: 'Estimate',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'project',
      name: 'Project',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'mission',
      name: 'Mission',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'worker',
      name: 'Worker',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'recommendation',
      name: 'Recommendation',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'connector',
      name: 'Connector',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'campaign',
      name: 'Campaign',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'artifact',
      name: 'Artifact',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'employee',
      name: 'Employee',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'observation',
      name: 'Observation',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'event',
      name: 'Event',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'analytics',
      name: 'Analytics',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    },
    {
      id: 'agent',
      name: 'Agent',
      status: 'active' as const,
      owns: ['types', 'actions', 'hooks', 'projection', 'components', 'motion', 'events', 'permissions', 'analytics'],
      version: '1.0.0',
      lastUpdated: '2026-07-27'
    }
  ];

  defaultCapabilities.forEach(cap => registerCapability(cap));
}
