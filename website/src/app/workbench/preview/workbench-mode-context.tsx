/**
 * Workbench Mode Context
 * 
 * Shared context for Workbench mode across preview routes.
 * This provides authoritative Workbench-mode from iframe/page level
 * rather than having every VisualSlot independently discover it from window.location.
 */

'use client';

import { createContext, useContext } from 'react';

// P0 FIX: Authoritative Workbench-mode context
// The iframe page determines Workbench mode from URL once and provides it to all slots
export const WorkbenchModeContext = createContext(false);

export function useWorkbenchMode() {
  return useContext(WorkbenchModeContext);
}
