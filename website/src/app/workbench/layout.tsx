/**
 * Workbench Layout - Plugin-based architecture shell
 * 
 * Universal workbench for exploring projections, timelines, evidence, recommendations,
 * execution plans, replay, connectors, and relationships.
 * 
 * Everything is a window into the architecture - not the architecture itself.
 */

import { WorkbenchShell } from '@/components/workbench/WorkbenchShell';

export default function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WorkbenchShell>{children}</WorkbenchShell>;
}
