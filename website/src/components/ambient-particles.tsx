"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface AmbientParticlesProps {
  className?: string;
  count?: number;
  color?: string;
}

/**
 * AmbientParticles - Tiny floating sawdust particles in hero areas
 * 
 * Barely visible, very slow floating particles that feel like a workshop.
 * Not confetti - subtle dust motes floating in the air.
 * 
 * Default: 30 particles, warm wood color
 */
export function AmbientParticles({ 
  className, 
  count = 30,
  color = "rgba(217, 154, 78, 0.15)" // Honey color, very subtle
}: AmbientParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    opacity: number;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.2, // Very slow horizontal movement
          vy: (Math.random() - 0.5) * 0.2, // Very slow vertical movement
          size: Math.random() * 2 + 0.5, // Tiny particles (0.5-2.5px)
          opacity: Math.random() * 0.3 + 0.1, // Very subtle opacity (0.1-0.4)
        });
      }
    };
    initParticles();

    // Animation loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = color.replace("0.15", String(particle.opacity));
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, [count, color]);

  return (
    <canvas
      ref={canvasRef}
      className={cn("absolute inset-0 pointer-events-none", className)}
      aria-hidden="true"
    />
  );
}
