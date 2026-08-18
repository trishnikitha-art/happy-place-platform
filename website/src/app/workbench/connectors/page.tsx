/**
 * Connector Studio - View and manage connectors
 * 
 * Shows for each connector:
 * - Health
 * - Capabilities
 * - Schemas
 * - Resources
 * - Activity
 * 
 * Every connector looks identical.
 */

'use client';

import { useState, useEffect } from 'react';
import { Plug, Activity, Database, CheckCircle, XCircle, Clock, RefreshCw, Cloud } from 'lucide-react';

interface ConnectorData {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  health: 'healthy' | 'degraded' | 'unhealthy';
  lastSync: string;
  capabilities: string[];
  resources: number;
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<ConnectorData[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driveAuthStatus, setDriveAuthStatus] = useState<boolean>(false);

  useEffect(() => {
    loadConnectors();
    checkDriveAuth();
  }, []);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use Drive discovery API instead of connector API
      const response = await fetch('/api/drive/discovery');
      if (!response.ok) {
        throw new Error('Drive discovery failed');
      }
      
      const structure = await response.json();
      
      // Map Drive structure to ConnectorData format
      const driveConnector: ConnectorData = {
        id: 'google-drive',
        name: 'Google Drive',
        type: 'google-drive',
        status: structure.myDrive ? 'active' : 'inactive',
        health: structure.myDrive ? 'healthy' : 'unhealthy',
        lastSync: new Date().toISOString(),
        capabilities: ['readable', 'discoverable', 'downloadable'],
        resources: (structure.sharedDrives?.length || 0) + (structure.hppFolders?.length || 0) + (structure.recentFolders?.length || 0),
      };
      
      setConnectors([driveConnector]);
    } catch (err) {
      console.error('Failed to load connectors:', err);
      setError('Failed to load connectors');
      // Fallback to placeholder
      setConnectors([
        {
          id: 'google-drive',
          name: 'Google Drive',
          type: 'google-drive',
          status: 'inactive',
          health: 'unhealthy',
          lastSync: new Date().toISOString(),
          capabilities: ['readable', 'discoverable', 'downloadable'],
          resources: 0,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const checkDriveAuth = async () => {
    try {
      const response = await fetch('/api/drive/auth/status');
      if (response.ok) {
        const data = await response.json();
        setDriveAuthStatus(data.authenticated || false);
      }
    } catch (err) {
      console.error('Failed to check Drive auth status:', err);
    }
  };

  const handleSync = async (id: string) => {
    try {
      // For Google Drive, trigger discovery refresh
      await loadConnectors();
    } catch (err) {
      console.error('Failed to sync connector:', err);
    }
  };

  const handleConnectDrive = async () => {
    try {
      window.location.href = '/api/drive/oauth/authorize';
    } catch (err) {
      console.error('Failed to initiate OAuth:', err);
    }
  };

  const handleOpenDrive = () => {
    // Navigate to Drive Explorer
    window.location.href = '/workbench/explorer/drive';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'error': 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getHealthColor = (health: string) => {
    const colors: Record<string, string> = {
      'healthy': 'text-green-500',
      'degraded': 'text-yellow-500',
      'unhealthy': 'text-red-500',
    };
    return colors[health] || 'text-gray-500';
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'degraded':
        return <Clock size={16} className="text-yellow-500" />;
      case 'unhealthy':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Clock size={16} className="text-gray-500" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Connector Studio</h1>
        <p className="text-muted-foreground">
          Health, Capabilities, Schemas, Resources, Activity
        </p>
      </div>

      {/* Connectors Grid */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading connectors...</div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {connectors.map((connector) => (
            <div
              key={connector.id}
              className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              {/* Header */}
              <div className="p-4 border-b border-border">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Plug size={24} className="text-primary" />
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{connector.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(connector.status)}`}>
                        {connector.status}
                      </span>
                    </div>
                  </div>
                  <div className={getHealthColor(connector.health)}>
                    {getHealthIcon(connector.health)}
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Health</span>
                  <span className={`font-medium ${getHealthColor(connector.health)}`}>
                    {connector.health}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Resources</span>
                  <span className="font-medium text-foreground">{connector.resources}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Sync</span>
                  <span className="font-medium text-foreground">
                    {formatDate(connector.lastSync)}
                  </span>
                </div>
              </div>

              {/* Capabilities */}
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2">Capabilities</div>
                <div className="flex flex-wrap gap-1">
                  {connector.capabilities.map((capability: string) => (
                    <span
                      key={capability}
                      className="px-2 py-1 bg-background border border-border rounded text-xs"
                    >
                      {capability}
                    </span>
                  ))}
                </div>
              </div>

              {/* Activity */}
              <div className="p-4 border-t border-border">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs text-muted-foreground">Recent Activity</div>
                  <Activity size={14} className="text-muted-foreground" />
                </div>
                <div className="text-xs text-muted-foreground">
                  Activity tracking available when backend is connected
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border flex gap-2">
                {connector.id === 'google-drive' && !driveAuthStatus ? (
                  <button
                    onClick={handleConnectDrive}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Cloud size={16} />
                    Connect Drive
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => handleSync(connector.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <RefreshCw size={16} />
                      Sync
                    </button>
                    {connector.id === 'google-drive' && driveAuthStatus && (
                      <button
                        onClick={handleOpenDrive}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/90 transition-colors"
                      >
                        <Database size={16} />
                        Open Drive
                      </button>
                    )}
                  </>
                )}
                <button
                  onClick={() => setSelectedConnector(connector.id)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/90 transition-colors"
                >
                  <Database size={16} />
                  Details
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
