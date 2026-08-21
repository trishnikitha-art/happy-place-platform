"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "./lenis-provider";

/**
 * ScrollToTop - Route transition scroll reset coordinator.
 *
 * CEO FIX: Delegates scroll reset to Lenis instead of writing native scroll state.
 * Lenis owns all scroll interpolation. Route transitions reset through Lenis API.
 *
 * Only used as coordinator to trigger Lenis reset on pathname changes.
 * LenisProvider owns the actual scroll reset authority.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const { lenis } = useLenis();

  useEffect(() => {
    // CEO FIX: Delegate to Lenis instead of native window.scrollTo
    // Lenis owns scroll state. Do not create competing scroll writer.
    if (lenis) {
      console.log('[SCROLLTOTOP_DIAGNOSTIC] ROUTE_RESET_DELEGATED_TO_LENIS', {
        pathname,
        lenisScroll: lenis.scroll,
        lenisActualScroll: lenis.actualScroll,
        timestamp: performance.now(),
      });

      // Use Lenis API for route reset
      lenis.scrollTo(0, {
        immediate: true,
        force: true,
      });
    } else {
      // Fallback: native scroll only when Lenis is genuinely disabled
      console.log('[SCROLLTOTOP_DIAGNOSTIC] NATIVE_FALLBACK_LENIS_DISABLED', {
        pathname,
        timestamp: performance.now(),
      });
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [pathname, lenis]);

  return null;
}
