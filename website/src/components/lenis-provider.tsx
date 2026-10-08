"use client";

import { useEffect, createContext, useContext, ReactNode, useState } from "react";
import Lenis from "@studio-freight/lenis";
import { usePathname } from "next/navigation";

interface LenisContextValue {
  lenis: Lenis | null;
}

const LenisContext = createContext<LenisContextValue>({ lenis: null });

/**
 * The gallery and Workbench use native wheel/touch scrolling. A touchpad already
 * supplies momentum; adding another interpolation layer made the long gallery
 * feel delayed and made quick changes of direction fight the scroll target.
 * Other public pages retain Lenis, unless reduced motion is requested.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    let instance: Lenis | null = null;
    let frameId: number | null = null;

    const dispose = () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
      frameId = null;
      instance?.destroy();
      instance = null;
      // Consumers must immediately fall back to native scroll, rather than
      // subscribing to a destroyed instance after entering a native route.
      setLenis(null);
    };

    const synchronize = () => {
      dispose();
      // popstate fires before React has committed its updated pathname.
      const currentPath = window.location.pathname;
      const isWorkbench = currentPath === "/workbench" || currentPath.startsWith("/workbench/") ||
        new URLSearchParams(window.location.search).get("workbench") === "true";
      const isGallery = currentPath === "/our-work" || currentPath.startsWith("/our-work/");
      if (isWorkbench || isGallery || motionPreference.matches) return;

      const activeInstance = new Lenis({
        lerp: 0.25,
        wheelMultiplier: 1,
        touchMultiplier: 1,
        syncTouch: false,
      });
      instance = activeInstance;
      setLenis(activeInstance);

      const tick = (time: number) => {
        activeInstance.raf(time);
        frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    };

    synchronize();
    motionPreference.addEventListener("change", synchronize);
    // Covers history changes to the preview query on the same pathname.
    window.addEventListener("popstate", synchronize);

    return () => {
      motionPreference.removeEventListener("change", synchronize);
      window.removeEventListener("popstate", synchronize);
      dispose();
    };
  }, [pathname]);

  return <LenisContext.Provider value={{ lenis }}>{children}</LenisContext.Provider>;
}

export function useLenis() {
  return useContext(LenisContext);
}
