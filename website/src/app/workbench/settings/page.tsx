/**
 * Settings - Workbench configuration
 * 
 * Configure workbench settings, preferences, and system options.
 */

'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Bell, Database, Shield, Palette, User, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');
  const [quarantineStatus, setQuarantineStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [quarantineMessage, setQuarantineMessage] = useState('');

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'data', name: 'Data', icon: Database },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'account', name: 'Account', icon: User },
  ];

  const executeQuarantine = async () => {
    setQuarantineStatus('loading');
    setQuarantineMessage('');

    try {
      const response = await fetch('/api/admin/diagnostic/quarantine-media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaId: '07c0eae184dc5a375f943a3ac2b67e95',
          confirm: true,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        setQuarantineStatus('error');
        setQuarantineMessage(`Failed: ${error}`);
        return;
      }

      const result = await response.json();
      if (result.success) {
        setQuarantineStatus('success');
        setQuarantineMessage(`Successfully quarantined malformed record ${result.mediaId}`);
      } else {
        setQuarantineStatus('error');
        setQuarantineMessage(result.error || 'Unknown error');
      }
    } catch (error) {
      setQuarantineStatus('error');
      setQuarantineMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Configure workbench preferences and system options
        </p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <Icon size={18} />
                  <span className="font-medium">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1">
          {activeTab === 'general' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">General Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Workbench Name
                  </label>
                  <input
                    type="text"
                    defaultValue="PING Workbench"
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Default View
                  </label>
                  <select className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Explorer</option>
                    <option>Timeline</option>
                    <option>Recommendations</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="auto-refresh" className="rounded" />
                  <label htmlFor="auto-refresh" className="text-sm text-foreground">
                    Auto-refresh projections
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Notification Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Recommendation Alerts</div>
                    <div className="text-sm text-muted-foreground">Get notified when new recommendations are available</div>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Execution Updates</div>
                    <div className="text-sm text-muted-foreground">Get notified when execution plans change status</div>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Connector Health</div>
                    <div className="text-sm text-muted-foreground">Get notified when connectors go offline</div>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'data' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Data Settings</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Event Retention Period
                  </label>
                  <select className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>30 days</option>
                    <option>90 days</option>
                    <option>1 year</option>
                    <option>Forever</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Projection Cache Size
                  </label>
                  <select className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>100 MB</option>
                    <option>500 MB</option>
                    <option>1 GB</option>
                  </select>
                </div>
                <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors">
                  Clear All Data
                </button>

                {/* Production Data Quarantine */}
                <div className="border-t border-border pt-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <AlertTriangle size={18} className="text-amber-500" />
                    Production Data Quarantine
                  </h3>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-amber-900 mb-2">
                      <strong>Malformed Record Detected:</strong>
                    </p>
                    <p className="text-xs text-amber-800 font-mono mb-2">
                      ID: 07c0eae184dc5a375f943a3ac2b67e95
                    </p>
                    <p className="text-xs text-amber-800">
                      Error: Missing or invalid storage field (storage: undefined)
                    </p>
                    <p className="text-xs text-amber-700 mt-2">
                      This record is being rejected by the public media gate and has no canonical evidence.
                      Safe to quarantine as it cannot serve any valid purpose.
                    </p>
                  </div>
                  {quarantineStatus === 'idle' && (
                    <button
                      onClick={executeQuarantine}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                    >
                      Quarantine Malformed Record
                    </button>
                  )}
                  {quarantineStatus === 'loading' && (
                    <button
                      disabled
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg opacity-50 cursor-not-allowed"
                    >
                      Quarantining...
                    </button>
                  )}
                  {quarantineStatus === 'success' && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle size={18} />
                      <span className="text-sm">{quarantineMessage}</span>
                    </div>
                  )}
                  {quarantineStatus === 'error' && (
                    <div className="flex items-center gap-2 text-red-600">
                      <XCircle size={18} />
                      <span className="text-sm">{quarantineMessage}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Security Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Two-Factor Authentication</div>
                    <div className="text-sm text-muted-foreground">Add an extra layer of security</div>
                  </div>
                  <input type="checkbox" className="rounded" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-foreground">Audit Logging</div>
                    <div className="text-sm text-muted-foreground">Log all administrative actions</div>
                  </div>
                  <input type="checkbox" defaultChecked className="rounded" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Appearance Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Theme
                  </label>
                  <select className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>System</option>
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Density
                  </label>
                  <select className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <option>Comfortable</option>
                    <option>Compact</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="text-xl font-semibold text-foreground mb-4">Account Settings</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Admin User"
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue="admin@example.com"
                    className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
                  Save Changes
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
