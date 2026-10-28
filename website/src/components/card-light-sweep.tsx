"use client";

import type { ReactNode } from "react";
import { useMotion } from "@/components/motion-provider";
import { cn } from "@/lib/utils";

interface CardLightSweepProps {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
}

/** A single warm-light pass on intentional interaction, with a static SSR fallback. */
export function CardLightSweep({ children, className, interactive = false }: CardLightSweepProps) {
  const { isMotionEnabled } = useMotion();

  return (
    <div
      className={cn("motion-card relative", className)}
      data-motion={isMotionEnabled ? "enabled" : "disabled"}
      data-interactive={interactive ? "true" : undefined}
    >
      {children}
      {interactive && <span className="craft-card-sheen" aria-hidden="true"><span /></span>}
    </div>
  );
}