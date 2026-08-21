"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * ScrollToTop - Resets scroll position to top on route transitions.
 * Ensures users always land at the top of each page, avoiding
 * the issue where scroll position is preserved across navigations.
 *
 * DIAGNOSTIC: Instrumented to track scroll state changes relative to Lenis
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    // DIAGNOSTIC: Log component mount timestamp to track initialization order relative to Lenis
    console.log('[SCROLLTOTOP_DIAGNOSTIC] COMPONENT_MOUNT', {
      pathname,
      timestamp: performance.now(),
    });

    // DIAGNOSTIC: Log scroll state BEFORE native scrollTo
    const preScrollState = {
      windowScrollY: window.scrollY,
      documentScrollHeight: document.documentElement.scrollHeight,
      documentClientHeight: document.documentElement.clientHeight,
      pathname,
      timestamp: performance.now(),
    };
    console.log('[SCROLLTOTOP_DIAGNOSTIC] PRE_SCROLL_STATE', preScrollState);

    // Native scroll to top
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });

    // DIAGNOSTIC: Log scroll state AFTER native scrollTo
    // Use setTimeout to allow the scroll to settle
    setTimeout(() => {
      const postScrollState = {
        windowScrollY: window.scrollY,
        documentScrollHeight: document.documentElement.scrollHeight,
        documentClientHeight: document.documentElement.clientHeight,
        pathname,
        timestamp: performance.now(),
      };
      console.log('[SCROLLTOTOP_DIAGNOSTIC] POST_SCROLL_STATE', postScrollState);
    }, 10);
  }, [pathname]);

  return null;
}
