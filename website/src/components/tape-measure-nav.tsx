"use client";

import * as React from "react";

interface TapeMeasureNavProps {
  items: Array<{ href: string; label: string }>;
  activeHref: string;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

/** Measure on navigation/resize only. Only the tape's translation transitions. */
export function TapeMeasureNav({ items, activeHref, containerRef }: TapeMeasureNavProps) {
  const [position, setPosition] = React.useState<{ left: number; width: number } | null>(null);

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const updatePosition = () => {
      const active = Array.from(container.querySelectorAll("a")).find(link => link.getAttribute("aria-current") === "page");
      if (!active) { setPosition(null); return; }
      const bounds = container.getBoundingClientRect();
      const item = active.getBoundingClientRect();
      const next = { left: item.left - bounds.left, width: item.width };
      setPosition(previous => previous?.left === next.left && previous.width === next.width ? previous : next);
    };
    updatePosition();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updatePosition);
    observer?.observe(container);
    container.querySelectorAll("a").forEach(link => observer?.observe(link));
    window.addEventListener("resize", updatePosition);
    return () => { observer?.disconnect(); window.removeEventListener("resize", updatePosition); };
  }, [activeHref, items, containerRef]);

  return position ? <span aria-hidden="true" className="nav-tape absolute bottom-0 left-0 z-20 h-[4px] pointer-events-none" style={{ width: position.width, transform: 'translateX(' + position.left + 'px)' }} /> : null;
}
