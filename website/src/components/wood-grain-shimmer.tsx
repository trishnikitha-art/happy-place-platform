"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface WoodGrainShimmerProps {
  className?: string;
  intensity?: number;
}

/**
 * WoodGrainShimmer - Very subtle wood grain texture movement
 * 
 * Carpentry personality: Barely visible wood grain texture that shimmers.
 * Extremely subtle effect that adds warmth without being distracting.
 * 
 * Default: Low intensity for premium feel
 */
export function WoodGrainShimmer({ 
  className, 
  intensity = 0.03 
}: WoodGrainShimmerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
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

  return (
    <div 
      ref={ref}
      className={cn("absolute inset-0 pointer-events-none overflow-hidden", className)}
      aria-hidden="true"
      style={{
        opacity: isVisible ? intensity : 0,
        transition: 'opacity 1.5s ease-out'
      }}
    >
      {/* Wood grain overlay */}
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(139, 90, 43, 0.03) 2px,
              rgba(139, 90, 43, 0.03) 4px
            ),
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 50px,
              rgba(139, 90, 43, 0.02) 50px,
              rgba(139, 90, 43, 0.02) 100px
            )
          `,
          animation: isVisible ? 'shimmer 8s ease-in-out infinite' : 'none'
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0%, 100% {
            opacity: 0.5;
            transform: translateX(0);
          }
          50% {
            opacity: 1;
            transform: translateX(10px);
          }
        }
      `}</style>
    </div>
  );
}
