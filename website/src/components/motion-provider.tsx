"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, ReactNode } from "react";
import { prefersReducedMotion } from "@/motion/motionTokens";
import { isConstrainedDevice, subscribeToNetworkHints } from "@/lib/network-hints";

/**
 * Motion Context
 * 
 * Provides global motion configuration and reduced motion state
 * to all components in the application.
 */
interface MotionContextType {
  prefersReducedMotion: boolean;
  isMotionEnabled: boolean;
}

const MotionContext = createContext<MotionContextType | null>(null);

function subscribeToMotionPreference(onChange: () => void) {
  if (typeof window.matchMedia !== 'function') return () => {};
  const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  preference.addEventListener('change', onChange);
  return () => preference.removeEventListener('change', onChange);
}

// Hydration starts with the same snapshot as the server, then reads the browser preference.
function serverMotionPreference() { return false; }
function clientIsReady() { return true; }
function subscribeToHydration() { return () => {}; }
function currentMotionPreference() {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && prefersReducedMotion();
}

/**
 * MotionProvider - Global animation configuration provider
 * 
 * Handles:
 * - Reduced motion detection
 * - Global animation enable/disable
 * - Consistent animation behavior across the app
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, currentMotionPreference, serverMotionPreference);
  const constrainedDevice = useSyncExternalStore(subscribeToNetworkHints, isConstrainedDevice, serverMotionPreference);
  const hydrated = useSyncExternalStore(subscribeToHydration, clientIsReady, serverMotionPreference);
  const isMotionEnabled = hydrated && !reducedMotion && !constrainedDevice;

  useEffect(() => {
    // Add reduced-motion class to document for CSS fallbacks
    if (reducedMotion) {
      document.documentElement.classList.add("reduced-motion");
    } else {
      document.documentElement.classList.remove("reduced-motion");
    }
    document.documentElement.dataset.motion = isMotionEnabled ? 'enabled' : 'disabled';
    return () => {
      document.documentElement.classList.remove("reduced-motion");
      delete document.documentElement.dataset.motion;
    };
  }, [reducedMotion, isMotionEnabled]);

  return (
    <MotionContext.Provider
      value={{
        prefersReducedMotion: reducedMotion,
        isMotionEnabled,
      }}
    >
      {children}
    </MotionContext.Provider>
  );
}

/**
 * useMotion - Hook to access motion context
 * 
 * Usage:
 * const { prefersReducedMotion, isMotionEnabled } = useMotion();
 */
export function useMotion() {
  const context = useContext(MotionContext);
  if (!context) {
    throw new Error("useMotion must be used within MotionProvider");
  }
  return context;
}
