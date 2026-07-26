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
    // Debug: detect duplicate mounts
    console.count("LenisProvider mounted");

    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      // Don't initialize Lenis if user prefers reduced motion
      return;
    }

    // Initialize Lenis with wheel event throttling
    const lenisInstance = new Lenis({
      lerp: 0.25, // Higher lerp = snappier feel (default 0.1)
      wheelMultiplier: 0.8, // Reduce wheel sensitivity to prevent jank
      touchMultiplier: 0.8, // Reduce touch sensitivity to prevent jank
      duration: 1.2, // Add duration for smoother transitions
    });

    setLenis(lenisInstance);

    // Animation loop with proper cancellation
    let frameId: number;
    let rafCount = 0;
    function raf(time: number) {
      rafCount++;
      if (rafCount % 60 === 0) { // Log every 60 frames (approx 1 second)
        console.count("Lenis RAF loop");
      }
      lenisInstance.raf(time);
      frameId = requestAnimationFrame(raf);
    }

    frameId = requestAnimationFrame(raf);

    // Cleanup
    return () => {
      console.log("LenisProvider cleanup - cancelling RAF and destroying instance");
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
