"use client";

import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CountUpProps {
  end: number;
  duration?: number;
  className?: string;
  suffix?: string;
  prefix?: string;
}

/**
 * CountUp - Animated number counter for statistics
 * 
 * Migrated to use Framer Motion for smooth, performant counting.
 * Replaces custom requestAnimationFrame loop with optimized motion system.
 * 
 * Default: 800ms duration
 */
export function CountUp({ 
  end, 
  duration = 800, 
  className,
  suffix = "",
  prefix = ""
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const [displayValue, setDisplayValue] = useState(0);
  
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { stiffness: 100, damping: 30 });
  
  const transformedValue = useTransform(springValue, (latest) => Math.floor(latest));
  
  useEffect(() => {
    const unsubscribe = transformedValue.on("change", (latest) => {
      setDisplayValue(latest);
    });
    
    return unsubscribe;
  }, [transformedValue]);

  useEffect(() => {
    if (isInView) {
      motionValue.set(end);
    }
  }, [isInView, motionValue, end]);

  return (
    <span ref={ref} className={cn(className)}>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  );
}
