/**
 * Admin Dashboard Page
 * 
 * Pure consumer of Metrics and SystemStatus.
 * No calculations, no business logic, just rendering.
 * 
 * Architecture: Dashboard → fetchMetrics() → render()
 */

import { Dashboard } from "./Dashboard";

export default function AdminDashboardPage() {
  return <Dashboard />;
}
