"use client";

import { useEffect, useRef, useState } from "react";
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
 * Hero images move slightly slower than the page scroll for depth.
 * Very subtle effect - not dramatic.
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
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return;
      
      const rect = ref.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const elementTop = rect.top;
      
      // Calculate parallax offset only when element is in/near viewport
      if (elementTop < windowHeight && elementTop > -rect.height) {
        const scrollProgress = (windowHeight - elementTop) / (windowHeight + rect.height);
        const parallaxOffset = scrollProgress * 100 * speed;
        setOffset(parallaxOffset);
      }
    };

    // Use passive listener for better scroll performance
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [speed]);

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      <div
        style={{
          transform: `translateY(${offset}px)`,
          transition: "transform 0.1s ease-out",
        }}
      >
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
    </div>
  );
}
