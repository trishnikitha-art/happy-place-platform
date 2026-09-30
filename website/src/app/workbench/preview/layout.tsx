/**
 * Preview Layout - No Workbench shell
 * 
 * Preview routes render the actual website without Workbench navigation/shell.
 * This makes the iframe display the real website as the visual control surface.
 * 
 * P0 FIX: Provide authoritative Workbench-mode context from iframe/page level
 * rather than having every VisualSlot independently discover it from window.location.
 */

'use client';

import { WorkbenchModeContext } from './workbench-mode-context';

// P0 FIX: Read workbench mode once at iframe/page level, not per-slot
// This provides authoritative context and avoids SSR/hydration issues
const isWorkbenchMode = typeof window !== 'undefined'
  ? new URLSearchParams(window.location.search).get('workbench') === 'true'
  : false;

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorkbenchModeContext.Provider value={isWorkbenchMode}>
      {children}
    </WorkbenchModeContext.Provider>
  );
}
