"use client";

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { distance, duration, easing } from '@/motion/motionTokens';
import { useMotion } from '@/components/motion-provider';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Milliseconds, matching the existing staggered card callers. */
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
}

/**
 * A one-time enhancement of already-visible content. SSR and unsupported browsers
 * retain the ordinary layout. Above-fold content never waits for an entrance.
 */
export function ScrollReveal({ children, className, delay = 0, direction = 'up' }: ScrollRevealProps) {
  const { isMotionEnabled } = useMotion();
  const element = useRef<HTMLDivElement>(null);
  const revealed = useRef(false);

  useEffect(() => {
    const node = element.current;
    if (!isMotionEnabled || revealed.current || !node || typeof IntersectionObserver === 'undefined' || typeof node.animate !== 'function') return;

    let firstObservation = true;
    let animation: Animation | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry || revealed.current) return;
      // Never animate content already in view when this enhancement starts.
      if (firstObservation && entry.isIntersecting) {
        revealed.current = true;
        observer.disconnect();
        return;
      }
      firstObservation = false;
      if (!entry.isIntersecting) return;

      revealed.current = true;
      observer.disconnect();
      const offset = {
        up: `translateY(${distance.small}px)`,
        down: `translateY(-${distance.small}px)`,
        left: `translateX(${distance.small}px)`,
        right: `translateX(-${distance.small}px)`,
      }[direction];
      animation = node.animate(
        [{ opacity: 0.94, transform: offset }, { opacity: 1, transform: 'none' }],
        {
          duration: duration.slow * 1000,
          delay: Number.isFinite(delay) ? Math.min(180, Math.max(0, delay)) : 0,
          easing: `cubic-bezier(${easing.premium.join(',')})`,
          fill: 'backwards',
        },
      );
    }, { rootMargin: '0px 0px -32px 0px', threshold: 0 });
    observer.observe(node);

    return () => {
      observer.disconnect();
      animation?.cancel();
    };
  }, [isMotionEnabled, delay, direction]);

  return <div ref={element} className={cn(className)}>{children}</div>;
}
