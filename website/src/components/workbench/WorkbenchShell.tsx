/**
 * WorkbenchShell - Universal workbench shell
 * 
 * Provides navigation, layout, and plugin hosting for all workbench views.
 * 
 * Plugins:
 * - Explorer
 * - Timeline
 * - Evidence
 * - Recommendations
 * - Execution
 * - Projections
 * - Replay
 * - Connectors
 * - Settings
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Clock, 
  Search, 
  Lightbulb, 
  PlayCircle, 
  Database, 
  RotateCcw, 
  Plug, 
  Network,
  Settings,
  Menu,
  X,
  Images
} from 'lucide-react';

const plugins = [
  { id: 'media', name: 'Media', icon: Images, path: '/workbench/media' },
  { id: 'explorer', name: 'Explorer', icon: LayoutDashboard, path: '/workbench/explorer' },
  { id: 'timeline', name: 'Timeline', icon: Clock, path: '/workbench/timeline' },
  { id: 'evidence', name: 'Evidence', icon: Search, path: '/workbench/evidence' },
  { id: 'recommendations', name: 'Recommendations', icon: Lightbulb, path: '/workbench/recommendations' },
  { id: 'execution', name: 'Execution', icon: PlayCircle, path: '/workbench/execution' },
  { id: 'projections', name: 'Projections', icon: Database, path: '/workbench/projections' },
  { id: 'replay', name: 'Replay', icon: RotateCcw, path: '/workbench/replay' },
  { id: 'connectors', name: 'Connectors', icon: Plug, path: '/workbench/connectors' },
  { id: 'graph', name: 'Graph', icon: Network, path: '/workbench/graph' },
  { id: 'settings', name: 'Settings', icon: Settings, path: '/workbench/settings' },
];

export function WorkbenchShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // P0 FIX: Enforce Workbench authentication gate
  // All /workbench/* routes except /workbench/login require authentication
  useEffect(() => {
    const checkAuth = async () => {
      // Skip auth check for login page
      if (pathname === '/workbench/login') {
        setIsAuthenticated(true);
        return;
      }

      try {
        const response = await fetch('/api/workbench/auth-status');
        const data = await response.json();
        
        if (data.authenticated) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push('/workbench/login');
        }
      } catch (error) {
        console.error('[WORKBENCH_SHELL] Auth check failed', error);
        setIsAuthenticated(false);
        router.push('/workbench/login');
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading Workbench...</div>
      </div>
    );
  }

  // Don't render shell if not authenticated (redirect will happen)
  if (isAuthenticated === false) {
    return null;
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-muted border-r border-border transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          {sidebarOpen && (
            <h1 className="text-lg font-semibold text-foreground">PING Workbench</h1>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-accent rounded-lg transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {plugins.map((plugin) => {
              const Icon = plugin.icon;
              const isActive = pathname === plugin.path;
              
              return (
                <li key={plugin.id}>
                  <Link
                    href={plugin.path}
                    className={`
                      flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                      ${isActive 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-accent hover:text-accent-foreground'
                      }
                    `}
                  >
                    <Icon size={20} />
                    {sidebarOpen && <span className="text-sm font-medium">{plugin.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-border">
            <div className="text-xs text-muted-foreground">
              <div className="font-medium mb-1">System Status</div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>All systems operational</span>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
