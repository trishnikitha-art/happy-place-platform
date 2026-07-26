"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface LevelBubbleProps {
  isValid: boolean;
  className?: string;
}

/**
 * LevelBubble - Carpenter's level bubble animation for form validation
 * 
 * Carpentry personality: When a form step validates, the bubble centers
 * like a carpenter's level showing it's "level" (correct).
 * 
 * Subtle interaction that provides satisfying feedback without being distracting.
 */
export function LevelBubble({ isValid, className }: LevelBubbleProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isValid && !isAnimating) {
      setIsAnimating(true);
      // Reset animation after it completes
      const timer = setTimeout(() => setIsAnimating(false), 600);
      return () => clearTimeout(timer);
    }
  }, [isValid, isAnimating]);

  return (
    <div className={cn("relative w-8 h-8 rounded-full border-2 border-border bg-surface overflow-hidden", className)} aria-hidden="true">
      {/* Level tube background */}
      <div className="absolute inset-0 bg-gradient-to-b from-surface-muted to-surface" />
      
      {/* Level bubble */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-accent/80 shadow-sm transition-all duration-300 ease-out",
          isValid ? "top-1/2 -translate-y-1/2" : "top-1/3"
        )}
        style={{
          transform: isAnimating 
            ? "translateX(-50%) translateY(-50%) scale(1.2)" 
            : "translateX(-50%) translateY(-33%) scale(1)"
        }}
      />
      
      {/* Center mark */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-border/50" />
    </div>
  );
}
