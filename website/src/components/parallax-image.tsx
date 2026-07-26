"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ParallaxImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  priority?: boolean;
  sizes?: string;
  className?: string;
  speed?: number;
  children?: React.ReactNode;
}

/**
 * ParallaxImage - Subtle parallax effect for hero images
 * 
 * Migrated to use Framer Motion's useScroll for smooth parallax.
 * Replaces custom scroll listener with optimized motion system.
 * 
 * Respects prefers-reduced-motion: disables parallax when enabled.
 * 
 * Default speed: 0.3 (30% of scroll speed)
 */
export function ParallaxImage({
  src,
  alt,
  fill = true,
  priority = false,
  sizes = "100vw",
  className,
  speed = 0.3,
  children,
}: ParallaxImageProps) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 1000], [0, 100 * speed]);

  // Check if user prefers reduced motion
  const prefersReducedMotion = typeof window !== 'undefined' 
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches 
    : false;

  if (prefersReducedMotion) {
    // Render static image without parallax
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <Image
          src={src}
          alt={alt}
          fill={fill}
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
        {children}
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.div style={{ y }}>
        <Image
          src={src}
          alt={alt}
          fill={fill}
          priority={priority}
          sizes={sizes}
          className="object-cover"
        />
        {children}
      </motion.div>
    </div>
  );
}
