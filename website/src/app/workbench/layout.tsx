/**
 * Workbench Layout - Plugin-based architecture shell
 * 
 * Universal workbench for exploring projections, timelines, evidence, recommendations,
 * execution plans, replay, connectors, and relationships.
 * 
 * Everything is a window into the architecture - not the architecture itself.
 */

'use client';

import { usePathname } from 'next/navigation';
import { WorkbenchShell } from '@/components/workbench/WorkbenchShell';

export default function WorkbenchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // P0 FIX: Preview routes must bypass WorkbenchShell at parent-layout level
  // Child layout cannot "undo" parent layout wrapping
  // /workbench/preview/* should render actual website without Workbench shell
  if (pathname.startsWith('/workbench/preview')) {
    return <>{children}</>;
  }

  return <WorkbenchShell>{children}</WorkbenchShell>;
}
