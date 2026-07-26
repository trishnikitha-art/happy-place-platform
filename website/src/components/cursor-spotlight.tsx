"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CursorSpotlightProps {
  className?: string;
  size?: number;
  intensity?: number;
}

/**
 * CursorSpotlight - High-end polish cursor spotlight effect
 * 
 * Premium feel: Subtle spotlight follows cursor across the page.
 * Very subtle effect that adds depth without being distracting.
 * 
 * Default: 300px spotlight, low intensity
 */
export function CursorSpotlight({ 
  className, 
  size = 300,
  intensity = 0.06
}: CursorSpotlightProps) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      className={cn("fixed inset-0 pointer-events-none z-50", className)}
      aria-hidden="true"
    >
      <div
        className="absolute rounded-full transition-opacity duration-300"
        style={{
          left: position.x - size / 2,
          top: position.y - size / 2,
          width: size,
          height: size,
          background: `radial-gradient(circle, rgba(255,255,255,${intensity}) 0%, transparent 70%)`,
          opacity: isVisible ? 1 : 0,
          transform: 'translate3d(0, 0, 0)',
          willChange: 'transform'
        }}
      />
    </div>
  );
}
