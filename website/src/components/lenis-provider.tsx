"use client";

import { useEffect, createContext, useContext, ReactNode, useState } from "react";
import Lenis from "@studio-freight/lenis";

interface LenisContextValue {
  lenis: Lenis | null;
}

const LenisContext = createContext<LenisContextValue>({ lenis: null });

/**
 * LenisProvider - Smooth scroll integration
 * 
 * Provides premium smooth scroll experience across the site.
 * Respects prefers-reduced-motion for accessibility.
 * Exposes Lenis instance for Framer Motion scroll synchronization.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      // Don't initialize Lenis if user prefers reduced motion
      return;
    }

    // Initialize Lenis with conservative settings to prevent touchpad interference
    const lenisInstance = new Lenis({
      lerp: 0.25, // Higher lerp = snappier feel (default 0.1)
      wheelMultiplier: 1.0, // Neutral multiplier to prevent touchpad stopping
      touch: false, // Disable Lenis touch handling to prevent touchpad scroll conflicts
      duration: 0.8, // Reduced from 1.2 for snappier feel and less momentum interference
    });

    setLenis(lenisInstance);

    // Animation loop with proper cancellation
    let frameId: number;
    function raf(time: number) {
      lenisInstance.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      lenisInstance.destroy();
    };
  }, []);

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
