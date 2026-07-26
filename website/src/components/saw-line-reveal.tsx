"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SawLineRevealProps {
  className?: string;
  direction?: "horizontal" | "vertical";
  color?: string;
}

/**
 * SawLineReveal - Section divider appears as though cut by circular saw
 * 
 * Carpentry personality: Line reveals with a cut-like animation.
 * Subtle effect that feels like a carpenter cutting through material.
 * 
 * Default: Horizontal line, dark gray color
 */
export function SawLineReveal({ 
  className, 
  direction = "horizontal",
  color = "rgba(60, 60, 60, 0.4)"
}: SawLineRevealProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [cutProgress, setCutProgress] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Animate the cut
          const duration = 600; // ms
          const steps = 30;
          let step = 0;

          const timer = setInterval(() => {
            step++;
            setCutProgress(step / steps);
            if (step >= steps) {
              clearInterval(timer);
            }
          }, duration / steps);
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  if (direction === "horizontal") {
    return (
      <div ref={ref} className={cn("w-full overflow-hidden relative", className)} aria-hidden="true">
        {/* Main cut line */}
        <div
          className="h-px transition-all duration-75 ease-out"
          style={{
            backgroundColor: color,
            width: `${cutProgress * 100}%`,
            boxShadow: cutProgress > 0 ? `0 0 4px ${color}` : 'none'
          }}
        />
        {/* Saw dust particles */}
        {cutProgress > 0 && cutProgress < 1 && (
          <div className="absolute top-0 flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-0.5 h-0.5 rounded-full bg-text-muted/30"
                style={{
                  marginLeft: `${Math.random() * 10}px`,
                  animation: `fall ${0.3 + Math.random() * 0.2}s ease-out forwards`,
                  animationDelay: `${Math.random() * 0.1}s`
                }}
              />
            ))}
          </div>
        )}
        <style jsx>{`
          @keyframes fall {
            to {
              transform: translateY(10px) rotate(45deg);
              opacity: 0;
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("h-full overflow-hidden relative", className)} aria-hidden="true">
      <div
        className="w-px transition-all duration-75 ease-out"
        style={{
          backgroundColor: color,
          height: `${cutProgress * 100}%`,
          boxShadow: cutProgress > 0 ? `0 0 4px ${color}` : 'none'
        }}
      />
    </div>
  );
}
