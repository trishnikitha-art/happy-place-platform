'use client';
import { useWorkbenchMode } from '@/app/workbench/preview/workbench-mode-context';
export function PreviewOnly({children}:{children:React.ReactNode}) {
  return useWorkbenchMode() ? <>{children}</> : null;
}
