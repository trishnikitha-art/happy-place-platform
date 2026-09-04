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
import { Plug, CheckCircle, RefreshCw, Cloud, Database, AlertCircle } from 'lucide-react';

interface ConnectorData {
  id: string;
  name: string;
  type: string;
  status: 'active' | 'inactive' | 'error';
  connectedAs?: string;
  lastChecked: string;
  capabilities: string[];
}

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<ConnectorData[]>([]);
  const [selectedConnector, setSelectedConnector] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [driveAuthStatus, setDriveAuthStatus] = useState<boolean>(false);
  const [driveRequiresReauth, setDriveRequiresReauth] = useState<boolean>(false);

  useEffect(() => {
    loadConnectors();
    checkDriveAuth();
  }, []);

  const loadConnectors = async () => {
    try {
      setLoading(true);
      setError(null);
      setDriveRequiresReauth(false);

      // Use Drive discovery API
      const response = await fetch('/api/drive/discovery');
      const data = await response.json();

      if (!response.ok) {
        // Check for authorization expiration
        if (data.error === 'AUTHORIZATION_EXPIRED' || data.requiresReauth) {
          setDriveRequiresReauth(true);
          setError('Google Drive authorization has expired. Please re-authenticate.');
        } else {
          throw new Error(data.message || 'Drive discovery failed');
        }
      }

      const structure = data;

      // Map Drive structure to ConnectorData format
      const driveConnector: ConnectorData = {
        id: 'google-drive',
        name: 'Google Drive',
        type: 'google-drive',
        status: structure.myDrive ? 'active' : 'inactive',
        connectedAs: structure.myDrive?.name || 'Not connected',
        lastChecked: new Date().toISOString(),
        capabilities: ['read files', 'browse folders', 'view thumbnails'],
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
          lastChecked: new Date().toISOString(),
          capabilities: ['read files', 'browse folders', 'view thumbnails'],
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
        // If auth status indicates re-auth is required, set that flag
        if (data.requiresReauth) {
          setDriveRequiresReauth(true);
          setError('Google Drive authorization has expired. Please re-authenticate.');
        }
      }
    } catch (err) {
      console.error('Failed to check Drive auth status:', err);
    }
  };

  const handleSync = async (id: string) => {
    // No-op - Drive is source of truth, no sync needed
    await loadConnectors();
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
                </div>
              </div>

              {/* Details */}
              <div className="p-4 space-y-3">
                {driveRequiresReauth && connector.id === 'google-drive' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-md p-2 text-xs text-amber-800">
                    <div className="flex items-center gap-1 font-medium mb-1">
                      <AlertCircle size={12} />
                      Authorization expired
                    </div>
                    <div>Google Drive authorization has expired or been revoked. Please re-authenticate to continue.</div>
                  </div>
                )}
                {connector.connectedAs && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Connected as</span>
                    <span className="font-medium text-foreground">{connector.connectedAs}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last checked</span>
                  <span className="font-medium text-foreground">
                    {formatDate(connector.lastChecked)}
                  </span>
                </div>
              </div>

              {/* Capabilities */}
              <div className="p-4 border-t border-border bg-muted/30">
                <div className="text-xs text-muted-foreground mb-2">Drive access</div>
                <div className="space-y-1">
                  {connector.capabilities.map((capability: string) => (
                    <div key={capability} className="flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-green-500" />
                      <span>{capability}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="p-4 border-t border-border flex gap-2">
                {connector.id === 'google-drive' && (driveRequiresReauth || !driveAuthStatus) ? (
                  <button
                    onClick={handleConnectDrive}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Cloud size={16} />
                    {driveRequiresReauth ? 'Re-authenticate Drive' : 'Connect Drive'}
                  </button>
                ) : (
                  <>
                    {connector.id === 'google-drive' && driveAuthStatus && (
                      <button
                        onClick={handleOpenDrive}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        <Database size={16} />
                        Open Drive
                      </button>
                    )}
                    <button
                      onClick={() => handleSync(connector.id)}
                      className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/90 transition-colors"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
