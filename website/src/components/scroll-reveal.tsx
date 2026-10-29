"use client";

import { useEffect, useRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { easing, motionPatterns } from '@/motion/motionTokens';
import { useMotion } from '@/components/motion-provider';
import { observeReveal } from '@/lib/reveal-observer';

interface ScrollRevealProps extends HTMLAttributes<HTMLDivElement> {
  /** Milliseconds; short sequences never build up a long wait. */
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  variant?: 'reveal' | 'sequence' | 'story' | 'accent';
}

/**
 * A one-time enhancement of already-visible content. SSR and unsupported browsers
 * retain the ordinary layout. Above-fold content never waits for an entrance.
 */
export function ScrollReveal({ children, className, delay = 0, direction = 'up', variant = 'reveal', ...props }: ScrollRevealProps) {
  const { isMotionEnabled } = useMotion();
  const element = useRef<HTMLDivElement>(null);
  const revealed = useRef(new WeakSet<Element>());

  useEffect(() => {
    const node = element.current;
    if (!isMotionEnabled || !node || typeof IntersectionObserver === 'undefined') return;
    const grouped = variant === 'sequence' || variant === 'story';
    const targets = grouped ? Array.from(node.children) as HTMLElement[] : [node];
    const animations = new Set<Animation>();
    const disposers = targets.map((target, index) => {
      if (revealed.current.has(target) || typeof target.animate !== 'function') return () => {};
      let firstObservation = true;
      let stop = () => {};
      target.dataset.revealState = 'ready';
      stop = observeReveal(target, entry => {
        if (revealed.current.has(target)) return;
        if (firstObservation && entry.isIntersecting) {
          revealed.current.add(target);
          target.dataset.revealState = 'skipped';
          stop();
          return;
        }
        firstObservation = false;
        if (!entry.isIntersecting) return;
        revealed.current.add(target);
        stop();
        const pattern = motionPatterns[variant];
        const requestedDelay = Number.isFinite(delay) ? Math.max(0, delay) : 0;
        const boundedDelay = Math.min(motionPatterns.sequence.maxDelay, requestedDelay + (grouped ? index * motionPatterns.sequence.stagger : 0));
        const amount = 'distance' in pattern ? pattern.distance : 0;
        const movement = variant === 'story'
          ? `${index % 2 ? -amount : amount}px 0px`
          : { up: `0px ${amount}px`, down: `0px -${amount}px`, left: `${amount}px 0px`, right: `-${amount}px 0px` }[direction];
        // Individual translation composes with a control's CSS hover/press transform.
        const frames = variant === 'accent'
          ? [{ opacity: pattern.opacity, transform: `scaleX(${motionPatterns.accent.startScale})` }, { opacity: 1, transform: 'none' }]
          : [{ opacity: pattern.opacity, translate: movement }, { opacity: 1, translate: 'none' }];
        try {
          const animatedTarget = variant === 'accent' ? (target.firstElementChild as HTMLElement | null) ?? target : target;
          const animation = animatedTarget.animate(
            frames,
            { duration: pattern.duration, delay: boundedDelay, easing: `cubic-bezier(${easing.premium.join(',')})`, fill: 'backwards' },
          );
          target.dataset.revealState = 'running';
          animations.add(animation);
          animation.onfinish = () => {
            target.dataset.revealState = 'complete';
            animations.delete(animation);
            animation.onfinish = null;
            animation.cancel();
          };
        } catch {
          target.dataset.revealState = 'complete';
        }
      });
      return stop;
    });
    return () => {
      disposers.forEach(stop => stop());
      animations.forEach(animation => { animation.onfinish = null; animation.cancel(); });
      animations.clear();
      targets.forEach(target => { if (target.dataset.revealState === 'running') target.dataset.revealState = 'complete'; });
    };
  }, [isMotionEnabled, delay, direction, variant]);

  return <div {...props} ref={element} className={cn(className)} data-reveal={variant}>{children}</div>;
}
