"use client";

import { motion, useMotionValue, useTransform, useSpring, MotionValue } from "framer-motion";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface AmbientParticlesProps {
  className?: string;
  count?: number;
  color?: string;
}

/**
 * AmbientParticles - Tiny floating sawdust particles in hero areas
 * 
 * Migrated to use Framer Motion for smooth particle animation.
 * Replaces custom canvas animation with DOM-based motion system.
 * 
 * Respects prefers-reduced-motion: disables all animation when enabled.
 * 
 * Default: 30 particles, warm wood color
 */
export function AmbientParticles({ 
  className, 
  count = 30,
  color = "rgba(217, 154, 78, 0.15)" // Honey color, very subtle
}: AmbientParticlesProps) {
  const particlesRef = useRef<Array<{
    x: MotionValue<number>;
    y: MotionValue<number>;
    vx: number;
    vy: number;
  }>>([]);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (prefersReducedMotion) {
      // Don't initialize animation loop for reduced motion
      // Render static particles only
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        const x = useMotionValue(Math.random() * window.innerWidth);
        const y = useMotionValue(Math.random() * window.innerHeight);
        
        particlesRef.current.push({
          x,
          y,
          vx: 0, // No movement
          vy: 0, // No movement
        });
      }
      return;
    }

    // Initialize particles with motion values
    particlesRef.current = [];
    for (let i = 0; i < count; i++) {
      const x = useMotionValue(Math.random() * window.innerWidth);
      const y = useMotionValue(Math.random() * window.innerHeight);
      
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 0.2, // Very slow horizontal movement
        vy: (Math.random() - 0.5) * 0.2, // Very slow vertical movement
      });
    }

    // Animation loop
    let animationFrame: number;
    const animate = () => {
      particlesRef.current.forEach((particle) => {
        const currentX = particle.x.get();
        const currentY = particle.y.get();
        
        // Update position
        let newX = currentX + particle.vx;
        let newY = currentY + particle.vy;

        // Wrap around edges
        if (newX < 0) newX = window.innerWidth;
        if (newX > window.innerWidth) newX = 0;
        if (newY < 0) newY = window.innerHeight;
        if (newY > window.innerHeight) newY = 0;

        particle.x.set(newX);
        particle.y.set(newY);
      });

      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [count]);

  return (
    <div className={cn("absolute inset-0 pointer-events-none", className)} aria-hidden="true">
      {particlesRef.current.map((particle, index) => {
        const springX = useSpring(particle.x, { stiffness: 50, damping: 20 });
        const springY = useSpring(particle.y, { stiffness: 50, damping: 20 });
        const size = Math.random() * 2 + 0.5; // Tiny particles (0.5-2.5px)
        const opacity = Math.random() * 0.3 + 0.1; // Very subtle opacity (0.1-0.4)
        
        return (
          <motion.div
            key={index}
            className="absolute rounded-full"
            style={{
              x: springX,
              y: springY,
              width: size,
              height: size,
              backgroundColor: color.replace("0.15", String(opacity)),
            }}
          />
        );
      })}
    </div>
  );
}
