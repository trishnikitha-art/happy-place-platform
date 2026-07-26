"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

interface CursorSpotlightProps {
  className?: string;
  size?: number;
  intensity?: number;
}

/**
 * CursorSpotlight - High-end polish cursor spotlight effect
 * 
 * Migrated to use Framer Motion's useMotionValue for smooth cursor tracking.
 * Replaces custom mousemove event listener with optimized motion system.
 * 
 * Default: 300px spotlight, low intensity
 */
export function CursorSpotlight({ 
  className, 
  size = 300,
  intensity = 0.06
}: CursorSpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springX = useSpring(mouseX, { stiffness: 300, damping: 30 });
  const springY = useSpring(mouseY, { stiffness: 300, damping: 30 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseX.set(e.clientX);
    mouseY.set(e.clientY);
  };

  return (
    <motion.div
      className={cn("fixed inset-0 pointer-events-none z-50", className)}
      aria-hidden="true"
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(circle, rgba(255,255,255,${intensity}) 0%, transparent 70%)`,
          x: springX,
          y: springY,
          translateX: "-50%",
          translateY: "-50%",
        }}
      />
    </motion.div>
  );
}
