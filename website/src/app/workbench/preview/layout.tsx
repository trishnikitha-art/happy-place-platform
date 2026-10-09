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
import { useRouter } from 'next/navigation';
import { previewHref } from '@/lib/scroll-policy';
import { useEffect } from 'react';
import { PreviewTextBridge } from '@/components/workbench/preview-text-bridge';

// P0 FIX: Read workbench mode once at iframe/page level, not per-slot
// This provides authoritative context and avoids SSR/hydration issues
export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router=useRouter();
  useEffect(()=>{
    // The root header/footer sit outside this nested layout. Capture their
    // navigation too, so the iframe cannot escape its authenticated preview.
    const navigate=(event:MouseEvent)=>{
      const anchor=event.target instanceof Element?event.target.closest('a'):null;
      if(!anchor || event.defaultPrevented || event.button!==0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.target || anchor.hasAttribute('download')) return;
      const href=anchor.getAttribute('href');
      if(!href || href.startsWith('#')) return;
      const preview=previewHref(href,window.location.origin);
      if(preview) {event.preventDefault();event.stopPropagation();router.push(preview);}
    };
    document.addEventListener('click',navigate,true);
    return ()=>document.removeEventListener('click',navigate,true);
  },[router]);
  return (
    <WorkbenchModeContext.Provider value={true}>
      <PreviewTextBridge />
      <div data-lenis-prevent>{children}</div>
    </WorkbenchModeContext.Provider>
  );
}
