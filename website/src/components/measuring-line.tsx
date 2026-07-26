"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MeasuringLineProps {
  width?: string;
  height?: string;
  label?: string;
  className?: string;
  delay?: number;
}

/**
 * MeasuringLine - Project dimensions animate into place
 * 
 * Carpentry personality: Measurement lines animate like a carpenter marking dimensions.
 * Subtle animation that shows attention to detail.
 * 
 * Default: 100px width, horizontal orientation
 */
export function MeasuringLine({ 
  width = "100px", 
  height = "auto",
  label,
  className,
  delay = 0
}: MeasuringLineProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [lineWidth, setLineWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setIsVisible(true);
            // Animate line extension
            const duration = 500; // ms
            const steps = 25;
            let step = 0;

            const timer = setInterval(() => {
              step++;
              setLineWidth(step / steps);
              if (step >= steps) {
                clearInterval(timer);
              }
            }, duration / steps);
          }, delay);
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
  }, [delay]);

  return (
    <div 
      ref={ref}
      className={cn("relative flex items-center", className)}
      aria-hidden="true"
    >
      {/* Left endpoint */}
      <div 
        className={cn(
          "w-2 h-2 rounded-full bg-accent transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDelay: `${delay + 100}ms` }}
      />
      
      {/* Measuring line */}
      <div 
        className="flex-1 h-0.5 bg-text-muted/50 relative mx-1"
        style={{ width: '100%' }}
      >
        <div
          className="absolute top-0 left-0 h-full bg-accent transition-all duration-75 ease-out"
          style={{ width: `${lineWidth * 100}%` }}
        />
        {/* Tick marks */}
        <div className="absolute top-0 left-0 w-full flex justify-between">
          {[0, 0.25, 0.5, 0.75, 1].map((pos) => (
            <div
              key={pos}
              className={cn(
                "w-px bg-text-muted/30 transition-opacity duration-300",
                isVisible ? "opacity-100" : "opacity-0"
              )}
              style={{ 
                height: pos === 0.5 ? '8px' : '4px',
                transitionDelay: `${delay + 200 + pos * 100}ms`
              }}
            />
          ))}
        </div>
      </div>
      
      {/* Right endpoint */}
      <div 
        className={cn(
          "w-2 h-2 rounded-full bg-accent transition-opacity duration-300",
          isVisible ? "opacity-100" : "opacity-0"
        )}
        style={{ transitionDelay: `${delay + 300}ms` }}
      />
      
      {/* Dimension label */}
      {label && (
        <div 
          className={cn(
            "ml-2 text-xs font-mono text-text-muted transition-opacity duration-300",
            isVisible ? "opacity-100" : "opacity-0"
          )}
          style={{ transitionDelay: `${delay + 400}ms` }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
