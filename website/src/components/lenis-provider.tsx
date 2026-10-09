"use client";

import { useEffect, createContext, useContext, ReactNode, useState, Suspense } from "react";
import Lenis from "@studio-freight/lenis";
import { usePathname, useSearchParams } from "next/navigation";
import { usesNativeScroll } from '@/lib/scroll-policy';

interface LenisContextValue {
  lenis: Lenis | null;
}

const LenisContext = createContext<LenisContextValue>({ lenis: null });

function SearchObserver({onChange}:{onChange:(search:string)=>void}) {
  const search=useSearchParams().toString();
  useEffect(()=>onChange(search),[search,onChange]);
  return null;
}

/**
 * Galleries, service/project details and Workbench use native scrolling. A touchpad already
 * supplies momentum; adding another interpolation layer made the long gallery
 * feel delayed and made quick changes of direction fight the scroll target.
 * Other public pages retain Lenis, unless reduced motion is requested.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const pathname = usePathname();
  const [search,setSearch] = useState('');

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
      if (usesNativeScroll(currentPath, window.location.search) || motionPreference.matches) return;

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
  }, [pathname, search]);

  return <LenisContext.Provider value={{ lenis }}><Suspense fallback={null}><SearchObserver onChange={setSearch}/></Suspense>{children}</LenisContext.Provider>;
}

export function useLenis() {
  return useContext(LenisContext);
}
