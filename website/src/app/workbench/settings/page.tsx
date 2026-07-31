/**
 * Settings - Workbench configuration
 * 
 * Configure workbench settings, preferences, and system options.
 */

'use client';

import { useState } from 'react';
import { Settings as SettingsIcon, Bell, Database, Shield, Palette, User } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', name: 'General', icon: SettingsIcon },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'data', name: 'Data', icon: Database },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'appearance', name: 'Appearance', icon: Palette },
    { id: 'account', name: 'Account', icon: User },
  ];

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
              <div className="space-y-4">
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
