"use client";

import { useEffect, createContext, useContext, ReactNode, useState } from "react";
import Lenis from "@studio-freight/lenis";
import { usePathname, useSearchParams } from "next/navigation";

interface LenisContextValue {
  lenis: Lenis | null;
}

const LenisContext = createContext<LenisContextValue>({ lenis: null });

/**
 * LenisProvider - Smooth scroll integration
 * 
 * Provides premium smooth scroll experience across the site.
 * Respects prefers-reduced-motion for accessibility.
 * Excludes workbench routes and workbench preview mode from smooth scrolling.
 * Exposes Lenis instance for Framer Motion scroll synchronization.
 * 
 * Architectural boundary:
 * - isWorkbenchContext is true when pathname starts with /workbench OR workbench=true query param
 * - Lenis is only initialized when NOT in workbench context
 * - This ensures both Workbench UI and Workbench iframe preview have native scroll
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Authoritative workbench context check
    // True when: pathname starts with /workbench OR workbench=true query param
    const isWorkbenchRoute = pathname.startsWith('/workbench');
    const isWorkbenchPreview = searchParams.get('workbench') === 'true';
    const isWorkbenchContext = isWorkbenchRoute || isWorkbenchPreview;

    // Disable Lenis for workbench context (both UI and iframe preview)
    if (isWorkbenchContext) {
      return;
    }

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      // Don't initialize Lenis if user prefers reduced motion
      return;
    }

    // Diagnostic: detect duplicate mounts (historical regression detection)
    console.count('LenisProvider mounted');

    // Initialize Lenis with conservative settings to prevent touchpad interference
    const lenisInstance = new Lenis({
      lerp: 0.25, // Higher lerp = snappier feel (default 0.1)
      wheelMultiplier: 1.0, // Neutral multiplier to prevent touchpad stopping
      touchMultiplier: 1.0, // Neutral multiplier to prevent touchpad stopping
      duration: 0.8, // Reduced from 1.2 for snappier feel and less momentum interference
    });

    setLenis(lenisInstance);

    // Animation loop with proper cancellation and loop leak detection
    let frameId: number;
    let frameCount = 0;
    function raf(time: number) {
      lenisInstance.raf(time);
      frameCount++;
      if (frameCount % 60 === 0) {
        console.count('Lenis RAF loop');
      }
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    // Cleanup with diagnostic logging
    return () => {
      console.log('LenisProvider cleanup: cancelling RAF and destroying instance');
      cancelAnimationFrame(frameId);
      lenisInstance.destroy();
    };
  }, [pathname, searchParams]);

  return (
    <LenisContext.Provider value={{ lenis }}>
      {children}
    </LenisContext.Provider>
  );
}

/**
 * Hook to access Lenis instance for scroll synchronization
 */
export function useLenis() {
  return useContext(LenisContext);
}
